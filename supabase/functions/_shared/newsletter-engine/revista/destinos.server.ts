import process from "node:process";
// Destinos de publicação da Revista — orquestração server-side.
//
// Uma edição Revista produz quatro outputs. Este módulo é o único sítio onde
// se lê e escreve o estado de cada um; o cliente só pede acções e mostra
// resultados. Nunca contém credenciais: as futuras integrações externas lêem
// secrets dentro dos handlers.
//
//   email    → estado derivado das colunas já existentes (não duplicado aqui)
//   web      → página pública própria, /edicoes/:numero (canónica)
//   cronica  → artigo autónomo em FredericoCarvalho.pt (por agora, URL manual)
//   backup   → Lição no WordPress actual (nunca bloqueante)

import { mensagemErroBackup } from "./erro-backup.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import { construirPayloadArtigo, impressaoArtigo } from "./artigo-cronica.ts";

export type EstadoWeb = "preparada" | "publica" | "erro" | "por_preparar";
export type EstadoCronica =
  | "nao_configurada"
  | "manual"
  | "pendente"
  | "rascunho"
  | "publicada"
  | "desactualizada"
  | "erro";
export type EstadoBackup =
  /** faltam mesmo as credenciais WordPress */
  | "nao_configurado"
  /** configurado, mas a edição ainda não tem fotografia preparada */
  | "pronto"
  /** edição preparada, backup ainda por escrever */
  | "aguardar"
  | "guardado"
  | "erro";
export type EstadoEmail = "nao_enviado" | "agendado" | "parcial" | "enviado" | "erro";

export interface DestinoEstado {
  estado: string;
  url: string | null;
  /** ID no sistema externo — base da idempotência (nunca substituído pelo número). */
  external_id: string | number | null;
  erro: string | null;
  tentado_em: string | null;
  publicado_em?: string | null;
  /** Última actualização confirmada do artigo externo. */
  actualizado_em?: string | null;
  /** Impressão digital do conteúdo escrito na última sincronização. */
  hash_publicado?: string | null;
  /** Resumo do último SEO escrito (nunca credenciais). */
  seo?: string | null;
  /** Metadados do artigo externo — só informativos, nunca credenciais. */
  titulo?: string | null;
  slug?: string | null;
  categoria?: string | null;
}


export interface DestinosEdicao {
  email: { estado: EstadoEmail; url: null; external_id: null; erro: string | null; tentado_em: string | null };
  web: DestinoEstado & { estado: EstadoWeb };
  cronica: DestinoEstado & { estado: EstadoCronica };
  backup: DestinoEstado & { estado: EstadoBackup };
}

const VAZIO: DestinoEstado = { estado: "", url: null, external_id: null, erro: null, tentado_em: null, publicado_em: null };


export const BASE_URL_PADRAO = "https://edicoes.digitalsprint.pt";

/** Há credenciais WordPress? Lido só no servidor, nunca devolvido ao cliente. */
function wordpressConfigurado(): boolean {
  const has = (v: string | undefined) => !!(v && v.trim().length > 0);
  return (
    has(process.env.WORDPRESS_SITE_URL) &&
    has((process.env.WORDPRESS_APP_USER || process.env.wordpress_site_username)) &&
    has((process.env.WORDPRESS_APP_PASSWORD || process.env.wordpress_site_key))
  );
}

function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/* ─────────── URL canónica ─────────── */

/** Caminho estável e permanente da edição pública. Nunca inclui domínio. */
export function caminhoCanonicoEdicao(numero: number): string {
  return `/edicoes/${numero}`;
}

/** Base configurável das edições públicas (`configuracoes.edicoes_base_url`). */
export async function baseUrlEdicoes(sb?: SupabaseClient): Promise<string> {
  const db = sb ?? admin();
  const { data } = await db
    .from("nl_configuracoes")
    .select("valor")
    .eq("chave", "edicoes_base_url")
    .maybeSingle();
  const v = ((data as { valor: string | null } | null)?.valor ?? "").trim();
  return (v || BASE_URL_PADRAO).replace(/\/+$/, "");
}

