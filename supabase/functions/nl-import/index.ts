// Newsletter data importer (contract digital-sprint-migracao/1).
// Runs entirely with the caller's session: every DB write goes through
// admin-guarded SECURITY DEFINER functions (nl_import_*), so non-admins are refused.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { reescreverAvatar } from "../_shared/nl-destino-urls.ts";
import { basePublicaObrigatoria } from "../_shared/nl-publico-config.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const VERSAO = "digital-sprint-migracao/1";
const STAGING = "nl-import-staging";
const IMAGENS = "nl-imagens-edicao";
const CHUNK = 500;

// Fixed allowlist, in import order. "perfis" is never written as data.
const TABELAS: { nome: string; pk: string; fks: [string, string][] }[] = [
  { nome: "configuracoes", pk: "chave", fks: [] },
  { nome: "curadoria_config", pk: "id", fks: [] },
  { nome: "curadoria_ferramentas_config", pk: "id", fks: [] },
  { nome: "definicoes_ia", pk: "id", fks: [] },
  { nome: "prioridades_editoriais", pk: "id", fks: [] },
  { nome: "ferramentas_excluidas", pk: "id", fks: [] },
  { nome: "fontes_curadoria", pk: "id", fks: [] },
  { nome: "episodios_podcast", pk: "id", fks: [] },
  { nome: "emails_recebidos", pk: "id", fks: [] },
  { nome: "egoi_listas", pk: "id", fks: [] },
  { nome: "edicoes", pk: "id", fks: [["episodio_podcast_id", "episodios_podcast"]] },
  { nome: "noticias", pk: "id", fks: [["edicao_id", "edicoes"], ["fonte_id", "fontes_curadoria"], ["email_recebido_id", "emails_recebidos"]] },
  { nome: "curadoria_fila", pk: "id", fks: [["fonte_id", "fontes_curadoria"], ["email_recebido_id", "emails_recebidos"], ["noticia_id", "noticias"]] },
  { nome: "cronicas", pk: "id", fks: [["edicao_id", "edicoes"]] },
  { nome: "secoes_edicao", pk: "id", fks: [["edicao_id", "edicoes"]] },
  { nome: "ferramentas_semana", pk: "id", fks: [["edicao_id", "edicoes"]] },
  { nome: "ferramentas_sugeridas", pk: "id", fks: [["fonte_email_id", "emails_recebidos"], ["fonte_directorio_id", "fontes_curadoria"], ["edicao_usada_id", "edicoes"], ["edicao_aprovada_id", "edicoes"]] },
  { nome: "revista_edicao", pk: "edicao_id", fks: [["edicao_id", "edicoes"]] },
  { nome: "revista_itens", pk: "id", fks: [["edicao_id", "edicoes"], ["noticia_id", "noticias"]] },
  { nome: "briefs", pk: "id", fks: [["noticia_id", "noticias"]] },
  { nome: "brief_edicoes", pk: "id", fks: [["brief_id", "briefs"], ["edicao_id", "edicoes"]] },
  { nome: "brief_versoes", pk: "id", fks: [["brief_id", "briefs"]] },
  { nome: "brief_eventos", pk: "id", fks: [] },
  { nome: "egoi_campanhas", pk: "id", fks: [["edicao_id", "edicoes"], ["lista_id", "egoi_listas"]] },
  { nome: "subscricao_eventos", pk: "id", fks: [["edicao_id", "edicoes"]] },
  { nome: "ia_uso", pk: "id", fks: [["edicao_id", "edicoes"], ["brief_id", "briefs"]] },
  { nome: "audit_log", pk: "id", fks: [] },
];
const PERMITIDAS = new Set(["perfis", ...TABELAS.map((t) => t.nome)]);

