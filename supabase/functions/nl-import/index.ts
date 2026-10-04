// Newsletter migration importer (server-side). Contract: digital-sprint-migracao/1
// Reads the confidential package only from the private staging bucket, validates hashes,
// and writes through admin-checked RPCs using the caller's own JWT (DB re-checks nl_is_admin()).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { encodeHex } from "jsr:@std/encoding@1/hex";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

const VERSAO = "digital-sprint-migracao/1";
const STAGING = "nl-import-staging";
const IMAGENS = "nl-imagens-edicao";
const BUDGET_MS = 35_000;
const LOTE = 500;

// Fixed allowlist: source table -> destination table, PK, FKs (child col -> parent source table/col).
// Never derived from the package.
type Fk = { col: string; pai: string; ref: string };
const TABELAS: { nome: string; destino: string | null; pk: string; fks: Fk[] }[] = [
  { nome: "perfis", destino: null, pk: "id", fks: [] },
  { nome: "configuracoes", destino: "nl_configuracoes", pk: "chave", fks: [] },
  { nome: "curadoria_config", destino: "nl_curadoria_config", pk: "id", fks: [] },
  { nome: "curadoria_ferramentas_config", destino: "nl_curadoria_ferramentas_config", pk: "id", fks: [] },
  { nome: "definicoes_ia", destino: "nl_definicoes_ia", pk: "id", fks: [] },
  { nome: "prioridades_editoriais", destino: "nl_prioridades_editoriais", pk: "id", fks: [] },
  { nome: "ferramentas_excluidas", destino: "nl_ferramentas_excluidas", pk: "id", fks: [] },
  { nome: "fontes_curadoria", destino: "nl_fontes_curadoria", pk: "id", fks: [] },
  { nome: "episodios_podcast", destino: "nl_episodios_podcast", pk: "id", fks: [] },
  { nome: "emails_recebidos", destino: "nl_emails_recebidos", pk: "id", fks: [] },
  { nome: "egoi_listas", destino: "nl_egoi_listas", pk: "id", fks: [] },
  { nome: "edicoes", destino: "nl_edicoes", pk: "id", fks: [{ col: "episodio_podcast_id", pai: "episodios_podcast", ref: "id" }] },
  { nome: "noticias", destino: "nl_noticias", pk: "id", fks: [
    { col: "edicao_id", pai: "edicoes", ref: "id" }, { col: "fonte_id", pai: "fontes_curadoria", ref: "id" },
    { col: "email_recebido_id", pai: "emails_recebidos", ref: "id" }, { col: "repeticao_de", pai: "noticias", ref: "id" }] },
  { nome: "curadoria_fila", destino: "nl_curadoria_fila", pk: "id", fks: [
    { col: "fonte_id", pai: "fontes_curadoria", ref: "id" }, { col: "email_recebido_id", pai: "emails_recebidos", ref: "id" },
    { col: "noticia_id", pai: "noticias", ref: "id" }] },
  { nome: "cronicas", destino: "nl_cronicas", pk: "id", fks: [{ col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "secoes_edicao", destino: "nl_secoes_edicao", pk: "id", fks: [{ col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "ferramentas_semana", destino: "nl_ferramentas_semana", pk: "id", fks: [{ col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "ferramentas_sugeridas", destino: "nl_ferramentas_sugeridas", pk: "id", fks: [
    { col: "fonte_email_id", pai: "emails_recebidos", ref: "id" }, { col: "fonte_directorio_id", pai: "fontes_curadoria", ref: "id" },
    { col: "edicao_usada_id", pai: "edicoes", ref: "id" }, { col: "edicao_aprovada_id", pai: "edicoes", ref: "id" }] },
  { nome: "revista_edicao", destino: "nl_revista_edicao", pk: "edicao_id", fks: [{ col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "revista_itens", destino: "nl_revista_itens", pk: "id", fks: [
    { col: "edicao_id", pai: "edicoes", ref: "id" }, { col: "noticia_id", pai: "noticias", ref: "id" }] },
  { nome: "briefs", destino: "nl_briefs", pk: "id", fks: [{ col: "noticia_id", pai: "noticias", ref: "id" }] },
  { nome: "brief_edicoes", destino: "nl_brief_edicoes", pk: "id", fks: [
    { col: "brief_id", pai: "briefs", ref: "id" }, { col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "brief_versoes", destino: "nl_brief_versoes", pk: "id", fks: [{ col: "brief_id", pai: "briefs", ref: "id" }] },
  { nome: "brief_eventos", destino: "nl_brief_eventos", pk: "id", fks: [] },
  { nome: "egoi_campanhas", destino: "nl_egoi_campanhas", pk: "id", fks: [
    { col: "edicao_id", pai: "edicoes", ref: "id" }, { col: "lista_id", pai: "egoi_listas", ref: "id" }] },
  { nome: "subscricao_eventos", destino: "nl_subscricao_eventos", pk: "id", fks: [{ col: "edicao_id", pai: "edicoes", ref: "id" }] },
  { nome: "ia_uso", destino: "nl_ia_uso", pk: "id", fks: [
    { col: "edicao_id", pai: "edicoes", ref: "id" }, { col: "brief_id", pai: "briefs", ref: "id" }] },
  { nome: "audit_log", destino: "nl_audit_log", pk: "id", fks: [] },
];
const CONFIG_PERMITIDAS = new Set([
  "brief_indexabilidade", "brief_limites", "briefs_activos", "curadoria_fila_lock",
  "curadoria_modo_manual", "dominios_bloqueados_egoi", "edicoes_base_url", "egoi_remetente_id",
  "frederico_wp_categoria_id", "noticias_aviso_email", "noticias_max_email", "podcast_rss_url",
  "podcast_ultima_sync", "repeticao_limiar_cosseno", "repeticao_limiar_trgm", "wordpress_learndash_course_id",
]);

type Linha = Record<string, unknown>;
const Body = z.object({
  accao: z.enum(["dry_run", "importar"]),
  caminho: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f]{64}\.json$/),
  run_id: z.string().uuid().optional(),
});
const Pacote = z.object({
  manifest: z.object({
    versao: z.literal(VERSAO),
    completo: z.boolean(),
    erros: z.array(z.string()),
    tabelas: z.array(z.object({ nome: z.string(), ordem: z.number(), pk: z.string(), registos: z.number(), sha256: z.string().regex(/^[0-9a-f]{64}$/) })),
    ficheiros: z.array(z.object({ bucket: z.string(), caminho: z.string(), content_type: z.string(), bytes: z.number(), sha256: z.string() })),
    verificacao: z.object({ sha256_global: z.string().regex(/^[0-9a-f]{64}$/) }),
  }).passthrough(),
  dados: z.record(z.array(z.record(z.unknown()))),
  ficheiros: z.array(z.object({ bucket: z.string(), caminho: z.string(), content_type: z.string(), bytes: z.number(), sha256: z.string(), base64: z.string() })),
});
type PacoteT = z.infer<typeof Pacote>;

const sha256 = async (d: string | Uint8Array) =>
  encodeHex(new Uint8Array(await crypto.subtle.digest("SHA-256", typeof d === "string" ? new TextEncoder().encode(d) : d)));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const caminhoSeguro = (c: string) => /^[A-Za-z0-9._\-/]+$/.test(c) && !c.includes("..") && !c.startsWith("/");

async function verificar(p: PacoteT, ficheiroSha: string) {
  const erros: string[] = [];
  const avisos: string[] = [];
  if (!p.manifest.completo || p.manifest.erros.length) erros.push("O pacote de origem está marcado como incompleto.");
  const esperado = new Set(TABELAS.map((t) => t.nome));
  const vistos = new Set<string>();
  const tabelas: { nome: string; registos: number; hash_ok: boolean; contagem_ok: boolean }[] = [];
  for (const t of p.manifest.tabelas) {
    if (!esperado.has(t.nome)) { erros.push(`Tabela desconhecida no pacote: ${t.nome}`); continue; }
    vistos.add(t.nome);
    const fixa = TABELAS.find((x) => x.nome === t.nome)!;
    if (fixa.pk !== t.pk) erros.push(`Chave primária inesperada em ${t.nome}`);
    const linhas = p.dados[t.nome] ?? [];
    const h = await sha256(JSON.stringify(linhas));
    const hash_ok = h === t.sha256; const contagem_ok = linhas.length === t.registos;
    if (!hash_ok) erros.push(`Hash inválido em ${t.nome}`);
    if (!contagem_ok) erros.push(`Contagem divergente em ${t.nome}`);
    tabelas.push({ nome: t.nome, registos: linhas.length, hash_ok, contagem_ok });
  }
  for (const n of esperado) if (!vistos.has(n)) erros.push(`Tabela em falta no pacote: ${n}`);
  for (const k of Object.keys(p.dados)) if (!esperado.has(k)) erros.push(`Dados sem tabela permitida: ${k}`);
  const ficheiros: { caminho: string; bytes: number; hash_ok: boolean }[] = [];
  for (const f of p.ficheiros) {
    if (!caminhoSeguro(f.caminho)) { erros.push(`Caminho de ficheiro inválido: ${f.caminho}`); continue; }
    const bytes = decodeBase64(f.base64);
    const hash_ok = (await sha256(bytes)) === f.sha256 && bytes.length === f.bytes;
    if (!hash_ok) erros.push(`Hash inválido no ficheiro ${f.caminho}`);
    if (!/^image\//.test(f.content_type)) avisos.push(`Ficheiro não é imagem: ${f.caminho}`);
    ficheiros.push({ caminho: f.caminho, bytes: bytes.length, hash_ok });
  }
  const global = await sha256(
    p.manifest.tabelas.map((t) => `${t.nome}:${t.sha256}`).join("\n") + "\n" +
    p.manifest.ficheiros.map((f) => `${f.bucket}/${f.caminho}:${f.sha256}`).join("\n"),
  );
  if (global !== p.manifest.verificacao.sha256_global) erros.push("Hash global inválido.");
  // configuration allowlist enforced again on the destination
  for (const l of p.dados.configuracoes ?? []) if (!CONFIG_PERMITIDAS.has(String(l.chave))) erros.push(`Chave de configuração não permitida: ${String(l.chave)}`);
  return { erros, avisos, tabelas, ficheiros, hash_global_ok: global === p.manifest.verificacao.sha256_global, ficheiro_sha256: ficheiroSha };
}

let COLS: Record<string, string[]> = {};

async function carregarColunas() {
  const out: Record<string, string[]> = {};
  // PostgREST does not return column names on empty selects; use OpenAPI definitions instead.
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/`;
  const r = await fetch(url, { headers: { apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` } });
  const spec = await r.json() as { definitions?: Record<string, { properties?: Record<string, unknown> }> };
  for (const t of TABELAS) if (t.destino) out[t.destino] = Object.keys(spec.definitions?.[t.destino]?.properties ?? {});
  COLS = out;
}

function mapearUtilizadores(p: PacoteT, perfisDestino: { id: string; email: string }[]) {
  const porEmail = new Map(perfisDestino.map((x) => [x.email.toLowerCase(), x.id]));
  return (p.dados.perfis ?? []).map((l) => {
    const email = typeof l.email === "string" ? l.email : null;
    return {
      source_user_id: String(l.id),
      source_nome: typeof l.nome === "string" ? l.nome : (typeof l.full_name === "string" ? l.full_name : null),
      source_email: email,
      source_papel: typeof l.papel === "string" ? l.papel : null,
      target_user_id: email ? porEmail.get(email.toLowerCase()) ?? null : null,
    };
  });
}


// Old image URLs (app endpoint /api/public/imagem/<path> or direct/signed storage URLs of the old
// "imagens-edicao" bucket) become stable URLs served by this backend's nl-imagem function.
const IMG_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1/nl-imagem/`;
const RE_APP = /https?:\/\/[^\s"'<>()\\]+?\/api\/public\/imagem\/([A-Za-z0-9._\-/]+)/g;
const RE_STORAGE = /https?:\/\/[^\s"'<>()\\]+?\/storage\/v1\/object\/(?:public|sign|authenticated)\/imagens-edicao\/([A-Za-z0-9._\-/]+)(?:\?[^\s"'<>()\\]*)?/g;
function reescrever(v: unknown, stats: { n: number }): unknown {
  if (typeof v === "string") {
    if (!v.includes("/api/public/imagem/") && !v.includes("/imagens-edicao/")) return v;
    return v.replace(RE_APP, (_m, c) => { stats.n++; return IMG_BASE + c; })
            .replace(RE_STORAGE, (_m, c) => { stats.n++; return IMG_BASE + c; });
  }
  if (Array.isArray(v)) return v.map((x) => reescrever(x, stats));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, reescrever(x, stats)]));
  return v;
}

function prepararLinhas(nome: string, destino: string, linhas: Linha[], ctx: { users: Map<string, string | null>; stats: { n: number } }) {
  const permitidas = new Set(COLS[destino] ?? []);
  const descartadas = new Set<string>();
  const out = linhas.map((l) => {
    const r: Linha = {};
    for (const [k, v] of Object.entries(l)) {
      if (permitidas.has(k)) r[k] = v; else descartadas.add(k);
    }
    if (nome === "noticias") r.repeticao_de = null; // second pass
    if (nome === "definicoes_ia" && r.actualizado_por) r.actualizado_por = ctx.users.get(String(r.actualizado_por)) ?? null;
    if (nome === "edicoes" && r.agendamento_estado && ["agendado", "a_executar"].includes(String(r.agendamento_estado))) {
      r.agendamento_erro = `Suspenso na migração (era ${String(r.agendamento_estado)})`;
      r.agendamento_estado = "nenhum";
    }
    for (const k of Object.keys(r)) r[k] = reescrever(r[k], ctx.stats);
    return r;
  });
  return { out, descartadas: [...descartadas] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json(401, { error: "Sessão obrigatória" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(auth.slice(7));
    if (ue || !u.user) return json(401, { error: "Sessão inválida" });
    const { data: isAdmin } = await asUser.rpc("nl_is_admin");
    if (isAdmin !== true) return json(403, { error: "Apenas administradores" });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json(400, { error: parsed.error.flatten().fieldErrors });
    const { accao, caminho } = parsed.data;
    if (!caminho.startsWith(`${u.user.id}/`)) return json(403, { error: "Pacote de outro utilizador" });

    const dl = await admin.storage.from(STAGING).download(caminho);
    if (dl.error || !dl.data) return json(404, { error: "Pacote não encontrado no armazenamento temporário" });
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const ficheiroSha = await sha256(bytes);
    if (!caminho.endsWith(`${ficheiroSha}.json`)) return json(400, { error: "O hash do ficheiro não corresponde ao nome" });
    let raw: unknown;
    try { raw = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json(400, { error: "JSON inválido" }); }
    const pk = Pacote.safeParse(raw);
    if (!pk.success) return json(400, { error: "Estrutura do pacote incompatível", detalhe: pk.error.issues.slice(0, 5) });
    const p = pk.data;
    await carregarColunas();

    const verif = await verificar(p, ficheiroSha);
    const { data: perfisDestino } = await admin.from("profiles").select("id,email");
    const mapping = mapearUtilizadores(p, (perfisDestino ?? []) as { id: string; email: string }[]);

    if (accao === "dry_run") {
      // FK check inside package + destination, conflicts with existing PKs
      const ids = new Map<string, Set<string>>();
      for (const t of TABELAS) ids.set(t.nome, new Set((p.dados[t.nome] ?? []).map((l) => String(l[t.pk]))));
      const fks: { relacao: string; em_falta: number }[] = [];
      const conflitos: { tabela: string; existentes: number }[] = [];
      const colunas_ignoradas: { tabela: string; colunas: string[] }[] = [];
      for (const t of TABELAS) {
        if (!t.destino) continue;
        const linhas = p.dados[t.nome] ?? [];
        for (const fk of t.fks) {
          const faltam = new Set<string>();
          for (const l of linhas) { const v = l[fk.col]; if (v != null && !ids.get(fk.pai)!.has(String(v))) faltam.add(String(v)); }
          let emFalta = faltam.size;
          if (emFalta) {
            const destinoPai = TABELAS.find((x) => x.nome === fk.pai)!.destino!;
            const { data: ex } = await asUser.rpc("nl_import_existentes", { _tabela: destinoPai, _pk: fk.ref, _ids: [...faltam] });
            emFalta -= (ex as string[] | null)?.length ?? 0;
          }
          fks.push({ relacao: `${t.nome}.${fk.col} → ${fk.pai}`, em_falta: emFalta });
        }
        let existentes = 0;
        const todos = [...ids.get(t.nome)!];
        for (let i = 0; i < todos.length; i += 1000) {
          const { data: ex, error } = await asUser.rpc("nl_import_existentes", { _tabela: t.destino, _pk: t.pk, _ids: todos.slice(i, i + 1000) });
          if (error) throw new Error(error.message);
          existentes += (ex as string[]).length;
        }
        conflitos.push({ tabela: t.nome, existentes });
        const perm = new Set(COLS[t.destino]);
        const ign = new Set<string>();
        for (const l of linhas) for (const k of Object.keys(l)) if (!perm.has(k)) ign.add(k);
        if (ign.size) colunas_ignoradas.push({ tabela: t.nome, colunas: [...ign] });
      }
      const agendadas = (p.dados.edicoes ?? []).filter((e) => ["agendado", "a_executar"].includes(String(e.agendamento_estado))).length;
      const relatorio = { verificacao: verif, fks, conflitos, colunas_ignoradas, utilizadores: mapping.map(({ source_email: _e, ...m }) => ({ ...m, tem_email: !!_e })), agendamentos_a_suspender: agendadas,
        pronto: verif.erros.length === 0 && fks.every((f) => f.em_falta === 0) };
      const { data: run, error } = await asUser.from("nl_import_runs").insert({
        modo: "dry_run", estado: "concluida", ficheiro_sha256: ficheiroSha, staging_path: caminho,
        manifesto: { versao: p.manifest.versao, tabelas: p.manifest.tabelas, ficheiros: p.manifest.ficheiros }, relatorio, concluido_em: new Date().toISOString(),
      }).select("id").single();
      if (error) throw new Error(error.message);
      return json(200, { run_id: run.id, relatorio });
    }

    // importar (resumable)
    if (verif.erros.length) return json(400, { error: "Verificação falhou; importação bloqueada", erros: verif.erros });
    let runId = parsed.data.run_id;
    let progresso: { tabelas: Record<string, number>; ficheiros: boolean; repeticoes: boolean; mapping: boolean; resultados: Record<string, unknown> } =
      { tabelas: {}, ficheiros: false, repeticoes: false, mapping: false, resultados: {} };
    if (runId) {
      const { data: r } = await asUser.from("nl_import_runs").select("progresso,ficheiro_sha256,modo,estado").eq("id", runId).single();
      if (!r || r.ficheiro_sha256 !== ficheiroSha || r.modo !== "importacao") return json(400, { error: "Execução não corresponde ao pacote" });
      if (r.estado === "concluida") return json(200, { run_id: runId, concluido: true });
      progresso = { ...progresso, ...(r.progresso as typeof progresso) };
    } else {
      const { data: r, error } = await asUser.from("nl_import_runs").insert({
        modo: "importacao", ficheiro_sha256: ficheiroSha, staging_path: caminho,
        manifesto: { versao: p.manifest.versao, tabelas: p.manifest.tabelas }, progresso,
      }).select("id").single();
      if (error) throw new Error(error.message);
      runId = r.id;
    }
    const inicio = Date.now();
    const guardar = async (extra: Record<string, unknown> = {}) => {
      await asUser.from("nl_import_runs").update({ progresso, ...extra }).eq("id", runId!);
    };

    if (!progresso.mapping) {
      const { error } = await asUser.from("nl_user_mapping").upsert(mapping, { onConflict: "source_user_id" });
      if (error) throw new Error(`Mapeamento: ${error.message}`);
      progresso.mapping = true; await guardar();
    }
    const stats = { n: 0 };
    if (!progresso.ficheiros) {
      for (const f of p.ficheiros) {
        const { error } = await admin.storage.from(IMAGENS).upload(f.caminho, decodeBase64(f.base64), { contentType: f.content_type, upsert: true });
        if (error) throw new Error(`Imagem ${f.caminho}: ${error.message}`);
      }
      progresso.ficheiros = true; await guardar();
    }
    const users = new Map(mapping.map((m) => [m.source_user_id, m.target_user_id]));
    for (const t of TABELAS) {
      if (!t.destino) continue;
      const linhas = p.dados[t.nome] ?? [];
      let feito = progresso.tabelas[t.nome] ?? 0;
      while (feito < linhas.length) {
        if (Date.now() - inicio > BUDGET_MS) { await guardar(); return json(200, { run_id: runId, concluido: false, progresso }); }
        const { out } = prepararLinhas(t.nome, t.destino, linhas.slice(feito, feito + LOTE), { users, stats });
        const { data, error } = await asUser.rpc("nl_import_rows", { _tabela: t.destino, _linhas: out });
        if (error) { await guardar({ estado: "falhada", relatorio: { erro: `${t.nome}: ${error.message}` } }); return json(500, { error: `${t.nome}: ${error.message}` }); }
        const acc = (progresso.resultados[t.nome] as { inseridos: number; existentes: number } | undefined) ?? { inseridos: 0, existentes: 0 };
        const d = data as { inseridos: number; existentes: number };
        progresso.resultados.urls_reescritas = Number(progresso.resultados.urls_reescritas ?? 0) + stats.n; stats.n = 0;
        progresso.resultados[t.nome] = { inseridos: acc.inseridos + d.inseridos, existentes: acc.existentes + d.existentes };
        feito = Math.min(linhas.length, feito + LOTE);
        progresso.tabelas[t.nome] = feito;
        await guardar();
      }
    }
    if (!progresso.repeticoes) {
      const pares = (p.dados.noticias ?? []).filter((l) => l.repeticao_de).map((l) => ({ id: l.id, repeticao_de: l.repeticao_de }));
      for (let i = 0; i < pares.length; i += 1000) {
        const { error } = await asUser.rpc("nl_import_repeticoes", { _pares: pares.slice(i, i + 1000) });
        if (error) throw new Error(`Repetições: ${error.message}`);
      }
      progresso.resultados.repeticoes = pares.length;
      progresso.repeticoes = true; await guardar();
    }
    const { data: susp } = await asUser.rpc("nl_import_suspender_agendamentos");
    const { data: rel, error: re } = await asUser.rpc("nl_import_relatorio");
    if (re) throw new Error(re.message);
    const esperado = Object.fromEntries(p.manifest.tabelas.filter((t) => t.nome !== "perfis").map((t) => [`nl_${t.nome}`, t.registos]));
    const relatorio = { origem: esperado, destino: rel, resultados: progresso.resultados, agendamentos: susp, imagens: p.ficheiros.length,
      utilizadores_sem_correspondencia: mapping.filter((m) => !m.target_user_id).length };
    await guardar({ estado: "concluida", relatorio, concluido_em: new Date().toISOString() });
    return json(200, { run_id: runId, concluido: true, relatorio });
  } catch (e) {
    console.error("nl-import", (e as Error).message);
    return json(500, { error: (e as Error).message });
  }
});
