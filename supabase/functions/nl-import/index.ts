// Newsletter data importer (contract digital-sprint-migracao/1).
// Runs entirely with the caller's session: every DB write goes through
// admin-guarded SECURITY DEFINER functions (nl_import_*), so non-admins are refused.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const VERSAO = "digital-sprint-migracao/1";
const STAGING = "nl-import-staging";
const IMAGENS = "nl-imagens-edicao";
const CHUNK = 500;
const BUDGET_MS = 35_000;

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
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function b64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Rewrite any legacy image URL to this project's stable public endpoint.
function makeRewriter(base: string) {
  const re = /(?:https?:\/\/[^\s"'<>()]+?)?(?:\/api\/public\/imagem\/|\/storage\/v1\/object\/(?:public|sign|authenticated)\/imagens-edicao\/)([^\s"'<>()?#]+)(?:\?[^\s"'<>()#]*)?/g;
  let count = 0;
  const str = (s: string) => s.replace(re, (_m, p: string) => { count++; return `${base}/${p}`; });
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.includes("imagem") || v.includes("imagens-edicao") ? str(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { walk, get count() { return count; } };
}

async function loadPacote(sb: SupabaseClient, path: string): Promise<Pacote> {
  const { data, error } = await sb.storage.from(STAGING).download(path);
  if (error || !data) throw new Error(`Pacote não encontrado no armazenamento temporário: ${error?.message ?? ""}`);
  return JSON.parse(await data.text()) as Pacote;
}

async function validar(sb: SupabaseClient, p: Pacote) {
  const erros: string[] = [];
  const avisos: string[] = [];
  if (p?.manifest?.versao !== VERSAO) erros.push(`Versão inválida: ${p?.manifest?.versao ?? "ausente"}`);
  if (!p?.dados || !Array.isArray(p?.ficheiros)) erros.push("Estrutura inválida: faltam dados ou ficheiros");
  if (erros.length) return { erros, avisos, tabelas: [], ficheiros: 0, conflitos: {} };

  for (const nome of Object.keys(p.dados)) if (!PERMITIDAS.has(nome)) avisos.push(`Tabela ignorada (fora da lista permitida): ${nome}`);

  const tabelas: { nome: string; registos: number; hash_ok: boolean; existentes: number }[] = [];
  const hashes: string[] = [];
  for (const t of p.manifest.tabelas) {
    const linhas = p.dados[t.nome] ?? [];
    const h = await sha256(JSON.stringify(linhas));
    hashes.push(`${t.nome}:${h}`);
    const ok = h === t.sha256 && linhas.length === t.registos;
    if (!ok) erros.push(`Hash ou contagem não coincide em ${t.nome}`);
    tabelas.push({ nome: t.nome, registos: linhas.length, hash_ok: ok, existentes: 0 });
  }
  const fhashes: string[] = [];
  for (const f of p.ficheiros) {
    const h = await sha256(b64(f.base64));
    if (h !== f.sha256) erros.push(`Hash não coincide no ficheiro ${f.caminho}`);
    fhashes.push(`${f.bucket}/${f.caminho}:${h}`);
  }
  const global = await sha256(hashes.join("\n") + "\n" + fhashes.join("\n"));
  const esperado = p.manifest.verificacao?.sha256_global;
  if (esperado && esperado !== global) erros.push("Hash global não coincide");

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
      if (!path.startsWith(`${u.user.id}/`)) return json({ error: "Caminho inválido" }, 400);
      const p = await loadPacote(sb, path);
      const v = await validar(sb, p);
      const { data: run, error } = await sb.from("nl_import_runs").insert({
        created_by: u.user.id, modo: "simulacao", estado: v.erros.length ? "invalido" : "validado",
        ficheiro_sha256: v.sha256_global ?? null, staging_path: path,
        manifesto: { tabelas: p.manifest.tabelas, ficheiros: p.manifest.ficheiros?.length ?? 0 },
        progresso: { fase: "tabelas", indice: 0, offset: 0 }, relatorio: v,
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json({ run_id: run.id, ...v });
    }

    if (acao === "importar") {
      const { data: run, error } = await sb.from("nl_import_runs").select("*").eq("id", body.run_id).single();
      if (error || !run) return json({ error: "Execução não encontrada" }, 404);
      if (run.estado === "invalido") return json({ error: "O pacote falhou a validação" }, 400);
      if (run.estado === "concluido") return json({ concluido: true, relatorio: run.relatorio });
      const p = await loadPacote(sb, run.staging_path);
      const base = `${url}/functions/v1/nl-imagem`;
      const rw = makeRewriter(base);
      const prog = { fase: "tabelas", indice: 0, offset: 0, inseridos: {} as Record<string, number>, reescritas: 0, ...(run.progresso ?? {}) };
      const inicio = Date.now();
      const repeticoes: { id: string; repeticao_de: string }[] = [];

      while (prog.fase === "tabelas" && Date.now() - inicio < BUDGET_MS) {
        const t = TABELAS[prog.indice];
        if (!t) { prog.fase = "ficheiros"; break; }
        const linhas = p.dados[t.nome] ?? [];
        const lote = linhas.slice(prog.offset, prog.offset + CHUNK).map((r) => {
          const c = rw.walk(r) as Row;
          if (t.nome === "noticias") c.repeticao_de = null; // second pass
          return c;
        });
        if (lote.length) {
          const { data, error: e } = await sb.rpc("nl_import_rows", { _tabela: `nl_${t.nome}`, _linhas: lote });
          if (e) throw new Error(`${t.nome}: ${e.message}`);
          prog.inseridos[t.nome] = (prog.inseridos[t.nome] ?? 0) + Number((data as { inseridos?: number })?.inseridos ?? 0);
        }
        prog.offset += CHUNK;
        if (prog.offset >= linhas.length) { prog.indice++; prog.offset = 0; }
      }
      prog.reescritas += rw.count;

      if (prog.fase === "ficheiros" && Date.now() - inicio < BUDGET_MS) {
        for (const f of p.ficheiros) {
          const { error: e } = await sb.storage.from(IMAGENS).upload(f.caminho, b64(f.base64), { contentType: f.content_type, upsert: true });
          if (e) throw new Error(`ficheiro ${f.caminho}: ${e.message}`);
        }
        prog.fase = "final";
      }

      if (prog.fase === "final" && Date.now() - inicio < BUDGET_MS) {
        for (const r of p.dados.noticias ?? []) if (r.repeticao_de) repeticoes.push({ id: String(r.id), repeticao_de: String(r.repeticao_de) });
        const rep = await sb.rpc("nl_import_repeticoes", { _pares: repeticoes });
        if (rep.error) throw new Error(rep.error.message);
        const sus = await sb.rpc("nl_import_suspender_agendamentos");
        if (sus.error) throw new Error(sus.error.message);
        // Source profiles: recorded for manual mapping only. Never creates roles.
        const perfis = p.dados.perfis ?? [];
        if (perfis.length) {
          await sb.from("nl_user_mapping").upsert(perfis.map((x) => ({
            source_user_id: x.id, source_nome: x.nome ?? null, source_papel: x.papel ?? null,
          })), { onConflict: "source_user_id", ignoreDuplicates: true });
        }
        const rel = await sb.rpc("nl_import_relatorio");
        if (rel.error) throw new Error(rel.error.message);
        const relatorio = {
          ...(run.relatorio ?? {}), final: rel.data, inseridos: prog.inseridos, reescritas_url: prog.reescritas,
          repeticoes: rep.data, agendamentos: sus.data, ficheiros_copiados: p.ficheiros.length, perfis_registados: perfis.length,
        };
        await sb.from("nl_import_runs").update({ estado: "concluido", modo: "importacao", progresso: prog, relatorio, concluido_em: new Date().toISOString() }).eq("id", run.id);
        await sb.storage.from(STAGING).remove([run.staging_path]);
        return json({ concluido: true, relatorio });
      }
      await sb.from("nl_import_runs").update({ estado: "em_curso", modo: "importacao", progresso: prog }).eq("id", run.id);
      return json({ concluido: false, progresso: prog, total_tabelas: TABELAS.length });
    }
    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