type Row = Record<string, unknown>;
interface Pacote {
  manifest: {
    versao: string;
    tabelas: { nome: string; registos: number; sha256: string }[];
    ficheiros: { bucket: string; caminho: string; sha256: string }[];
    verificacao?: { sha256_global?: string };
  };
  dados: Record<string, Row[]>;
  ficheiros: { bucket: string; caminho: string; content_type: string; sha256: string; base64: string }[];
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const h = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Rewrite legacy image URLs to this project's stable image endpoint, and known origin-owned
// assets (author avatar) to the destination public host. Historical subscription links inside
// snapshots are intentionally NOT touched: they stay exactly as sent (old tokens are never reused).
function makeRewriter(base: string, basePublicaDestino: string) {
  const re = /(?:https?:\/\/[^\s"'<>()]+?)?(?:\/api\/public\/imagem\/|\/storage\/v1\/object\/(?:public|sign|authenticated)\/imagens-edicao\/)([^\s"'<>()?#]+)(?:\?[^\s"'<>()#]*)?/g;
  let count = 0;
  let avatares = 0;
  const str = (s: string) => {
    let out = s.includes("imagem") || s.includes("imagens-edicao")
      ? s.replace(re, (_m, p: string) => { count++; return `${base}/${p}`; })
      : s;
    const a = reescreverAvatar(out, basePublicaDestino);
    avatares += a.n; out = a.valor;
    return out;
  };
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return str(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { walk, get count() { return count; }, get avatares() { return avatares; } };
}

const ESTADO = { EM_CURSO: "em_curso", CONCLUIDA: "concluida", FALHADA: "falhada" } as const; // matches nl_import_runs_estado_check
const MODO = { SIMULACAO: "dry_run", IMPORTACAO: "importacao" } as const; // matches nl_import_runs_modo_check
const BUCKET_ORIGEM = "imagens-edicao";
const TABELAS_ESPERADAS = 28; // perfis + 27 data tables
const CAMINHO_SEGURO = /^[A-Za-z0-9][A-Za-z0-9._\-]*(?:\/[A-Za-z0-9][A-Za-z0-9._\-]*)*$/;

// Downloads the staged package and returns it with the SHA-256 of its raw bytes.
async function loadPacote(sb: SupabaseClient, path: string): Promise<{ p: Pacote; bytesHash: string }> {
  const { data, error } = await sb.storage.from(STAGING).download(path);
  if (error || !data) throw new Error(`Pacote não encontrado no armazenamento temporário: ${error?.message ?? ""}`);
  const bytes = new Uint8Array(await data.arrayBuffer());
  const bytesHash = await sha256(bytes);
  return { p: JSON.parse(new TextDecoder().decode(bytes)) as Pacote, bytesHash };
}

function caminhoSeguro(c: unknown): c is string {
  return typeof c === "string" && c.length <= 512 && CAMINHO_SEGURO.test(c) && !c.split("/").some((x) => x === ".." || x === ".");
}

async function validar(sb: SupabaseClient, p: Pacote) {
  const erros: string[] = [];
  const avisos: string[] = [];
  const m = p?.manifest as Pacote["manifest"] & { completo?: boolean; erros?: unknown[] };
  if (m?.versao !== VERSAO) erros.push(`Versão inválida: ${m?.versao ?? "ausente"}`);
  if (!p?.dados || typeof p.dados !== "object" || !Array.isArray(p?.ficheiros) || !Array.isArray(m?.tabelas) || !Array.isArray(m?.ficheiros))
    erros.push("Estrutura inválida: faltam manifest, dados ou ficheiros");
  if (erros.length) return { erros, avisos, tabelas: [], ficheiros: 0, conflitos: {} };
  if (m.completo !== true) erros.push("O exportador marcou o pacote como incompleto (manifest.completo ≠ true)");
  if (!Array.isArray(m.erros) || m.erros.length) erros.push(`O exportador reportou ${Array.isArray(m.erros) ? m.erros.length : "?"} erro(s)`);
  if (!m.verificacao?.sha256_global) erros.push("Falta o hash global (verificacao.sha256_global)");

  // Exactly the 28 expected tables, no extras, no missing.
  const nomesManifest = m.tabelas.map((t) => t.nome);
  if (nomesManifest.length !== TABELAS_ESPERADAS) erros.push(`O manifest tem ${nomesManifest.length} tabelas; esperadas ${TABELAS_ESPERADAS}`);
  for (const n of PERMITIDAS) if (!nomesManifest.includes(n)) erros.push(`Tabela em falta no manifest: ${n}`);
  for (const n of nomesManifest) if (!PERMITIDAS.has(n)) erros.push(`Tabela fora da lista permitida: ${n}`);
  if (new Set(nomesManifest).size !== nomesManifest.length) erros.push("Tabelas repetidas no manifest");
  for (const n of Object.keys(p.dados)) if (!nomesManifest.includes(n)) erros.push(`Dados sem entrada no manifest: ${n}`);

  const tabelas: { nome: string; registos: number; hash_ok: boolean; existentes: number }[] = [];
  const hashes: string[] = [];
  for (const t of m.tabelas) {
    const linhas = p.dados[t.nome];
    if (!Array.isArray(linhas)) { erros.push(`Dados em falta: ${t.nome}`); continue; }
    if (!t.sha256) erros.push(`Hash em falta no manifest: ${t.nome}`);
    const h = await sha256(JSON.stringify(linhas));
    hashes.push(`${t.nome}:${t.sha256}`);
    const ok = h === t.sha256 && linhas.length === t.registos;
    if (!ok) erros.push(`Hash ou contagem não coincide em ${t.nome}`);
    tabelas.push({ nome: t.nome, registos: linhas.length, hash_ok: ok, existentes: 0 });
  }

  // Files: manifest and payload must match one-to-one, with safe paths and mandatory hashes.
  const fhashes: string[] = [];
  const porCaminho = new Map(p.ficheiros.map((f) => [`${f.bucket}/${f.caminho}`, f]));
  if (porCaminho.size !== p.ficheiros.length) erros.push("Ficheiros repetidos no pacote");
  if (m.ficheiros.length !== p.ficheiros.length) erros.push(`O manifest lista ${m.ficheiros.length} ficheiros; o pacote traz ${p.ficheiros.length}`);
  for (const mf of m.ficheiros) {
    const id = `${mf.bucket}/${mf.caminho}`;
    if (mf.bucket !== BUCKET_ORIGEM) erros.push(`Bucket de origem inesperado: ${mf.bucket}`);
    if (!caminhoSeguro(mf.caminho)) { erros.push(`Caminho de ficheiro inseguro: ${String(mf.caminho).slice(0, 80)}`); continue; }
    if (!mf.sha256) erros.push(`Hash em falta no manifest: ${id}`);
    const f = porCaminho.get(id);
    if (!f) { erros.push(`Ficheiro em falta no pacote: ${id}`); continue; }
    if (typeof f.base64 !== "string") { erros.push(`Conteúdo em falta: ${id}`); continue; }
    const h = await sha256(b64(f.base64));
    if (h !== mf.sha256 || h !== f.sha256) erros.push(`Hash não coincide no ficheiro ${id}`);
    fhashes.push(`${id}:${mf.sha256}`);
  }
  for (const f of p.ficheiros) if (!m.ficheiros.some((x) => x.bucket === f.bucket && x.caminho === f.caminho)) erros.push(`Ficheiro sem entrada no manifest: ${f.bucket}/${f.caminho}`);

  const global = await sha256(hashes.join("\n") + "\n" + fhashes.join("\n"));
  if (m.verificacao?.sha256_global && m.verificacao.sha256_global !== global) erros.push("Hash global não coincide");
  if (erros.length) return { erros, avisos, tabelas, ficheiros: p.ficheiros.length, conflitos: {}, sha256_global: global };
  // PK duplicates and internal/destination FK checks.
  const ids = new Map<string, Set<string>>();
  for (const t of TABELAS) {
    const s = new Set<string>();
    for (const r of p.dados[t.nome] ?? []) {
      const k = String(r[t.pk]);
      if (s.has(k)) erros.push(`Chave duplicada em ${t.nome}: ${k}`);
      s.add(k);
    }
    ids.set(t.nome, s);
  }
  const conflitos: Record<string, number> = {};
  for (const t of TABELAS) {
    const linhas = p.dados[t.nome] ?? [];
    if (!linhas.length) continue;
    // existing rows in destination (idempotency: they will be skipped, not overwritten)
    let existentes = 0;
    const todas = linhas.map((r) => String(r[t.pk]));
    for (let i = 0; i < todas.length; i += 1000) {
      const { data, error } = await sb.rpc("nl_import_existentes", { _tabela: `nl_${t.nome}`, _pk: t.pk, _ids: todas.slice(i, i + 1000) });
      if (error) throw new Error(error.message);
      existentes += (data as string[]).length;
    }
    const row = tabelas.find((x) => x.nome === t.nome);
    if (row) row.existentes = existentes;
    if (existentes) conflitos[t.nome] = existentes;

    for (const [col, mae] of t.fks) {
      const falta = new Set<string>();
      for (const r of linhas) {
        const v = r[col];
        if (v != null && !ids.get(mae)?.has(String(v))) falta.add(String(v));
      }
      if (!falta.size) continue;
      const maeT = TABELAS.find((x) => x.nome === mae)!;
      const { data, error } = await sb.rpc("nl_import_existentes", { _tabela: `nl_${mae}`, _pk: maeT.pk, _ids: [...falta] });
      if (error) throw new Error(error.message);
      const orf = falta.size - (data as string[]).length;
      if (orf > 0) erros.push(`${orf} referência(s) em falta: ${t.nome}.${col} → ${mae}`);
    }
  }
  return { erros, avisos, tabelas, ficheiros: p.ficheiros.length, conflitos, sha256_global: global };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sessão em falta" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Sessão inválida" }, 401);
    const { data: admin } = await sb.rpc("nl_is_admin");
    if (!admin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json();
    const acao = body.acao as string;

    if (acao === "simular") {
      const path = String(body.staging_path ?? "");
      if (!path.startsWith(`${u.user.id}/`) || !caminhoSeguro(path)) return json({ error: "Caminho inválido" }, 400);
      const { p, bytesHash } = await loadPacote(sb, path);
      const v = await validar(sb, p);
      const { data: run, error } = await sb.from("nl_import_runs").insert({
        created_by: u.user.id, modo: MODO.SIMULACAO, estado: v.erros.length ? ESTADO.FALHADA : ESTADO.CONCLUIDA,
        ficheiro_sha256: bytesHash, staging_path: path,
        manifesto: { tabelas: p.manifest?.tabelas ?? [], ficheiros: p.manifest?.ficheiros?.length ?? 0, sha256_global: v.sha256_global ?? null },
        progresso: {}, relatorio: v, concluido_em: new Date().toISOString(),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ run_id: run.id, ...v });
    }

    if (acao === "importar") {
      const runId = String(body.run_id ?? "");
      const { data: alvo, error } = await sb.from("nl_import_runs").select("*").eq("id", runId).maybeSingle();
      if (error || !alvo) return json({ error: "Execução não encontrada" }, 404);
      if (alvo.created_by !== u.user.id) return json({ error: "Esta execução pertence a outro administrador" }, 403);

      // Resolve the import run that belongs to this simulation (one per simulation, resumable).
      let run = alvo;
      if (alvo.modo === MODO.SIMULACAO) {
        if (alvo.estado !== ESTADO.CONCLUIDA || (alvo.relatorio?.erros?.length ?? 1) > 0) return json({ error: "A simulação não passou; não é possível importar" }, 400);
        const { data: existente } = await sb.from("nl_import_runs").select("*").eq("modo", MODO.IMPORTACAO)
          .eq("created_by", u.user.id).contains("manifesto", { simulacao_id: alvo.id }).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existente) run = existente;
        else {
          const { data: novo, error: e } = await sb.from("nl_import_runs").insert({
            created_by: u.user.id, modo: MODO.IMPORTACAO, estado: ESTADO.EM_CURSO, ficheiro_sha256: alvo.ficheiro_sha256,
            staging_path: alvo.staging_path, manifesto: { ...(alvo.manifesto ?? {}), simulacao_id: alvo.id },
            progresso: { fase: "tabelas", indice: 0, offset: 0, inseridos: {}, ignoradas: {}, reescritas: 0, chunks: 0 }, relatorio: alvo.relatorio,
          }).select("*").single();
          if (e) throw new Error(e.message);
          run = novo;
        }
      }
      if (run.estado === ESTADO.CONCLUIDA) return json({ concluido: true, relatorio: run.relatorio, run_id: run.id });
      if (run.estado === ESTADO.FALHADA) return json({ error: run.relatorio?.falha ?? "A importação falhou; faz nova simulação", run_id: run.id }, 409);

      const falhar = async (msg: string, status = 409) => {
        await sb.from("nl_import_runs").update({ estado: ESTADO.FALHADA, relatorio: { ...(run.relatorio ?? {}), falha: msg } }).eq("id", run.id);
        return json({ error: msg, run_id: run.id }, status);
      };

      // Re-verify the staged bytes before EVERY chunk: one chunk per call.
      const { p, bytesHash } = await loadPacote(sb, run.staging_path);
      if (!run.ficheiro_sha256 || bytesHash !== run.ficheiro_sha256)
        return await falhar("O pacote no armazenamento temporário foi alterado depois da simulação. Importação parada; repete a simulação.");

      const rw = makeRewriter(`${url}/functions/v1/nl-imagem`, basePublicaObrigatoria());
      const prog = { fase: "tabelas", indice: 0, offset: 0, inseridos: {} as Record<string, number>, ignoradas: {} as Record<string, unknown>, reescritas: 0, avatares: 0, chunks: 0, ...(run.progresso ?? {}) };

      try {
        if (prog.fase === "tabelas") {
          const t = TABELAS[prog.indice];
          if (!t) prog.fase = "ficheiros";
          else {
            const linhas = p.dados[t.nome] ?? [];
            const lote = linhas.slice(prog.offset, prog.offset + CHUNK).map((r) => {
              const c = rw.walk(r) as Row;
              if (t.nome === "noticias") c.repeticao_de = null; // second pass
              return c;
            });
            if (lote.length) {
              const { data, error: e } = await sb.rpc("nl_import_rows", { _tabela: `nl_${t.nome}`, _linhas: lote });
              if (e) throw new Error(`${t.nome}: ${e.message}`);
              const d = (data ?? {}) as { inseridos?: number; colunas_ignoradas?: unknown; ignoradas?: unknown };
              prog.inseridos[t.nome] = (prog.inseridos[t.nome] ?? 0) + Number(d.inseridos ?? 0);
              const ign = d.colunas_ignoradas ?? d.ignoradas;
              if (ign && (!Array.isArray(ign) || ign.length)) prog.ignoradas[t.nome] = ign;
            }
            prog.offset += CHUNK;
            if (prog.offset >= linhas.length) { prog.indice++; prog.offset = 0; }
          }
          prog.reescritas += rw.count;
          prog.avatares = (prog.avatares ?? 0) + rw.avatares;
          prog.chunks++;
        } else if (prog.fase === "ficheiros") {
          for (const f of p.ficheiros) {
            if (!caminhoSeguro(f.caminho)) throw new Error(`Caminho inseguro: ${f.caminho}`);
            const { error: e } = await sb.storage.from(IMAGENS).upload(f.caminho, b64(f.base64), { contentType: f.content_type, upsert: true });
            if (e) throw new Error(`ficheiro ${f.caminho}: ${e.message}`);
          }
          prog.fase = "final";
        } else if (prog.fase === "final") {
          const repeticoes: { id: string; repeticao_de: string }[] = [];
          for (const r of p.dados.noticias ?? []) if (r.repeticao_de) repeticoes.push({ id: String(r.id), repeticao_de: String(r.repeticao_de) });
          const rep = await sb.rpc("nl_import_repeticoes", { _pares: repeticoes });
          if (rep.error) throw new Error(rep.error.message);
          const sus = await sb.rpc("nl_import_suspender_agendamentos");
          if (sus.error) throw new Error(sus.error.message);
          // All imported editions belong to the DIGITALSPRINT identity (row triggers are off during
          // import). Only fills empty values; IDs and relations are untouched.
          const { data: ident, error: eI } = await sb.from("estudio_identidades").select("id").eq("chave", "digitalsprint").single();
          if (eI || !ident) throw new Error("Identidade DIGITALSPRINT em falta");
          const idsEd = (p.dados.edicoes ?? []).map((r) => String(r.id));
          let identidadeAtribuida = 0;
          for (let i = 0; i < idsEd.length; i += 500) {
            const { data: upd, error: eU } = await sb.from("nl_edicoes").update({ identidade_id: (ident as { id: string }).id })
              .in("id", idsEd.slice(i, i + 500)).is("identidade_id", null).select("id");
            if (eU) throw new Error(`identidade: ${eU.message}`);
            identidadeAtribuida += upd?.length ?? 0;
          }
          const { count: semIdent } = await sb.from("nl_edicoes").select("id", { count: "exact", head: true }).in("id", idsEd.length ? idsEd : ["00000000-0000-0000-0000-000000000000"]).is("identidade_id", null);
          if ((semIdent ?? 0) > 0) throw new Error(`${semIdent} edições ficaram sem identidade`);
          // Source profiles: recorded for manual mapping only. Existing rows (and any chosen
          // target_user_id / historico) are never overwritten. Never creates roles.
          const perfis = p.dados.perfis ?? [];
          if (perfis.length) {
            const { error: e } = await sb.from("nl_user_mapping").upsert(perfis.map((x) => ({
              source_user_id: x.id, source_nome: x.nome ?? null, source_email: x.email ?? null, source_papel: x.papel ?? null,
            })), { onConflict: "source_user_id", ignoreDuplicates: true });
            if (e) throw new Error(`perfis: ${e.message}`);
          }
          const rel = await sb.rpc("nl_import_relatorio");
          if (rel.error) throw new Error(rel.error.message);
          const relatorio = {
            ...(run.relatorio ?? {}), final: rel.data, inseridos: prog.inseridos, colunas_ignoradas: prog.ignoradas,
            reescritas_url: prog.reescritas, avatares_reescritos: prog.avatares ?? 0,
            ligacoes_subscricao_historicas: "mantidas como enviadas (não reutilizadas)", repeticoes: rep.data, agendamentos: sus.data, identidade_atribuida: identidadeAtribuida, edicoes_digitalsprint: idsEd.length,
            ficheiros_copiados: p.ficheiros.length, perfis_registados: perfis.length, pacote_sha256: bytesHash,
          };
          await sb.from("nl_import_runs").update({ estado: ESTADO.CONCLUIDA, progresso: { ...prog, fase: "concluida" }, relatorio, concluido_em: new Date().toISOString() }).eq("id", run.id);
          await sb.storage.from(STAGING).remove([run.staging_path]);
          return json({ concluido: true, relatorio, run_id: run.id });
        }
      } catch (e) {
        // Keep progress so the same run can resume; the chunk is idempotent (existing rows are skipped).
        await sb.from("nl_import_runs").update({ progresso: prog, relatorio: { ...(run.relatorio ?? {}), ultimo_erro: (e as Error).message } }).eq("id", run.id);
        return json({ error: (e as Error).message, run_id: run.id, retomavel: true }, 500);
      }
      await sb.from("nl_import_runs").update({ estado: ESTADO.EM_CURSO, progresso: prog }).eq("id", run.id);
      return json({ concluido: false, progresso: prog, total_tabelas: TABELAS.length, run_id: run.id });
    }
    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
