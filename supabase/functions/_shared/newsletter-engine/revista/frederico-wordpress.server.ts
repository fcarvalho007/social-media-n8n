import process from "node:process";
// Publicador da crónica em FredericoCarvalho.pt.
//
// Destino próprio, com contrato próprio: publica APENAS a crónica como artigo
// autónomo (WordPress REST standard). Nada a ver com a Lição LearnDash do
// DigitalSprint.pt (`wordpress.server.ts`), que continua intocada.
//
// Nesta fase (E1) não existem credenciais: sem elas o destino responde
// «não configurada» e nunca lança erro de runtime. Os segredos são lidos
// apenas aqui, dentro dos handlers, e nunca chegam ao browser.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import {
  construirPayloadArtigo,
  impressaoArtigo,
  metaDescriptionArtigo,
  compararArtigoRemoto,
  validarArtigo,
  type DiferencaArtigo,
  type ArtigoCronica,
} from "./artigo-cronica.ts";
import { lerCronicaCanonica } from "./cronica-canonica.server.ts";
import { gravarDestino } from "./destinos.server.ts";

/**
 * Fase E2B: o artigo é sempre escrito como rascunho, mesmo que a configuração
 * diga `publish`. A publicação pública fica para depois da validação humana.
 */
const FASE_APENAS_RASCUNHO = true;

function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/* ─────────── configuração ─────────── */

export interface ConfigFrederico {
  /** Definições não sensíveis, sempre disponíveis. */
  postType: string;
  status: "draft" | "publish";
  categoria: string | null;
  autor: number | null;
  timeoutMs: number;
  /** Credenciais — ausentes nesta fase. */
  siteUrl: string | null;
  utilizador: string | null;
  password: string | null;
}

const CHAVES = [
  "frederico_wp_post_type",
  "frederico_wp_status",
  "frederico_wp_categoria",
  "frederico_wp_autor",
  "frederico_wp_timeout_ms",
] as const;