/** URL absoluta canónica — só resolvida onde é mesmo precisa (email, OG). */
export async function urlCanonicaEdicao(numero: number, sb?: SupabaseClient): Promise<string> {
  return `${await baseUrlEdicoes(sb)}${caminhoCanonicoEdicao(numero)}`;
}

/* ─────────── leitura/escrita do estado ─────────── */

function normalizarDestino(v: unknown, estadoPadrao: string): DestinoEstado {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    estado: typeof o.estado === "string" && o.estado ? o.estado : estadoPadrao,
    url: typeof o.url === "string" && o.url.trim() ? o.url.trim() : null,
    external_id:
      typeof o.external_id === "string" || typeof o.external_id === "number" ? o.external_id : null,
    erro: typeof o.erro === "string" && o.erro ? o.erro : null,
    tentado_em: typeof o.tentado_em === "string" && o.tentado_em ? o.tentado_em : null,
    publicado_em: typeof o.publicado_em === "string" && o.publicado_em ? o.publicado_em : null,
    actualizado_em: typeof o.actualizado_em === "string" && o.actualizado_em ? o.actualizado_em : null,
    hash_publicado: typeof o.hash_publicado === "string" && o.hash_publicado ? o.hash_publicado : null,
    seo: typeof o.seo === "string" && o.seo ? o.seo : null,
    titulo: typeof o.titulo === "string" && o.titulo ? o.titulo : null,
    slug: typeof o.slug === "string" && o.slug ? o.slug : null,
    categoria: typeof o.categoria === "string" && o.categoria ? o.categoria : null,
  };
}

interface LinhaEdicao {
  numero: number;
  estado: string;
  enviada_em: string | null;
  envio_em_curso: string | null;
  agendamento_estado: string | null;
  agendamento_erro: string | null;
  agendado_para: string | null;
  wordpress_post_id: number | null;
  wordpress_post_url: string | null;
  revista_snapshot: unknown;
  destinos: unknown;
}

const SELECT_EDICAO =
  "numero, estado, enviada_em, envio_em_curso, agendamento_estado, agendamento_erro, agendado_para, " +
  "wordpress_post_id, wordpress_post_url, revista_snapshot, destinos";

function estadoEmail(l: LinhaEdicao): { estado: EstadoEmail; erro: string | null; tentado_em: string | null } {
  if (l.agendamento_estado === "erro" || l.agendamento_erro) {
    return { estado: "erro", erro: l.agendamento_erro, tentado_em: l.agendado_para };
  }
  if (l.estado === "enviada" || l.enviada_em) {
    return { estado: "enviado", erro: null, tentado_em: l.enviada_em };
  }
  if (l.agendamento_estado === "agendado" && l.agendado_para) {
    return { estado: "agendado", erro: null, tentado_em: l.agendado_para };
  }
  if (l.envio_em_curso) return { estado: "parcial", erro: null, tentado_em: l.envio_em_curso };
  return { estado: "nao_enviado", erro: null, tentado_em: null };
}


/**
 * Impressão digital do conteúdo editorial actual da crónica.
 *
 * Construída exactamente com o mesmo payload que a publicação escreve, para
 * que a comparação seja de conteúdo e não de formato.
 */
export async function impressaoCronicaActual(
  edicaoId: string,
  sb?: SupabaseClient,
): Promise<string | null> {
  const db = sb ?? admin();
  const { lerCronicaCanonica } = await import("./cronica-canonica.server.ts");
  const fonte = await lerCronicaCanonica(db, edicaoId);
  if (!fonte.corpoHtml && !fonte.titulo) return null;
  const categoria = ((await db
    .from("nl_configuracoes")
    .select("valor")
    .eq("chave", "frederico_wp_categoria")
    .maybeSingle()).data as { valor?: string | null } | null)?.valor ?? null;
  const artigo = construirPayloadArtigo(fonte, {
    status: "publish",
    categoria: (categoria ?? "").trim() || null,
    destinoEdicaoId: edicaoId,
  });
  return impressaoArtigo(artigo);
}

