// Server-side export worker: frozen document version → PNG pages, LinkedIn PDF and ZIP in storage.
// Bounded batches with checkpoint under a per-job lease; files are content-addressed and never overwritten;
// the manifest is committed atomically only when every file is registered.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { adicionarPaginaRgb, pngParaRgb } from "./pngPdf.ts";
import { renderizarPaginaPng } from "../documento-grafico/render.server.ts";
import type { DocumentoGrafico, Variante } from "../documento-grafico/nucleo.ts";
import { formatoConteudo } from "../documento-grafico/formatos.ts";
import type { PropostaEditorial } from "./proposta.ts";
import { assetsReferidos } from "./fontes.ts";
import { resolverAssets } from "./fontes.server.ts";
import { BUCKET_EXPORT, caminhoFicheiro, classificarFalha, nomePagina, pacoteParaExportar, PAGINAS_POR_CORRIDA } from "./exportacao.ts";

interface Job { id: string; project_id: string; documento_id: string; documento_versao: number; lease_token: string; paginas: number; tentativas: number }
interface Registo { formato: string; pagina: number | null; storage_path: string; hash: string; bytes: number }

async function sha256(b: Uint8Array): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", b as Uint8Array<ArrayBuffer>));
  return Array.from(d, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function registos(sb: SupabaseClient, j: Job): Promise<Registo[]> {
  const { data, error } = await sb.from("mc_exportacoes").select("formato, pagina, storage_path, hash, bytes")
    .eq("documento_id", j.documento_id).eq("documento_versao", j.documento_versao);
  if (error) throw new Error(`storage: leitura de registos falhou (${error.message})`);
  return (data ?? []) as Registo[];
}

/** Upload without overwrite. If the path already exists (earlier run crashed before registering), accept only identical bytes. */
async function guardar(sb: SupabaseClient, path: string, bytes: Uint8Array, mime: string, hash: string) {
  const { error } = await sb.storage.from(BUCKET_EXPORT).upload(path, bytes, { contentType: mime, upsert: false, cacheControl: "31536000" });
  if (!error) return;
  if (!/exist|duplicate|409/i.test(error.message)) throw new Error(`storage: upload falhou (${error.message})`);
  const { data, error: e2 } = await sb.storage.from(BUCKET_EXPORT).download(path);
  if (e2 || !data) throw new Error("storage: ficheiro existente ilegível");
  if ((await sha256(new Uint8Array(await data.arrayBuffer()))) !== hash) throw new Error("storage: ficheiro existente diferente (não substituído)");
}

async function registar(sb: SupabaseClient, j: Job, formato: string, pagina: number | null, path: string, hash: string, bytes: number) {
  const { error } = await sb.rpc("mc_registar_exportacao", {
    _documento_id: j.documento_id, _versao: j.documento_versao, _formato: formato, _pagina: pagina, _bucket: BUCKET_EXPORT, _path: path, _hash: hash, _bytes: bytes,
  });
  if (error && error.code !== "23505") throw new Error(`storage: registo falhou (${error.message})`);
}

async function baixar(sb: SupabaseClient, path: string, hash: string): Promise<Uint8Array> {
  const { data, error } = await sb.storage.from(BUCKET_EXPORT).download(path);
  if (error || !data) throw new Error("storage: página guardada ilegível");
  const b = new Uint8Array(await data.arrayBuffer());
  if ((await sha256(b)) !== hash) throw new Error("storage: checksum da página não confere");
  return b;
}

export const urlPublico = (path: string) => `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/${BUCKET_EXPORT}/${path.split("/").map(encodeURIComponent).join("/")}`;

async function processarJob(sb: SupabaseClient, j: Job): Promise<string> {
  const { data: dv } = await sb.from("mc_documentos_versoes").select("documento, proposta_versao").eq("documento_id", j.documento_id).eq("versao", j.documento_versao).single();
  const { data: d } = await sb.from("mc_documentos").select("variante, proposta_id").eq("id", j.documento_id).single();
  if (!dv || !d) throw new Error("versão inexistente");
  const { data: pv } = await sb.from("mc_propostas_versoes").select("conteudo").eq("proposta_id", d.proposta_id).eq("versao", dv.proposta_versao).single();
  if (!pv) throw new Error("proposta inexistente");
  const variante = d.variante as Variante;
  const docV = dv.documento as unknown as DocumentoGrafico;
  // Image layers resolve only to verified bytes of this project's immutable assets; a missing asset fails the export (never drawn incomplete).
  const assets = await resolverAssets(sb, j.project_id, assetsReferidos([docV]));
  const pacote = pacoteParaExportar(j.documento_id, pv.conteudo as unknown as PropostaEditorial, variante, docV, assets);
  const total = pacote.variantes[variante].paginas.length;

  let feitos = await registos(sb, j);
  const temPng = new Set(feitos.filter((r) => r.formato === "png").map((r) => r.pagina));
  let renderizadas = 0;
  for (let i = 0; i < total; i++) {
    if (temPng.has(i + 1)) continue;
    if (renderizadas >= PAGINAS_POR_CORRIDA) {
      // checkpoint and hand back to the queue; the next run resumes from the first missing page
      await sb.rpc("mc_exportacao_progresso", { _id: j.id, _lease: j.lease_token, _progresso: { paginas_feitas: temPng.size, total }, _estado: "pendente" });
      return "lote";
    }
    const png = await renderizarPaginaPng(pacote, variante, i);
    const hash = await sha256(png);
    const path = caminhoFicheiro(j.project_id, j.documento_id, j.documento_versao, nomePagina(i), hash);
    await guardar(sb, path, png, "image/png", hash);
    await registar(sb, j, "png", i + 1, path, hash, png.length);
    temPng.add(i + 1);
    renderizadas++;
    const ok = await sb.rpc("mc_exportacao_progresso", { _id: j.id, _lease: j.lease_token, _progresso: { paginas_feitas: temPng.size, total } });
    if (ok.data !== true) return "lease_perdida";
  }

  feitos = await registos(sb, j);
  const pngs = feitos.filter((r) => r.formato === "png").sort((a, b) => (a.pagina ?? 0) - (b.pagina ?? 0));
  const temPdf = feitos.find((r) => r.formato === "pdf" && r.pagina === null);
  if (!temPdf && formatoConteudo(docV.formato) === "carrossel") {
    const bytesPng = [] as Uint8Array[];
    for (const r of pngs) bytesPng.push(await baixar(sb, r.storage_path, r.hash));
    {
      const pdf = await PDFDocument.create();
      pdf.setTitle(pacote.nome);
      pdf.setCreator("Estúdio — motor de carrosséis");
      pdf.setProducer("pdf-lib");
      for (const b of bytesPng) adicionarPaginaRgb(pdf, await pngParaRgb(b), docV.largura, docV.altura);
      const out = await pdf.save({ useObjectStreams: true });
      const hash = await sha256(out);
      const path = caminhoFicheiro(j.project_id, j.documento_id, j.documento_versao, "linkedin.pdf", hash);
      await guardar(sb, path, out, "application/pdf", hash);
      await registar(sb, j, "pdf", null, path, hash, out.length);
    }
    feitos = await registos(sb, j);
  }
  const manifesto = {
    v: 1, documento_id: j.documento_id, versao: j.documento_versao, variante, proposta_versao: dv.proposta_versao, largura: docV.largura, altura: docV.altura, formato: formatoConteudo(docV.formato),
    ficheiros: feitos.filter((r) => r.formato !== "zip").sort((a, b) => a.formato.localeCompare(b.formato) || (a.pagina ?? 0) - (b.pagina ?? 0))
      .map((r) => ({ formato: r.formato, pagina: r.pagina, path: r.storage_path, sha256: r.hash, bytes: r.bytes })),
  };
  const { data: ok, error } = await sb.rpc("mc_concluir_exportacao", { _id: j.id, _lease: j.lease_token, _manifesto: manifesto });
  if (error) throw new Error(`storage: manifesto recusado (${error.message})`);
  return ok ? "concluido" : "lease_perdida";
}

export async function processarExportacoes(sb: SupabaseClient, limite = 2): Promise<Array<{ id: string; resultado: string }>> {
  const { data, error } = await sb.rpc("mc_reservar_exportacoes", { _limite: limite, _segundos: 75 });
  if (error) throw new Error(error.message);
  const out: Array<{ id: string; resultado: string }> = [];
  for (const j of (data ?? []) as Job[]) {
    try {
      out.push({ id: j.id, resultado: await processarJob(sb, j) });
    } catch (e) {
      const f = classificarFalha(e);
      console.error("[mc-export]", j.id, f.classe, (e as Error).message);
      const definitivo = f.definitiva || j.tentativas >= 7;
      await sb.rpc("mc_exportacao_progresso", { _id: j.id, _lease: j.lease_token, _progresso: null, _estado: definitivo ? "erro" : "pendente", _erro: f.mensagem, _classe: f.classe });
      out.push({ id: j.id, resultado: `falha:${f.classe}` });
    }
  }
  return out;
}