async function lerConfig(sb: SupabaseClient): Promise<ConfigFrederico> {
  const { data } = await sb.from("nl_configuracoes").select("chave, valor").in("chave", CHAVES as unknown as string[]);
  const map = new Map(((data ?? []) as { chave: string; valor: string | null }[]).map((r) => [r.chave, (r.valor ?? "").trim()]));
  const num = (k: string, fallback: number) => {
    const n = Number.parseInt(map.get(k) ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const estado = map.get("frederico_wp_status") === "publish" ? "publish" : "draft";
  const siteUrl = (process.env["FREDERICO_WP_URL"] ?? "").trim().replace(/\/+$/, "");
  return {
    postType: map.get("frederico_wp_post_type") || "posts",
    status: estado,
    categoria: map.get("frederico_wp_categoria") || null,
    autor: map.get("frederico_wp_autor") ? num("frederico_wp_autor", 0) || null : null,
    timeoutMs: num("frederico_wp_timeout_ms", 20000),
    siteUrl: siteUrl || null,
    utilizador: (process.env["FREDERICO_WP_USER"] ?? "").trim() || null,
    password: (process.env["FREDERICO_WP_APP_PASSWORD"] ?? "").trim() || null,
  };
}

export interface EstadoIntegracaoFrederico {
  configurada: boolean;
  /** Nunca inclui credenciais — apenas o que é seguro mostrar no editor. */
  postType: string;
  status: "draft" | "publish";
  categoria: string | null;
  motivo: string | null;
}

/** Estado da integração. Ausência de credenciais nunca é erro. */
export async function obterEstadoIntegracaoFrederico(): Promise<EstadoIntegracaoFrederico> {
  const cfg = await lerConfig(admin());
  const faltam: string[] = [];
  if (!cfg.siteUrl || !/^https?:\/\/\S+$/i.test(cfg.siteUrl)) faltam.push("URL do site");
  if (!cfg.utilizador) faltam.push("utilizador");
  if (!cfg.password) faltam.push("palavra-passe de aplicação");
  return {
    configurada: faltam.length === 0,
    postType: cfg.postType,
    status: cfg.status,
    categoria: cfg.categoria,
    motivo: faltam.length ? `Em falta: ${faltam.join(", ")}.` : null,
  };
}

/* ─────────── payload ─────────── */

export interface ArtigoPreview {
  artigo: ArtigoCronica;
  problemas: string[];
  integracao: EstadoIntegracaoFrederico;
  /** `criar` na primeira publicação; `actualizar` quando já existe artigo. */
  operacao: "criar" | "actualizar";
  externalId: string | number | null;
  /** Proveniência visível no editor. */
  cronicaId: string | null;
}

/** Constrói (sem publicar) o artigo exacto que iria para FredericoCarvalho.pt. */
export async function construirArtigoCronica(edicaoId: string): Promise<ArtigoPreview> {
  const sb = admin();
  const [cfg, fontes, integracao] = await Promise.all([
    lerConfig(sb),
    lerCronicaCanonica(sb, edicaoId),
    obterEstadoIntegracaoFrederico(),
  ]);
  const artigo = construirPayloadArtigo(fontes, {
    status: cfg.status,
    categoria: cfg.categoria,
    destinoEdicaoId: edicaoId,
  });
  const problemas = validarArtigo(artigo);
  if (!integracao.configurada) problemas.push("Integração FredericoCarvalho.pt não configurada.");
  return {
    artigo,
    problemas,
    integracao,
    operacao: fontes.externalId ? "actualizar" : "criar",
    externalId: fontes.externalId,
    cronicaId: fontes.cronicaId,
  };
}

/* ─────────── publicação ─────────── */

async function registar(sb: SupabaseClient, quem: string | null, accao: string, detalhe?: string) {
  // Nunca registamos credenciais: só acção, edição e mensagem já higienizada.
  await sb.from("nl_audit_log").insert({ quem: quem ?? "sistema", accao, detalhe: detalhe ?? null });
}

interface RespostaWp {
  id?: number;
  link?: string;
  slug?: string;
  message?: string;
}

async function pedido(
  cfg: ConfigFrederico,
  caminho: string,
  init: { method: string; body?: unknown; namespace?: string },
): Promise<{ ok: boolean; status: number; body: RespostaWp }> {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), cfg.timeoutMs);
  const ns = init.namespace ?? "wp/v2";
  try {
    const r = await fetch(`${cfg.siteUrl}/wp-json/${ns}/${caminho}`, {
      method: init.method,
      headers: {
        Authorization: "Basic " + btoa(`${cfg.utilizador}:${cfg.password}`),
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controlador.signal,
    });
    const body = (await r.json().catch(() => ({}))) as RespostaWp;
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `hash_publicado` representa apenas a última versão confirmada publicamente
 * em FredericoCarvalho.pt. Enquanto o artigo estiver em rascunho o campo fica
 * a null — mesmo que já existisse um valor gravado indevidamente.
 */
export function hashPublicadoParaEstado(
  statusRemoto: string | null | undefined,
  hash: string | null,
): string | null {
  return statusRemoto === "publish" ? hash : null;
}

/**
 * Contagem real de artigos com um dado slug. Só leitura — nunca cria,
 * actualiza nem apaga. Serve para provar unicidade antes de publicar.
 */
export interface ArtigoPorSlug {
  id: number;
  slug: string;
  status: string;
  titulo: string;
  link: string | null;
}

export async function contarArtigosPorSlug(slug: string): Promise<{
  ok: boolean;
  slug: string;
  total: number;
  artigos: ArtigoPorSlug[];
  mensagem: string;
}> {
  const alvo = (slug ?? "").trim();
  if (!alvo) return { ok: false, slug: alvo, total: 0, artigos: [], mensagem: "Slug em falta." };
  const cfg = await lerConfig(admin());
  if (!cfg.siteUrl || !cfg.utilizador || !cfg.password) {
    return { ok: false, slug: alvo, total: 0, artigos: [], mensagem: "Integração não configurada." };
  }
  const auth = await verificarAutenticacao(cfg);
  if (!auth.ok) return { ok: false, slug: alvo, total: 0, artigos: [], mensagem: auth.mensagem };
  try {
    const r = await pedido(cfg, `${cfg.postType}?slug=${encodeURIComponent(alvo)}&status=any`, {
      method: "GET",
    });
    if (!r.ok) {
      return {
        ok: false,
        slug: alvo,
        total: 0,
        artigos: [],
        mensagem: `WordPress [${r.status}]: ${r.body?.message ?? "resposta sem detalhe"}`,
      };
    }
    const lista = (Array.isArray(r.body) ? r.body : []) as Array<{
      id?: number;
      slug?: string;
      status?: string;
      link?: string;
      title?: { rendered?: string };
    }>;
    const artigos: ArtigoPorSlug[] = lista
      .filter((a) => typeof a.id === "number")
      .map((a) => ({
        id: a.id as number,
        slug: a.slug ?? "",
        status: a.status ?? "",
        titulo: a.title?.rendered ?? "",
        link: a.link ?? null,
      }));
    return {
      ok: true,
      slug: alvo,
      total: artigos.length,
      artigos,
      mensagem:
        artigos.length === 1
          ? `1 artigo com o slug «${alvo}» (#${artigos[0]!.id}, ${artigos[0]!.status}).`
          : artigos.length === 0
            ? `Nenhum artigo com o slug «${alvo}».`
            : `Atenção: ${artigos.length} artigos com o slug «${alvo}» (${artigos.map((a) => `#${a.id}`).join(", ")}).`,
    };
  } catch (e) {
    return {
      ok: false,
      slug: alvo,
      total: 0,
      artigos: [],
      mensagem: (e as Error)?.message ?? "Falha ao pesquisar por slug.",
    };
  }
}

/** Procura um artigo pelo slug — base da verificação após tempo esgotado. */
async function procurarPorSlug(
  cfg: ConfigFrederico,
  slug: string,
): Promise<{ id: number; link?: string } | null> {
  try {
    const r = await pedido(cfg, `${cfg.postType}?slug=${encodeURIComponent(slug)}&status=any`, {
      method: "GET",
    });
    const lista = r.body as unknown as RespostaWp[];
    const primeiro = Array.isArray(lista) ? lista[0] : null;
    return primeiro?.id ? { id: primeiro.id, link: primeiro.link } : null;
  } catch {
    return null;
  }
}

/* ─────────── diagnóstico (autenticação, categoria, SEO) ─────────── */

export interface DiagnosticoAutenticacao {
  ok: boolean;
  /** Nome público do utilizador — nunca a palavra-passe nem o header. */
  utilizador: string | null;
  id: number | null;
  podeEscrever: boolean;
  mensagem: string;
}

/** Confirma que as credenciais são aceites e que o utilizador pode escrever. */
export async function verificarAutenticacao(
  cfg?: ConfigFrederico,
): Promise<DiagnosticoAutenticacao> {
  const c = cfg ?? (await lerConfig(admin()));
  if (!c.siteUrl || !c.utilizador || !c.password) {
    return { ok: false, utilizador: null, id: null, podeEscrever: false, mensagem: "Integração não configurada." };
  }
  try {
    const r = await pedido(c, "users/me?context=edit", { method: "GET" });
    if (!r.ok) {
      return {
        ok: false,
        utilizador: null,
        id: null,
        podeEscrever: false,
        mensagem: `Integração configurada, mas autenticação falhou [${r.status}]: ${r.body?.message ?? "sem detalhe"}`,
      };
    }
    const u = r.body as unknown as {
      id?: number;
      name?: string;
      capabilities?: Record<string, boolean>;
    };
    const caps = u.capabilities ?? {};
    const podeEscrever = Boolean(caps["edit_posts"] || caps["publish_posts"] || caps["edit_published_posts"]);
    return {
      ok: true,
      utilizador: u.name ?? null,
      id: u.id ?? null,
      podeEscrever,
      mensagem: podeEscrever
        ? `Autenticado como ${u.name ?? "utilizador"} — pode criar e editar artigos.`
        : `Autenticado como ${u.name ?? "utilizador"}, mas sem permissão para criar ou editar artigos.`,
    };
  } catch (e) {
    return {
      ok: false,
      utilizador: null,
      id: null,
      podeEscrever: false,
      mensagem: `Integração configurada, mas autenticação falhou: ${(e as Error)?.message ?? "falha de rede"}`,
    };
  }
}

export interface CategoriaCronicas {
  ok: boolean;
  id: number | null;
  nome: string | null;
  slug: string | null;
  mensagem: string;
}

/** Resolve a categoria «Crónicas» pelo slug. Nunca cria categorias. */
export async function resolverCategoriaCronicas(
  cfg?: ConfigFrederico,
  sb?: SupabaseClient,
): Promise<CategoriaCronicas> {
  const db = sb ?? admin();
  const c = cfg ?? (await lerConfig(db));
  const slug = (c.categoria || "cronicas").trim();
  if (!c.siteUrl) return { ok: false, id: null, nome: null, slug, mensagem: "Integração não configurada." };
  try {
    const r = await pedido(c, `categories?slug=${encodeURIComponent(slug)}`, { method: "GET" });
    const lista = (Array.isArray(r.body) ? r.body : []) as unknown as {
      id: number;
      name: string;
      slug: string;
    }[];
    if (lista.length !== 1) {
      return {
        ok: false,
        id: null,
        nome: null,
        slug,
        mensagem:
          lista.length === 0
            ? `Categoria «${slug}» não encontrada em FredericoCarvalho.pt.`
            : `Encontradas ${lista.length} categorias com o slug «${slug}» — resolve a ambiguidade no site.`,
      };
    }
    const cat = lista[0]!;
    // Cache do ID; o slug continua a ser a fonte de verdade.
    await db
      .from("nl_configuracoes")
      .upsert({ chave: "frederico_wp_categoria_id", valor: String(cat.id) }, { onConflict: "chave" });
    return { ok: true, id: cat.id, nome: cat.name, slug: cat.slug, mensagem: `Categoria ${cat.name} (#${cat.id}).` };
  } catch (e) {
    return { ok: false, id: null, nome: null, slug, mensagem: (e as Error)?.message ?? "Falha ao ler categorias." };
  }
}

export interface ArtigoConfirmado {
  id: number;
  status: string;
  titulo: string;
  slug: string;
  excerpt: string;
  /** Corpo tal como está guardado no WordPress — base da comparação editorial. */
  conteudo: string;
  conteudoTamanho: number;
  categorias: number[];
  autor: number | null;
  link: string | null;
}

/** Lê no WordPress o artigo escrito — nunca damos sucesso só pelo código HTTP. */
export async function lerArtigo(
  cfg: ConfigFrederico,
  id: string | number,
): Promise<ArtigoConfirmado | null> {
  const r = await pedido(cfg, `${cfg.postType}/${id}?context=edit`, { method: "GET" });
  if (!r.ok) return null;
  const b = r.body as unknown as {
    id?: number;
    status?: string;
    title?: { raw?: string; rendered?: string };
    slug?: string;
    excerpt?: { raw?: string; rendered?: string };
    content?: { raw?: string; rendered?: string };
    categories?: number[];
    author?: number;
    link?: string;
  };
  if (!b?.id) return null;
  return {
    id: b.id,
    status: b.status ?? "",
    titulo: b.title?.raw ?? b.title?.rendered ?? "",
    slug: b.slug ?? "",
    excerpt: b.excerpt?.raw ?? b.excerpt?.rendered ?? "",
    conteudo: b.content?.raw ?? b.content?.rendered ?? "",
    conteudoTamanho: (b.content?.raw ?? b.content?.rendered ?? "").length,
    categorias: Array.isArray(b.categories) ? b.categories : [],
    autor: b.author ?? null,
    link: (b.link ?? "").trim() || null,
  };
}

export interface DiagnosticoRankMath {
  disponivel: boolean;
  /** Só verdadeiro quando existe rota de escrita com contrato declarado. */
  escritaSuportada: boolean;
  status: number | null;
  rotas: string[];
  /** Argumentos declarados pela rota de escrita — nunca adivinhados. */
  argumentos: string[];
  mensagem: string;
}

const ROTA_UPDATE_META = "/rankmath/v1/updateMeta";

/**
 * Auditoria autenticada ao Rank Math.
 *
 * Só leitura: descobre as rotas do namespace e o contrato declarado da rota de
 * escrita de metadados. Não escreve nada e não adivinha campos internos.
 */
export async function auditarRankMath(cfg?: ConfigFrederico): Promise<DiagnosticoRankMath> {
  const c = cfg ?? (await lerConfig(admin()));
  const vazio = { disponivel: false, escritaSuportada: false, status: null, rotas: [], argumentos: [] };
  if (!c.siteUrl || !c.utilizador) return { ...vazio, mensagem: "Integração não configurada." };
  try {
    const r = await pedido(c, "", { method: "GET", namespace: "rankmath/v1" });
    const rotasRaw = (r.body as unknown as { routes?: Record<string, unknown> })?.routes ?? {};
    const rotas = Object.keys(rotasRaw);
    if (!r.ok) {
      return {
        ...vazio,
        status: r.status,
        mensagem: `Namespace rankmath/v1 respondeu [${r.status}] — escrita de metadados SEO não confirmada.`,
      };
    }

    const rota = (rotasRaw as Record<string, unknown>)[ROTA_UPDATE_META] as
      | { methods?: string[]; endpoints?: { methods?: string[]; args?: Record<string, unknown> }[] }
      | undefined;
    const endpointEscrita = (rota?.endpoints ?? []).find((e) =>
      (e.methods ?? []).some((m) => m.toUpperCase() === "POST"),
    );
    const argumentos = Object.keys(endpointEscrita?.args ?? {});
    const contratoCompleto = ["objectType", "objectID", "meta"].every((a) => argumentos.includes(a));

    return {
      disponivel: true,
      escritaSuportada: Boolean(endpointEscrita) && contratoCompleto,
      status: r.status,
      rotas,
      argumentos,
      mensagem: !endpointEscrita
        ? `Rank Math acessível (${rotas.length} rotas) mas sem rota de escrita ${ROTA_UPDATE_META} — SEO fica a cargo dos templates globais.`
        : contratoCompleto
          ? `Rank Math acessível: ${ROTA_UPDATE_META} aceita ${argumentos.join(", ")}.`
          : `Rota ${ROTA_UPDATE_META} existe mas o contrato declarado (${argumentos.join(", ") || "sem argumentos"}) não é suficiente — escrita SEO não activada.`,
    };
  } catch (e) {
    return { ...vazio, mensagem: (e as Error)?.message ?? "Falha ao consultar Rank Math." };
  }
}

export interface ResultadoSeo {
  ok: boolean;
  escrito: string[];
  mensagem: string;
}

/**
 * Escreve os metadados SEO da crónica via Rank Math.
 *
 * Só é chamada depois de a auditoria confirmar a rota e o contrato. O canonical
 * é sempre a URL pública da crónica em FredericoCarvalho.pt — nunca a edição
 * Digital Sprint, que tem canónica própria.
 */
export async function escreverSeoCronica(
  cfg: ConfigFrederico,
  postId: string | number,
  dados: { title: string; description: string; canonical: string },
): Promise<ResultadoSeo> {
  const meta: Record<string, string> = {
    rank_math_title: dados.title,
    rank_math_description: dados.description,
    rank_math_canonical_url: dados.canonical,
  };
  try {
    const r = await pedido(cfg, "updateMeta", {
      method: "POST",
      namespace: "rankmath/v1",
      body: { objectType: "post", objectID: Number(postId), meta },
    });
    if (!r.ok) {
      return {
        ok: false,
        escrito: [],
        mensagem: `Rank Math [${r.status}]: ${r.body?.message ?? "resposta sem detalhe"}`,
      };
    }
    return {
      ok: true,
      escrito: Object.keys(meta),
      mensagem: "SEO title, meta description e canonical escritos no Rank Math.",
    };
  } catch (e) {
    return { ok: false, escrito: [], mensagem: (e as Error)?.message ?? "Falha ao escrever SEO." };
  }
}


/* ─────────── guarda do artigo externo ─────────── */

/**
 * Confirma que o artigo externo pertence mesmo a esta edição.
 *
 * Bloqueia (nunca escreve) quando: outra edição reclama o mesmo `external_id`,
 * o slug guardado difere do slug remoto, ou a URL guardada aponta para outro
 * artigo. Devolve `null` quando está tudo alinhado.
 */
export async function guardaExternalId(
  sb: SupabaseClient,
  edicaoId: string,
  externalId: string | number,
  remoto: ArtigoConfirmado,
): Promise<string | null> {
  if (String(remoto.id) !== String(externalId)) {
    return `O artigo lido (#${remoto.id}) não é o artigo guardado (#${externalId}). Escrita bloqueada.`;
  }

  const { data } = await sb.from("nl_edicoes").select("id, numero, destinos");
  const linhas = (data ?? []) as Array<{ id: string; numero: number; destinos?: Record<string, unknown> | null }>;
  const guardado = linhas.find((l) => l.id === edicaoId);
  const outra = linhas.find((l) => {
    if (l.id === edicaoId) return false;
    const c = (l.destinos?.["cronica"] ?? {}) as { external_id?: string | number | null };
    return c.external_id != null && String(c.external_id) === String(externalId);
  });
  if (outra) {
    return `O artigo #${externalId} já está associado à edição ${outra.numero}. Escrita bloqueada — resolve manualmente.`;
  }

  const destino = (guardado?.destinos?.["cronica"] ?? {}) as { slug?: string; url?: string };
  const slugGuardado = (destino.slug ?? "").trim();
  if (slugGuardado && remoto.slug && slugGuardado !== remoto.slug) {
    return `O endereço do artigo mudou no site (${slugGuardado} → ${remoto.slug}). Escrita bloqueada — confirma manualmente.`;
  }
  const urlGuardada = (destino.url ?? "").trim();
  if (urlGuardada && remoto.link && urlGuardada !== remoto.link) {
    return `A URL guardada (${urlGuardada}) não corresponde ao artigo remoto (${remoto.link}). Escrita bloqueada.`;
  }
  return null;
}

export interface ResultadoPublicacao {
  ok: boolean;
  url: string | null;
  externalId: string | number | null;
  operacao: "criar" | "actualizar";
  mensagem: string;
  /** Estado do artigo no WordPress: `draft` nesta fase. */
  wpStatus?: string | null;
  confirmacao?: ArtigoConfirmado | null;
}

/**
 * Publica ou actualiza o artigo da crónica.
 *
 * Idempotência: a decisão POST/PUT é do servidor e depende exclusivamente da
 * existência de `destinos.cronica.external_id`. Nunca cria um segundo artigo
 * por retry, timeout ou nova edição do texto.
 */
export async function publicarCronica(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<ResultadoPublicacao> {
  const sb = admin();
  const preview = await construirArtigoCronica(opts.edicaoId);
  const operacao = preview.operacao;

  if (preview.problemas.length) {
    const mensagem = preview.problemas.join(" ");
    await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem }, sb);
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: publicação recusada", mensagem);
    return { ok: false, url: null, externalId: preview.externalId, operacao, mensagem };
  }

  const cfg = await lerConfig(sb);

  // 1) Autenticação antes de qualquer escrita. Falhar aqui nunca escreve nada.
  const auth = await verificarAutenticacao(cfg);
  if (!auth.ok || !auth.podeEscrever) {
    await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: auth.mensagem }, sb);
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: autenticação falhou", auth.mensagem);
    return { ok: false, url: null, externalId: preview.externalId, operacao, mensagem: auth.mensagem };
  }

  // 2) Categoria resolvida pelo slug. Ambiguidade ou ausência param o processo.
  const categoria = await resolverCategoriaCronicas(cfg, sb);
  if (!categoria.ok || !categoria.id) {
    await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: categoria.mensagem }, sb);
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: categoria por resolver", categoria.mensagem);
    return { ok: false, url: null, externalId: preview.externalId, operacao, mensagem: categoria.mensagem };
  }

  await gravarDestino(opts.edicaoId, "cronica", { estado: "pendente", erro: null }, sb);
  await registar(
    sb,
    opts.quem ?? null,
    operacao === "criar"
      ? "Crónica FredericoCarvalho.pt: tentativa de criação"
      : "Crónica FredericoCarvalho.pt: tentativa de actualização",
    preview.artigo.title,
  );

  // Enquanto o artigo não for público, o endereço ainda pode ser corrigido.
  const wpAtual =
    operacao === "actualizar" && preview.externalId ? await lerArtigo(cfg, preview.externalId) : null;
  if (wpAtual?.status === "publish") {
    const mensagem = `O artigo #${wpAtual.id} já está publicado. Usa «Actualizar artigo».`;
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: escrita recusada", mensagem);
    return { ok: false, url: wpAtual.link, externalId: preview.externalId, operacao, mensagem };
  }
  if (wpAtual && preview.externalId) {
    const violacao = await guardaExternalId(sb, opts.edicaoId, preview.externalId, wpAtual);
    if (violacao) {
      await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: escrita bloqueada", violacao);
      return { ok: false, url: wpAtual.link, externalId: preview.externalId, operacao, mensagem: violacao };
    }
  }


  const corpo: Record<string, unknown> = {
    title: preview.artigo.title,
    content: preview.artigo.content,
    excerpt: preview.artigo.excerpt,
    // Fase E2B: o artigo nasce e mantém-se em rascunho até validação humana.
    status: FASE_APENAS_RASCUNHO ? "draft" : preview.artigo.status,
    categories: [categoria.id],
    slug: preview.artigo.slug,
  };
  if (cfg.autor) corpo["author"] = cfg.autor;



  try {
    const caminho =
      operacao === "actualizar" ? `${cfg.postType}/${preview.externalId}` : cfg.postType;
    const r = await pedido(cfg, caminho, {
      method: operacao === "actualizar" ? "PUT" : "POST",
      body: corpo,
    });

    if (!r.ok) {
      const mensagem = `WordPress [${r.status}]: ${r.body?.message ?? "resposta sem detalhe"}`;
      await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem }, sb);
      await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: erro", mensagem);
      return { ok: false, url: null, externalId: preview.externalId, operacao, mensagem };
    }
    const externalId = r.body?.id ?? preview.externalId;

    // 3) Confirmação: relemos o artigo no WordPress. 201 não chega.
    const confirmacao = externalId ? await lerArtigo(cfg, externalId) : null;
    if (!confirmacao) {
      const mensagem = "Artigo escrito mas não foi possível confirmar a leitura no WordPress.";
      await gravarDestino(
        opts.edicaoId,
        "cronica",
        { estado: "erro", erro: mensagem, external_id: externalId ?? null },
        sb,
      );
      await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: confirmação falhou", mensagem);
      return { ok: false, url: null, externalId: externalId ?? null, operacao, mensagem };
    }

    const url = confirmacao.link ?? (r.body?.link ?? "").trim() ?? null;
    const rascunho = confirmacao.status !== "publish";
    await gravarDestino(
      opts.edicaoId,
      "cronica",
      {
        estado: rascunho ? "rascunho" : "publicada",
        url,
        external_id: externalId ?? null,
        erro: null,
        titulo: confirmacao.titulo,
        slug: confirmacao.slug,
        categoria: categoria.nome,
        // `hash_publicado` só representa versões confirmadas publicamente.
        // Em rascunho fica a null — inclusive limpando um valor herdado.
        hash_publicado: hashPublicadoParaEstado(
          confirmacao.status,
          await impressaoArtigo(preview.artigo),
        ),
        actualizado_em: new Date().toISOString(),
        ...(rascunho ? {} : { publicado_em: new Date().toISOString() }),
      },
      sb,
    );
    // A URL editorial continua a ser uma só.
    if (url) {
      await sb
        .from("nl_revista_edicao")
        .upsert({ edicao_id: opts.edicaoId, cronica_url: url }, { onConflict: "edicao_id" });
    }
    await registar(
      sb,
      opts.quem ?? null,
      operacao === "criar"
        ? `Crónica FredericoCarvalho.pt: rascunho criado (#${confirmacao.id})`
        : `Crónica FredericoCarvalho.pt: rascunho actualizado (#${confirmacao.id})`,
      url ?? undefined,
    );
    return {
      ok: true,
      url,
      externalId: externalId ?? null,
      operacao,
      wpStatus: confirmacao.status,
      confirmacao,
      mensagem: rascunho
        ? `Rascunho ${operacao === "criar" ? "criado" : "actualizado"} em FredericoCarvalho.pt (#${confirmacao.id}).`
        : "Crónica publicada.",
    };
  } catch (e) {
    const abortado = (e as Error)?.name === "AbortError";

    // Timeout numa criação: o artigo pode ter sido criado à mesma. Antes de
    // dar erro, procuramos pelo slug e adoptamos o artigo existente — é isto
    // que impede um segundo artigo quando o operador repetir.
    if (abortado && operacao === "criar") {
      const encontrado = await procurarPorSlug(cfg, preview.artigo.slug);
      if (encontrado?.id) {
        const url = (encontrado.link ?? "").trim() || null;
        await gravarDestino(
          opts.edicaoId,
          "cronica",
          { estado: FASE_APENAS_RASCUNHO ? "rascunho" : "publicada", url, external_id: encontrado.id, erro: null },
          sb,
        );
        if (url) {
          await sb
            .from("nl_revista_edicao")
            .upsert({ edicao_id: opts.edicaoId, cronica_url: url }, { onConflict: "edicao_id" });
        }
        await registar(
          sb,
          opts.quem ?? null,
          "Crónica FredericoCarvalho.pt: artigo criado (confirmado após tempo esgotado)",
          url ?? undefined,
        );
        return {
          ok: true,
          url,
          externalId: encontrado.id,
          operacao,
          wpStatus: "draft",
          mensagem: `Rascunho encontrado no site após tempo esgotado (#${encontrado.id}).`,
        };
      }
    }

    const mensagem = abortado
      ? "Tempo esgotado e nenhum artigo encontrado no site. Podes repetir em segurança."
      : (e as Error)?.message ?? "Falha inesperada";
    await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem }, sb);
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: erro", mensagem);
    return { ok: false, url: null, externalId: preview.externalId, operacao, mensagem };
  }

}