/** Estado consolidado dos quatro destinos de uma edição Revista. */
export async function estadoDestinos(edicaoId: string): Promise<DestinosEdicao> {
  const sb = admin();
  const [{ data: edRaw }, { data: cfgRaw }] = await Promise.all([
    sb.from("nl_edicoes").select(SELECT_EDICAO).eq("id", edicaoId).maybeSingle(),
    sb.from("nl_revista_edicao").select("cronica_url").eq("edicao_id", edicaoId).maybeSingle(),
  ]);
  const l = (edRaw ?? {}) as LinhaEdicao;
  const guardado = (l.destinos && typeof l.destinos === "object" ? l.destinos : {}) as Record<string, unknown>;

  const snap = l.revista_snapshot as { estado?: string; url_web?: string; url_web_path?: string } | null;
  const web = normalizarDestino(guardado.web, "por_preparar");
  // A publicação web é independente do envio: `publica` é escrito no
  // momento em que a página passa a ser servida, antes do email.
  if (snap?.estado === "bloqueado" && l.estado === "enviada") web.estado = "publica";
  else if (snap && web.estado !== "erro" && web.estado !== "publica") web.estado = "preparada";
  else if (!snap && web.estado === "publica") web.estado = "por_preparar";
  web.url = snap?.url_web_path ?? snap?.url_web ?? web.url ?? caminhoCanonicoEdicao(l.numero);

  const cronicaUrl = ((cfgRaw as { cronica_url?: string } | null)?.cronica_url ?? "").trim();
  const cronica = normalizarDestino(guardado.cronica, "nao_configurada");
  cronica.url = cronicaUrl || cronica.url;
  if (
    cronica.estado !== "erro" &&
    cronica.estado !== "pendente" &&
    cronica.estado !== "rascunho" &&
    cronica.estado !== "publicada"
  ) {
    // «manual» = URL colada à mão; «rascunho»/«publicada» só o publisher escreve.
    cronica.estado = cronicaUrl ? "manual" : "nao_configurada";
  }

  // Artigo publicado + conteúdo editorial alterado desde a última escrita.
  // Sem impressão guardada (artigos anteriores a esta fase) assume-se
  // sincronizado: mais vale nada dizer do que dar um falso alarme.
  if (cronica.estado === "publicada" && cronica.hash_publicado) {
    const actual = await impressaoCronicaActual(edicaoId, sb);
    if (actual && actual !== cronica.hash_publicado) cronica.estado = "desactualizada";
  }



  // Estado do backup: distingue «sem credenciais» de «configurado mas ainda
  // nunca executado para esta edição». Só o estado «erro» oferece retry.
  const backup = normalizarDestino(guardado.backup, "pronto");
  if (l.wordpress_post_id) {
    backup.external_id = backup.external_id ?? l.wordpress_post_id;
    backup.url = backup.url ?? l.wordpress_post_url;
  }
  if (!wordpressConfigurado()) {
    backup.estado = "nao_configurado";
  } else if (backup.estado !== "erro") {
    backup.estado = l.wordpress_post_id ? "guardado" : snap ? "aguardar" : "pronto";
  }

  const email = estadoEmail(l);

  return {
    email: { ...email, url: null, external_id: null },
    web: web as DestinosEdicao["web"],
    cronica: cronica as DestinosEdicao["cronica"],
    backup: backup as DestinosEdicao["backup"],
  };
}

/** Grava o estado de um destino sem tocar nos restantes. */
export async function gravarDestino(
  edicaoId: string,
  chave: "web" | "cronica" | "backup",
  patch: Partial<DestinoEstado>,
  sb?: SupabaseClient,
): Promise<void> {
  const db = sb ?? admin();
  const { data } = await db.from("nl_edicoes").select("destinos").eq("id", edicaoId).maybeSingle();
  const actual = ((data as { destinos?: unknown } | null)?.destinos ?? {}) as Record<string, unknown>;
  const anterior = normalizarDestino(actual[chave], VAZIO.estado);
  const novo: DestinoEstado = { ...anterior, ...patch, tentado_em: patch.tentado_em ?? new Date().toISOString() };
  await db
    .from("nl_edicoes")
    .update({ destinos: { ...actual, [chave]: novo } })
    .eq("id", edicaoId);
}