/** Retry — exactamente a mesma operação; o servidor volta a decidir criar/actualizar. */
export async function repetirPublicacaoCronica(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<ResultadoPublicacao> {
  const sb = admin();
  await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: repetição pedida");
  return publicarCronica(opts);
}

/* ─────────── publicação definitiva (E2C) ─────────── */

/**
 * Torna público o artigo que já existe em rascunho.
 *
 * Actua exclusivamente sobre `destinos.cronica.external_id`: nunca cria um
 * artigo, nunca faz POST na colecção. Se alguma verificação prévia falhar, não
 * é escrito nada.
 */
export async function publicarArtigoCronica(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<ResultadoPublicacao> {
  const sb = admin();
  const preview = await construirArtigoCronica(opts.edicaoId);
  const externalId = preview.externalId;
  const falha = async (mensagem: string, accao: string): Promise<ResultadoPublicacao> => {
    await registar(sb, opts.quem ?? null, accao, mensagem);
    return { ok: false, url: null, externalId, operacao: "actualizar", mensagem };
  };

  if (!externalId) {
    return falha(
      "Ainda não existe rascunho em FredericoCarvalho.pt. Cria o rascunho antes de publicar.",
      "Crónica FredericoCarvalho.pt: publicação recusada",
    );
  }
  if (preview.problemas.length) {
    return falha(preview.problemas.join(" "), "Crónica FredericoCarvalho.pt: publicação recusada");
  }

  const cfg = await lerConfig(sb);

  const auth = await verificarAutenticacao(cfg);
  if (!auth.ok || !auth.podeEscrever) {
    return falha(auth.mensagem, "Crónica FredericoCarvalho.pt: autenticação falhou");
  }
  const categoria = await resolverCategoriaCronicas(cfg, sb);
  if (!categoria.ok || !categoria.id) {
    return falha(categoria.mensagem, "Crónica FredericoCarvalho.pt: categoria por resolver");
  }

  // 1) Verificação prévia: é este o artigo, e está mesmo em rascunho.
  const antes = await lerArtigo(cfg, externalId);
  if (!antes) {
    return falha(
      `Artigo #${externalId} não foi encontrado em FredericoCarvalho.pt.`,
      "Crónica FredericoCarvalho.pt: publicação recusada",
    );
  }
  if (antes.status === "publish") {
    return falha(
      `O artigo #${antes.id} já está publicado. Usa «Actualizar artigo».`,
      "Crónica FredericoCarvalho.pt: publicação recusada",
    );
  }
  if (!antes.categorias.includes(categoria.id)) {
    return falha(
      `O artigo #${antes.id} não está na categoria ${categoria.nome ?? categoria.slug}.`,
      "Crónica FredericoCarvalho.pt: publicação recusada",
    );
  }
  const violacaoId = await guardaExternalId(sb, opts.edicaoId, externalId, antes);
  if (violacaoId) return falha(violacaoId, "Crónica FredericoCarvalho.pt: publicação bloqueada");

  const slugCorrigido = antes.slug !== preview.artigo.slug;
  const excerptCorrigido = (antes.excerpt ?? "").replace(/<[^>]+>/g, "").trim() !== preview.artigo.excerpt;
  if (slugCorrigido) {
    await registar(
      sb,
      opts.quem ?? null,
      "Crónica FredericoCarvalho.pt: slug corrigido antes da publicação",
      `${antes.slug} → ${preview.artigo.slug}`,
    );
  }
  if (excerptCorrigido) {
    await registar(
      sb,
      opts.quem ?? null,
      "Crónica FredericoCarvalho.pt: excerto recalculado antes da publicação",
      preview.artigo.excerpt,
    );
  }

  await gravarDestino(opts.edicaoId, "cronica", { estado: "pendente", erro: null }, sb);

  const corpo: Record<string, unknown> = {
    title: preview.artigo.title,
    content: preview.artigo.content,
    excerpt: preview.artigo.excerpt,
    slug: preview.artigo.slug,
    status: "publish",
    categories: [categoria.id],
  };
  if (cfg.autor) corpo["author"] = cfg.autor;

  try {
    // 2) Uma única escrita, sempre no mesmo artigo.
    const r = await pedido(cfg, `${cfg.postType}/${externalId}`, { method: "PUT", body: corpo });
    if (!r.ok) {
      const mensagem = `WordPress [${r.status}]: ${r.body?.message ?? "resposta sem detalhe"}`;
      await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem, external_id: externalId }, sb);
      return falha(mensagem, "Crónica FredericoCarvalho.pt: erro na publicação");
    }

    // 3) Confirmação por leitura — o código HTTP não chega.
    const confirmacao = await lerArtigo(cfg, externalId);
    if (!confirmacao || confirmacao.status !== "publish") {
      const mensagem = "Escrita aceite mas o artigo não ficou confirmado como publicado.";
      await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem, external_id: externalId }, sb);
      return falha(mensagem, "Crónica FredericoCarvalho.pt: confirmação falhou");
    }

    const url = confirmacao.link ?? (r.body?.link ?? "").trim() ?? null;
    await gravarDestino(
      opts.edicaoId,
      "cronica",
      {
        estado: "publicada",
        url,
        external_id: externalId,
        erro: null,
        titulo: confirmacao.titulo,
        slug: confirmacao.slug,
        categoria: categoria.nome,
        hash_publicado: await impressaoArtigo(preview.artigo),
        actualizado_em: new Date().toISOString(),
        publicado_em: new Date().toISOString(),
      },
      sb,
    );
    if (url) {
      await sb
        .from("nl_revista_edicao")
        .upsert({ edicao_id: opts.edicaoId, cronica_url: url }, { onConflict: "edicao_id" });
    }
    await registar(
      sb,
      opts.quem ?? null,
      `Crónica FredericoCarvalho.pt: artigo publicado (#${confirmacao.id})`,
      url ?? undefined,
    );
    return {
      ok: true,
      url,
      externalId,
      operacao: "actualizar",
      wpStatus: confirmacao.status,
      confirmacao,
      mensagem: `Crónica publicada em FredericoCarvalho.pt (#${confirmacao.id}).`,
    };
  } catch (e) {
    const mensagem = (e as Error)?.message ?? "Falha inesperada";
    await gravarDestino(opts.edicaoId, "cronica", { estado: "erro", erro: mensagem, external_id: externalId }, sb);
    return falha(mensagem, "Crónica FredericoCarvalho.pt: erro na publicação");
  }
}

/* ─────────── actualização de artigo já publicado (E2D) ─────────── */

/**
 * Actualiza o artigo já publicado.
 *
 * Contrato desta operação, diferente da fase de rascunho:
 *   • escreve sempre e apenas em `destinos.cronica.external_id`;
 *   • nunca envia `slug` — o permalink público é imutável após a publicação;
 *   • nunca envia `status` — não há forma de despublicar por engano;
 *   • confirma por leitura que ID e slug se mantiveram.
 */
export async function actualizarArtigoCronica(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<ResultadoPublicacao & { seo?: ResultadoSeo | null }> {
  const sb = admin();
  const preview = await construirArtigoCronica(opts.edicaoId);
  const externalId = preview.externalId;
  const falha = async (mensagem: string, accao: string): Promise<ResultadoPublicacao> => {
    await registar(sb, opts.quem ?? null, accao, mensagem);
    return { ok: false, url: null, externalId, operacao: "actualizar", mensagem };
  };

  if (!externalId) {
    return falha(
      "Ainda não existe artigo em FredericoCarvalho.pt para actualizar.",
      "Crónica FredericoCarvalho.pt: actualização recusada",
    );
  }
  if (preview.problemas.length) {
    return falha(preview.problemas.join(" "), "Crónica FredericoCarvalho.pt: actualização recusada");
  }

  const cfg = await lerConfig(sb);
  const auth = await verificarAutenticacao(cfg);
  if (!auth.ok || !auth.podeEscrever) {
    return falha(auth.mensagem, "Crónica FredericoCarvalho.pt: autenticação falhou");
  }
  const categoria = await resolverCategoriaCronicas(cfg, sb);
  if (!categoria.ok || !categoria.id) {
    return falha(categoria.mensagem, "Crónica FredericoCarvalho.pt: categoria por resolver");
  }

  // 1) Preflight: é este o artigo e está mesmo público.
  const antes = await lerArtigo(cfg, externalId);
  if (!antes) {
    return falha(
      `Artigo #${externalId} não foi encontrado em FredericoCarvalho.pt.`,
      "Crónica FredericoCarvalho.pt: actualização recusada",
    );
  }
  if (antes.status !== "publish") {
    return falha(
      `O artigo #${antes.id} está em ${antes.status}. Usa «Publicar artigo» antes de actualizar.`,
      "Crónica FredericoCarvalho.pt: actualização recusada",
    );
  }
  const violacaoId = await guardaExternalId(sb, opts.edicaoId, externalId, antes);
  if (violacaoId) return falha(violacaoId, "Crónica FredericoCarvalho.pt: actualização bloqueada");

  await registar(
    sb,
    opts.quem ?? null,
    `Crónica FredericoCarvalho.pt: actualização pedida (#${antes.id})`,
    preview.artigo.title,
  );
  await gravarDestino(opts.edicaoId, "cronica", { estado: "pendente", erro: null }, sb);

  // Slug e estado ficam de fora do corpo: o URL público não muda.
  const corpo: Record<string, unknown> = {
    title: preview.artigo.title,
    content: preview.artigo.content,
    excerpt: preview.artigo.excerpt,
    categories: [categoria.id],
  };

  const reporErro = async (mensagem: string, accao: string) => {
    await gravarDestino(
      opts.edicaoId,
      "cronica",
      { estado: "erro", erro: mensagem, external_id: externalId },
      sb,
    );
    return falha(mensagem, accao);
  };

  try {
    const r = await pedido(cfg, `${cfg.postType}/${externalId}`, { method: "PUT", body: corpo });
    if (!r.ok) {
      return reporErro(
        `WordPress [${r.status}]: ${r.body?.message ?? "resposta sem detalhe"}`,
        "Crónica FredericoCarvalho.pt: actualização falhou",
      );
    }

    // 2) Confirmação por leitura do mesmo ID.
    const depois = await lerArtigo(cfg, externalId);
    if (!depois) {
      return reporErro(
        "Escrita aceite mas não foi possível reler o artigo.",
        "Crónica FredericoCarvalho.pt: confirmação falhou",
      );
    }
    if (String(depois.id) !== String(antes.id) || depois.slug !== antes.slug) {
      return reporErro(
        `Identidade do artigo mudou inesperadamente (#${antes.id}/${antes.slug} → #${depois.id}/${depois.slug}).`,
        "Crónica FredericoCarvalho.pt: confirmação falhou",
      );
    }
    if (depois.status !== "publish") {
      return reporErro(
        `O artigo deixou de estar publicado (${depois.status}).`,
        "Crónica FredericoCarvalho.pt: confirmação falhou",
      );
    }

    const url = depois.link ?? antes.link ?? null;

    // 3) SEO — só se o Rank Math oferecer contrato de escrita declarado.
    let seo: ResultadoSeo | null = null;
    const rankmath = await auditarRankMath(cfg);
    if (rankmath.escritaSuportada && url) {
      seo = await escreverSeoCronica(cfg, externalId, {
        title: depois.titulo || preview.artigo.title,
        description: metaDescriptionArtigo(preview.artigo.excerpt),
        canonical: url,
      });
      await registar(
        sb,
        opts.quem ?? null,
        seo.ok
          ? `Crónica FredericoCarvalho.pt: SEO actualizado (#${depois.id})`
          : `Crónica FredericoCarvalho.pt: SEO não actualizado (#${depois.id})`,
        seo.mensagem,
      );
    }

    await gravarDestino(
      opts.edicaoId,
      "cronica",
      {
        estado: "publicada",
        url,
        external_id: externalId,
        erro: null,
        titulo: depois.titulo,
        slug: depois.slug,
        categoria: categoria.nome,
        hash_publicado: await impressaoArtigo(preview.artigo),
        actualizado_em: new Date().toISOString(),
        ...(seo?.ok ? { seo: seo.escrito.join(", ") } : {}),
      },
      sb,
    );
    if (url) {
      await sb
        .from("nl_revista_edicao")
        .upsert({ edicao_id: opts.edicaoId, cronica_url: url }, { onConflict: "edicao_id" });
    }
    await registar(
      sb,
      opts.quem ?? null,
      `Crónica FredericoCarvalho.pt: actualização confirmada (#${depois.id})`,
      url ?? undefined,
    );

    return {
      ok: true,
      url,
      externalId,
      operacao: "actualizar",
      wpStatus: depois.status,
      confirmacao: depois,
      seo,
      mensagem: seo?.ok
        ? `Artigo #${depois.id} actualizado, com SEO escrito.`
        : `Artigo #${depois.id} actualizado em FredericoCarvalho.pt.`,
    };
  } catch (e) {
    return reporErro(
      (e as Error)?.message ?? "Falha inesperada",
      "Crónica FredericoCarvalho.pt: actualização falhou",
    );
  }
}

/* ─────────── reconciliação do hash ─────────── */

export interface ResultadoReconciliacao {
  ok: boolean;
  /** `true` quando o hash foi reescrito sem tocar no WordPress. */
  reconciliado: boolean;
  diferencas: DiferencaArtigo[];
  externalId: string | number | null;
  hash: string | null;
  mensagem: string;
}

/**
 * Reconcilia `destinos.cronica.hash_publicado` quando a regra de integridade
 * mudou mas o artigo remoto já contém a versão canónica.
 *
 * Nunca escreve no WordPress: só lê. Se existir qualquer diferença editorial
 * real, recusa e devolve o relatório — o caminho correcto é «Actualizar artigo».
 */
export async function reconciliarHashCronica(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<ResultadoReconciliacao> {
  const sb = admin();
  const recusa = async (mensagem: string, diferencas: DiferencaArtigo[] = []): Promise<ResultadoReconciliacao> => {
    await registar(sb, opts.quem ?? null, "Crónica FredericoCarvalho.pt: reconciliação recusada", mensagem);
    return { ok: false, reconciliado: false, diferencas, externalId: null, hash: null, mensagem };
  };

  const preview = await construirArtigoCronica(opts.edicaoId);
  const externalId = preview.externalId;
  if (!externalId) return recusa("Ainda não existe artigo publicado para reconciliar.");
  if (preview.problemas.length) return recusa(preview.problemas.join(" "));

  const cfg = await lerConfig(sb);
  const auth = await verificarAutenticacao(cfg);
  if (!auth.ok) return recusa(auth.mensagem);
  const categoria = await resolverCategoriaCronicas(cfg, sb);
  if (!categoria.ok || !categoria.id) return recusa(categoria.mensagem);

  // 1) Preflight — identidade, estado e proveniência do artigo remoto.
  const remoto = await lerArtigo(cfg, externalId);
  if (!remoto) return recusa(`Artigo #${externalId} não foi encontrado em FredericoCarvalho.pt.`);
  if (remoto.status !== "publish") {
    return recusa(`O artigo #${remoto.id} está em ${remoto.status}; a reconciliação só se aplica a artigos publicados.`);
  }
  const violacao = await guardaExternalId(sb, opts.edicaoId, externalId, remoto);
  if (violacao) return recusa(violacao);

  // 2) Comparação semântica antes de qualquer escrita.
  const diferencas = compararArtigoRemoto(
    preview.artigo,
    { titulo: remoto.titulo, excerpt: remoto.excerpt, conteudo: remoto.conteudo, categorias: remoto.categorias },
    { categoriaId: categoria.id },
  );
  if (diferencas.length) {
    return {
      ok: false,
      reconciliado: false,
      diferencas,
      externalId,
      hash: null,
      mensagem:
        `Existem diferenças editoriais reais (${diferencas.map((d) => d.campo).join(", ")}). ` +
        "Usa «Actualizar artigo» — a reconciliação não escreve no site.",
    };
  }

  // 3) Só o hash muda. Nenhum PUT é feito.
  const hash = await impressaoArtigo(preview.artigo);
  await gravarDestino(
    opts.edicaoId,
    "cronica",
    {
      estado: "publicada",
      erro: null,
      external_id: externalId,
      url: remoto.link ?? undefined,
      slug: remoto.slug,
      titulo: remoto.titulo,
      categoria: categoria.nome,
      hash_publicado: hash,
      actualizado_em: new Date().toISOString(),
    },
    sb,
  );
  await registar(
    sb,
    opts.quem ?? null,
    "Hash da publicação reconciliado após alteração da regra de integridade",
    `Artigo #${externalId} — conteúdo remoto já correspondia ao canónico.`,
  );

  return {
    ok: true,
    reconciliado: true,
    diferencas: [],
    externalId,
    hash,
    mensagem: "Conteúdo remoto já corresponde ao conteúdo canónico; reconciliação necessária apenas por alteração da versão do hash.",
  };
}