async function registar(sb: SupabaseClient, quem: string | null, accao: string, detalhe?: string) {
  await sb.from("nl_audit_log").insert({ quem: quem ?? "sistema", accao, detalhe: detalhe ?? null });
}

/* ─────────── acções por destino ─────────── */

/**
 * URL manual do artigo da crónica em FredericoCarvalho.pt.
 * Não existe segunda URL: escreve no `revista_edicao.cronica_url` já usado
 * pelo composer, pela página pública e pelo verificador de links.
 */
export async function guardarUrlCronica(opts: {
  edicaoId: string;
  url: string;
  quem?: string | null;
}): Promise<{ ok: true; url: string }> {
  const url = opts.url.trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) {
    throw new Error("URL inválido — usa um endereço completo começado por https://");
  }
  const sb = admin();
  const { error } = await sb
    .from("nl_revista_edicao")
    .upsert({ edicao_id: opts.edicaoId, cronica_url: url }, { onConflict: "edicao_id" });
  if (error) throw new Error(error.message);

  await gravarDestino(
    opts.edicaoId,
    "cronica",
    { estado: url ? "manual" : "nao_configurada", url: url || null, erro: null },
    sb,
  );
  await registar(
    sb,
    opts.quem ?? null,
    url ? "Crónica externa: URL guardado" : "Crónica externa: URL removido",
    url || undefined,
  );
  return { ok: true, url };
}

/**
 * Cópia de segurança em DigitalSprint.pt. Nunca lança: uma falha aqui não
 * pode impedir os subscritores de receberem uma edição pronta.
 * Idempotente — actualiza a mesma Lição quando já existe `wordpress_post_id`.
 */
export async function criarBackup(opts: {
  edicaoId: string;
  quem?: string | null;
}): Promise<{ ok: boolean; url: string | null; mensagem: string }> {
  const sb = admin();
  try {
    const { publicarWordpress } = await import("../envio.server.ts");
    const { data: edRaw } = await sb
      .from("nl_edicoes")
      .select("numero")
      .eq("id", opts.edicaoId)
      .maybeSingle();
    const numero = (edRaw as { numero: number } | null)?.numero ?? 0;
    const canonical = await urlCanonicaEdicao(numero, sb);
    const r = await publicarWordpress({
      edicaoId: opts.edicaoId,
      quemNome: opts.quem ?? "sistema",
      // Contingência, não segunda página pública: privada e, se o WordPress
      // aceitar meta, apontada à canónica /edicoes/:numero.
      status: "private",
      meta: { rank_math_robots: ["noindex"], rank_math_canonical_url: canonical },
    });
    // Numa actualização o WordPress não devolve URL: manter a que já existe
    // em vez de a apagar (o painel deixaria de ter ligação para a cópia).
    const patch: Partial<DestinoEstado> = { estado: "guardado", external_id: r.post_id, erro: null };
    if (r.post_url) patch.url = r.post_url;
    await gravarDestino(opts.edicaoId, "backup", patch, sb);
    return { ok: true, url: r.post_url || null, mensagem: r.mensagem };
  } catch (e) {
    const mensagem = mensagemErroBackup(e);
    const err = e as Error & { cause?: unknown };
    const tecnico = [err?.name, err?.message, err?.cause ? String((err.cause as Error)?.message ?? err.cause) : ""]
      .filter(Boolean)
      .join(" · ");
    await gravarDestino(opts.edicaoId, "backup", { estado: "erro", erro: mensagem }, sb);
    await registar(sb, opts.quem ?? null, "Backup DigitalSprint.pt falhou", tecnico || mensagem);
    return { ok: false, url: null, mensagem };
  }
}

/** Retry individual. Nunca reenvia email nem recria o snapshot bloqueado. */
export async function repetirDestino(opts: {
  edicaoId: string;
  destino: "backup";
  quem?: string | null;
}): Promise<{ ok: boolean; mensagem: string }> {
  if (opts.destino !== "backup") throw new Error("Destino sem retry automático nesta fase.");
  const r = await criarBackup({ edicaoId: opts.edicaoId, quem: opts.quem });
  return { ok: r.ok, mensagem: r.mensagem };
}
