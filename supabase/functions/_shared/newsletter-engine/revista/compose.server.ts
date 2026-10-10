import process from "node:process";
// Composição do formato Revista — FONTE ÚNICA DE VERDADE.
//
// `composeRevistaEdition()` devolve a estrutura final da edição e alimenta,
// sem lógica paralela: pré-visualização, HTML de email, versão web
// («Ver no browser»), texto simples e envio.
//
// O sistema Clássico não passa por aqui.

import { excertoDaCronica } from "./sequencia-cronica.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { CATEGORIAS } from "../design-tokens.server.ts";
import { carregarNoticiasDaEdicao, type NoticiaDaEdicao } from "./universo.ts";
import { caminhoCanonicoEdicao, urlCanonicaEdicao } from "./destinos.server.ts";
import { POSICAO_FIM } from "./sequencia-cronica.ts";
import { LIMITES_REVISTA, ROTULOS_REVISTA } from "./rotulos.ts";
import { ligacoesBriefsDaEdicao, type LigacaoBrief } from "./brief/publicacao.server.ts";
import { htmlEditorialInline, htmlEditorialSeguro, textoDeHtmlEditorial } from "./html-restrito.ts";

export type { LigacaoBrief };

export interface RevistaConfigRow {
  preheader: string;
  promocao_activa: boolean;
  promocao_prefixo: string;
  promocao_link_texto: string;
  promocao_url: string;
  cronica_titulo: string;
  cronica_subtitulo: string;
  cronica_lede: string;
  cronica_excerto: string;
  cronica_url: string;
  momento_activo: boolean;
  momento_etiqueta: string;
  momento_valor: string;
  momento_descricao: string;
  pull_quote: string;
  momento_posicao: number;
  pull_quote_posicao: number;
  cronica_lede_posicao: number;
  cronica_imagem_url: string;
  cronica_imagem_alt: string;
  cronica_imagem_credito: string;
  cronica_imagem_credito_url: string;
  cronica_imagem_fonte: string;
  cronica_imagem_posicao: number;
  cronica_imagem_recorte_url: string;

  recomendacao_tipo: string;
  recomendacao_meta: string;
  recomendacao_titulo: string;
  recomendacao_subtitulo: string;
  recomendacao_url: string;
  recomendacao_nota: string;
  recomendacao_activa: boolean;
  bloco_ferramentas: boolean;
  podcast_activo: boolean;
  podcast_etiqueta: string;
  podcast_programa: string;
  podcast_tema: string;
  podcast_convidado: string;
  podcast_pergunta: string;
  podcast_url: string;
  podcast_cta: string;
  livro_activo: boolean;
  livro_etiqueta: string;
  livro_titulo: string;
  livro_texto: string;
  livro_cta: string;
  livro_url: string;
  servicos_activo: boolean;
  servicos_cursos_activo: boolean;
  servicos_consultoria_activo: boolean;
  servicos_auditoria_activo: boolean;
  servicos_titulo: string;
  servicos_intro: string;
  servicos_cta: string;
  servicos_url: string;
  servicos_consultoria_texto: string;
  servicos_consultoria_cta: string;
  servicos_consultoria_url: string;
  servicos_cursos_texto: string;
  servicos_cursos_cta: string;
  servicos_cursos_url: string;
}

export const REVISTA_CONFIG_VAZIA: RevistaConfigRow = {
  preheader: "",
  promocao_activa: true,
  promocao_prefixo: "Novo curso",
  promocao_link_texto: "Curso de inteligência artificial",
  promocao_url: "https://fredericocarvalho.pt/curso-de-inteligencia-artificial/",
  cronica_titulo: "",
  cronica_subtitulo: "",
  cronica_lede: "",
  cronica_excerto: "",
  cronica_url: "",
  momento_activo: false,
  momento_etiqueta: "O número da semana",
  momento_valor: "",
  momento_descricao: "",
  pull_quote: "",
  momento_posicao: POSICAO_FIM,
  pull_quote_posicao: POSICAO_FIM,
  cronica_lede_posicao: 0,
  cronica_imagem_url: "",
  cronica_imagem_alt: "",
  cronica_imagem_credito: "",
  cronica_imagem_credito_url: "",
  cronica_imagem_fonte: "",
  cronica_imagem_posicao: -1,
  cronica_imagem_recorte_url: "",

  recomendacao_tipo: "",
  recomendacao_meta: "",
  recomendacao_titulo: "",
  recomendacao_subtitulo: "",
  recomendacao_url: "",
  recomendacao_nota: "",
  recomendacao_activa: true,
  bloco_ferramentas: false,
  podcast_activo: false,
  podcast_etiqueta: "Podcast semanal",
  podcast_programa: "",
  podcast_tema: "",
  podcast_convidado: "",
  podcast_pergunta: "",
  podcast_url: "",
  podcast_cta: "Ouvir o episódio",
  livro_activo: false,
  livro_etiqueta: "Para aprofundar · Livro",
  livro_titulo: "",
  livro_texto: "",
  livro_cta: "Conhecer o livro",
  livro_url: "",
  servicos_activo: false,
  servicos_cursos_activo: false,
  servicos_consultoria_activo: false,
  servicos_auditoria_activo: false,
  servicos_titulo: "Como te posso ajudar",
  servicos_intro: "",
  servicos_cta: "Pedir uma auditoria digital",
  servicos_url: "",
  servicos_consultoria_texto: "",
  servicos_consultoria_cta: "Conhecer a consultoria",
  servicos_consultoria_url: "",
  servicos_cursos_texto: "",
  servicos_cursos_cta: "Explorar cursos e formação",
  servicos_cursos_url: "",
};

export interface DestaqueRevista {
  itemId: string;
  noticiaId: string;
  titulo: string;
  url: string;
  categoria: string;
  categoriaRotulo: string;
  resumoFactual: string;
  minhaLeitura: string;
  /** Rótulo do botão desta notícia («Ler o anúncio», «Consultar a documentação»…). */
  ctaRotulo: string;
  /** Data da notícia, para a linha «categoria · data». */
  data: string | null;
  /** Brief público congelado desta peça (Fase 3B). Ausente = comportamento anterior. */
  brief?: LigacaoBrief;
}

export interface RadarRevista {
  itemId: string;
  noticiaId: string;
  titulo: string;
  url: string;
  categoria: string;
  categoriaRotulo: string;
  /** Linha curta de contexto sob o título. */
  nota: string;
  /** Quick Brief público congelado desta peça (Fase 3B). */
  brief?: LigacaoBrief;
}

export interface FerramentaRevista {
  nome: string;
  descricao: string;
  url: string;
  /** Cor editorial escolhida para o cartão. */
  cor?: string;
  /** Etiqueta curta do cartão («Pesquisa», «Publicidade»…). */
  etiqueta: string;
  /** Rótulo do botão do cartão. */
  ctaRotulo: string;
}

export interface PodcastRevista {
  etiqueta: string;
  programa: string;
  tema: string;
  convidado: string;
  pergunta: string;
  url: string;
  cta: string;
}

export interface LivroRevista {
  etiqueta: string;
  titulo: string;
  texto: string;
  cta: string;
  url: string;
}

export interface ServicoRevista {
  rotulo: string;
  texto: string;
  cta: string;
  url: string;
  /** Cartão principal (fundo azul cheio) na grelha 2x2. */
  destaque?: boolean;
  /** «livro» quando o cartão é o livro integrado na grelha. */
  tipo?: "servico" | "livro";
}

export interface ServicosRevista {
  titulo: string;
  intro: string;
  cta: string;
  url: string;
  linhas: ServicoRevista[];
  /** Grelha 2x2 do modelo v4_2 (serviços + livro). */
  cartoes?: ServicoRevista[];
}

/** Notícia aprovada da edição, para a área completa da versão web. */
export interface AtualidadeRevista {
  noticiaId: string;
  titulo: string;
  descricao: string;
  url: string;
  categoria: string;
  categoriaRotulo: string;
  /** "destaque" | "radar" | "so_site" — papel derivado, nunca persistido. */
  papel: "destaque" | "radar" | "so_site";
}

export interface EdicaoRevista {
  edicao: {
    id: string;
    numero: number;
    assunto: string | null;
    data_envio_prevista: string | null;
    wordpress_post_url: string | null;
  };
  preheader: string;
  /** Aviso promocional compacto antes da crónica. Ausente em snapshots antigos. */
  promocao?: { prefixo: string; linkTexto: string; url: string } | null;
  cronica: { titulo: string; subtitulo: string; lede: string; excerto: string; url: string; /** URL só para pré-visualização (sem endereço da crónica). */ urlProvisoria?: boolean };
  momento: { etiqueta: string; valor: string; descricao: string } | null;
  pullQuote: string;
  /** Posições das peças móveis dentro da crónica (nº de parágrafos antes). */
  momentoPosicao: number;
  pullQuotePosicao: number;
  /** Posição da lede / tese editorial dentro da crónica. */
  ledePosicao: number;
  /** Imagem opcional da crónica (proporção 3:1). `null` quando não entra. */
  imagem: { url: string; alt: string; credito: string; creditoUrl: string; fonte: string; /** Faixa recortada a 556×200 (ausente em fotografias antigas). */ recortada?: boolean } | null;
  imagemPosicao: number;

  destaques: DestaqueRevista[];
  radar: RadarRevista[];
  recomendacao: { tipo: string; meta: string; titulo: string; tituloTexto: string; subtitulo: string; nota: string; url: string } | null;
  ferramentas: FerramentaRevista[];
  podcast: PodcastRevista | null;
  livro: LivroRevista | null;
  servicos: ServicosRevista | null;
  /** Todas as notícias aprovadas da edição (email + só site) — usada na versão web. */
  atualidades: AtualidadeRevista[];
  /** Página web da edição (todas as atualidades seleccionadas). */
  urlPagina: string;
  /** Verdadeiro quando a estrutura vem do snapshot imutável de uma edição já fechada. */
  congelada?: boolean;
  /** Problemas de integridade — bloqueiam o envio quando existem. */
  problemas: string[];
}


function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Rótulo curto da categoria para «Novidades da semana» (sem emoji, sem parêntesis). */
export function rotuloCategoria(id: string): string {
  const def = CATEGORIAS.find((c) => c.id === id);
  const nome = def?.nome ?? id;
  return nome.split("(")[0].split("&")[0].trim();
}

export function limparTituloRevista(s: string): string {
  const re = /^(?:[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u2300-\u23FF\u2B00-\u2BFF\uFE0F\u200D]+[\s\p{P}]*)+/u;
  return (s ?? "").replace(re, "").trimStart();
}

export function normalizarConfigRevista(v: unknown): RevistaConfigRow {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const txt = (k: keyof RevistaConfigRow) =>
    typeof o[k] === "string" ? (o[k] as string) : (REVISTA_CONFIG_VAZIA[k] as string);
  const num = (k: keyof RevistaConfigRow) =>
    typeof o[k] === "number" && Number.isFinite(o[k] as number)
      ? Math.round(o[k] as number)
      : (REVISTA_CONFIG_VAZIA[k] as number);
  return {
    ...REVISTA_CONFIG_VAZIA,
    preheader: txt("preheader"),
    promocao_activa: o.promocao_activa !== false,
    promocao_prefixo: txt("promocao_prefixo") || REVISTA_CONFIG_VAZIA.promocao_prefixo,
    promocao_link_texto: txt("promocao_link_texto") || REVISTA_CONFIG_VAZIA.promocao_link_texto,
    promocao_url: txt("promocao_url") || REVISTA_CONFIG_VAZIA.promocao_url,
    cronica_titulo: txt("cronica_titulo"),
    cronica_subtitulo: txt("cronica_subtitulo"),
    cronica_lede: txt("cronica_lede"),
    cronica_excerto: txt("cronica_excerto"),
    cronica_url: txt("cronica_url"),
    momento_activo: o.momento_activo === true,
    momento_etiqueta: txt("momento_etiqueta") || REVISTA_CONFIG_VAZIA.momento_etiqueta,
    momento_valor: txt("momento_valor"),
    momento_descricao: txt("momento_descricao"),
    pull_quote: txt("pull_quote"),
    momento_posicao: num("momento_posicao"),
    pull_quote_posicao: num("pull_quote_posicao"),
    cronica_lede_posicao: num("cronica_lede_posicao"),
    cronica_imagem_url: txt("cronica_imagem_url"),
    cronica_imagem_alt: txt("cronica_imagem_alt"),
    cronica_imagem_credito: txt("cronica_imagem_credito"),
    cronica_imagem_credito_url: txt("cronica_imagem_credito_url"),
    cronica_imagem_fonte: txt("cronica_imagem_fonte"),
    cronica_imagem_posicao: num("cronica_imagem_posicao"),
    cronica_imagem_recorte_url: txt("cronica_imagem_recorte_url"),

    recomendacao_tipo: txt("recomendacao_tipo"),
    recomendacao_meta: txt("recomendacao_meta"),
    recomendacao_titulo: txt("recomendacao_titulo"),
    recomendacao_subtitulo: txt("recomendacao_subtitulo"),
    recomendacao_url: txt("recomendacao_url"),
    recomendacao_nota: txt("recomendacao_nota"),
    recomendacao_activa: o.recomendacao_activa !== false,
    bloco_ferramentas: o.bloco_ferramentas === true,
    podcast_activo: o.podcast_activo === true,
    podcast_etiqueta: txt("podcast_etiqueta") || REVISTA_CONFIG_VAZIA.podcast_etiqueta,
    podcast_programa: txt("podcast_programa"),
    podcast_tema: txt("podcast_tema"),
    podcast_convidado: txt("podcast_convidado"),
    podcast_pergunta: txt("podcast_pergunta"),
    podcast_url: txt("podcast_url"),
    podcast_cta: txt("podcast_cta") || REVISTA_CONFIG_VAZIA.podcast_cta,
    livro_activo: o.livro_activo === true,
    livro_etiqueta: txt("livro_etiqueta") || REVISTA_CONFIG_VAZIA.livro_etiqueta,
    livro_titulo: txt("livro_titulo"),
    livro_texto: txt("livro_texto"),
    livro_cta: txt("livro_cta") || REVISTA_CONFIG_VAZIA.livro_cta,
    livro_url: txt("livro_url"),
    servicos_activo: o.servicos_activo === true,
    servicos_cursos_activo: typeof o.servicos_cursos_activo === "boolean"
      ? o.servicos_cursos_activo
      : o.servicos_activo === true,
    servicos_consultoria_activo: typeof o.servicos_consultoria_activo === "boolean"
      ? o.servicos_consultoria_activo
      : o.servicos_activo === true,
    servicos_auditoria_activo: typeof o.servicos_auditoria_activo === "boolean"
      ? o.servicos_auditoria_activo
      : o.servicos_activo === true,
    servicos_titulo: txt("servicos_titulo") || REVISTA_CONFIG_VAZIA.servicos_titulo,
    servicos_intro: txt("servicos_intro"),
    servicos_cta: txt("servicos_cta") || REVISTA_CONFIG_VAZIA.servicos_cta,
    servicos_url: txt("servicos_url"),
    servicos_consultoria_texto: txt("servicos_consultoria_texto"),
    servicos_consultoria_cta: txt("servicos_consultoria_cta") || REVISTA_CONFIG_VAZIA.servicos_consultoria_cta,
    servicos_consultoria_url: txt("servicos_consultoria_url"),
    servicos_cursos_texto: txt("servicos_cursos_texto"),
    servicos_cursos_cta: txt("servicos_cursos_cta") || REVISTA_CONFIG_VAZIA.servicos_cursos_cta,
    servicos_cursos_url: txt("servicos_cursos_url"),
  };
}

interface ItemRow {
  id: string;
  noticia_id: string;
  papel: string;
  ordem: number;
  titulo_override: string | null;
  resumo_factual: string;
  minha_leitura: string;
  cta_rotulo: string | null;
  radar_nota: string | null;
}

interface NoticiaRow {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  url_curto: string | null;
  categoria: string;
  created_at?: string | null;
}

/** Preheader efectivo: o definido no editor ou, em falta, o lede da crónica. */
export function preheaderRevista(cfg: RevistaConfigRow): string {
  const base = cfg.preheader.trim() || cfg.cronica_lede.trim() || cfg.cronica_titulo.trim();
  const texto = base || "Curadoria semanal de marketing e tecnologia, por Frederico Carvalho.";
  return texto.length > 150 ? `${texto.slice(0, 147).trimEnd()}…` : texto;
}

/** Destino do botão «Ler a crónica completa» enquanto não há endereço da crónica. */
export const URL_CRONICA_PROVISORIA = "https://fredericocarvalho.pt/";

export function validarRevista(e: EdicaoRevista): string[] {
  const p: string[] = [];
  if (!e.cronica.titulo.trim()) p.push("Falta o título da crónica.");
  if (!e.cronica.url.trim() || e.cronica.urlProvisoria) p.push("Falta o URL da crónica completa.");
  if (e.destaques.length < LIMITES_REVISTA.destaquesMin || e.destaques.length > LIMITES_REVISTA.destaquesMax) {
    p.push(`«${ROTULOS_REVISTA.destaques}» tem ${e.destaques.length} notícias (entre ${LIMITES_REVISTA.destaquesMin} e ${LIMITES_REVISTA.destaquesMax}).`);
  }
  e.destaques.forEach((d, i) => {
    if (!d.resumoFactual.trim()) p.push(`Falta o resumo factual da notícia ${i + 1}.`);
    if (!d.minhaLeitura.trim()) p.push(`Falta «A minha leitura» da notícia ${i + 1}.`);
    if (!d.url.trim()) p.push(`Falta o link da notícia ${i + 1}.`);
  });
  if (e.radar.length < LIMITES_REVISTA.radarMin) {
    p.push(`«${ROTULOS_REVISTA.radar}» tem ${e.radar.length} notícias (mínimo ${LIMITES_REVISTA.radarMin}).`);
  }
  e.radar.forEach((r, i) => {
    if (!r.url.trim()) p.push(`Falta o link da entrada ${i + 1} de «${ROTULOS_REVISTA.radar}».`);
  });
  const ids = new Set<string>();
  for (const n of [...e.destaques, ...e.radar]) {
    if (ids.has(n.noticiaId)) p.push(`Existe uma notícia repetida entre «${ROTULOS_REVISTA.destaques}» e «${ROTULOS_REVISTA.radar}».`);
    ids.add(n.noticiaId);
  }
  // Campos opcionais: ou ficam completos, ou ficam desligados.
  if (e.momento) {
    if (!e.momento.valor.trim()) p.push("O «número da semana» está ligado mas falta o valor.");
    if (!e.momento.descricao.trim()) p.push("O «número da semana» está ligado mas falta a descrição.");
    if (!e.momento.etiqueta.trim()) p.push("O «número da semana» está ligado mas falta a etiqueta.");
  }
  if (e.recomendacao) {
    if (!e.recomendacao.url.trim()) p.push("A recomendação da semana não tem link.");
    if (!e.recomendacao.tipo.trim()) p.push("A recomendação da semana não tem tipo (livro, podcast, artigo…).");
  }
  if (e.promocao && !e.promocao.url.trim()) p.push("A promoção de abertura não tem link.");
  if (!e.edicao.numero) p.push("Falta o número da edição.");
  if (!e.edicao.data_envio_prevista) p.push("Falta a data da edição.");
  if (e.imagem && !e.imagem.alt.trim()) p.push("A imagem da crónica não tem texto alternativo.");
  if (!e.preheader.trim()) p.push("Falta o preheader.");

  return p;
}

/* ─────────── snapshot ─────────── */

// 3: cada peça congela também título editorial, papel e ordem do Brief.
// As versões 1 e 2 continuam a ser lidas tal como estão.
export const SNAPSHOT_SCHEMA_VERSION = 3;
export const RENDERER_VERSION = "revista-v1";

/**
 * Fotografia da edição. Guarda os dados compostos (base de verdade editorial)
 * e também o artefacto efectivamente enviado (HTML e texto), para que futuras
 * alterações ao renderer não mudem reenvios nem auditorias.
 */
export interface SnapshotRevista {
  schema_version: number;
  renderer_version: string;
  /** «preparado» = determinístico mas reversível; «bloqueado» = imutável. */
  estado: "preparado" | "bloqueado";
  edicao: EdicaoRevista;
  email_html: string;
  email_text: string;
  url_web: string;
  /** Caminho canónico estável da edição pública (sem domínio). */
  url_web_path: string;
  preparado_em: string;
  bloqueado_em: string | null;
}

function normalizarEstrutura(e: EdicaoRevista): EdicaoRevista {
  return {
    ...e,
    // Não criar promoções retroactivamente em fotografias antigas.
    promocao: e.promocao ?? null,
    destaques: e.destaques ?? [],
    radar: e.radar ?? [],
    ferramentas: e.ferramentas ?? [],
    podcast: e.podcast ?? null,
    livro: e.livro ?? null,
    servicos: e.servicos ?? null,
    imagem: e.imagem ?? null,
    // A imagem entra sempre antes da lede (posição fixa no editor).
    imagemPosicao: -1,
    ledePosicao: e.ledePosicao ?? 0,

    atualidades: e.atualidades ?? [],
    problemas: [],
    congelada: true,
  };
}

/**
 * Interpreta o campo gravado. Snapshots antigos (objecto `EdicaoRevista` sem
 * envelope) são tratados como já bloqueados, sem artefacto preservado.
 */
export function lerEnvelope(v: unknown): SnapshotRevista | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.edicao && typeof o.edicao === "object" && "schema_version" in o) {
    const env = v as SnapshotRevista;
    return {
      schema_version: env.schema_version ?? SNAPSHOT_SCHEMA_VERSION,
      renderer_version: env.renderer_version ?? RENDERER_VERSION,
      estado: env.estado === "preparado" ? "preparado" : "bloqueado",
      edicao: normalizarEstrutura(env.edicao),
      email_html: typeof env.email_html === "string" ? env.email_html : "",
      email_text: typeof env.email_text === "string" ? env.email_text : "",
      url_web: typeof env.url_web === "string" ? env.url_web : "",
      url_web_path: typeof env.url_web_path === "string" && env.url_web_path
        ? env.url_web_path
        : caminhoCanonicoEdicao(env.edicao?.edicao?.numero ?? 0),
      preparado_em: env.preparado_em ?? "",
      bloqueado_em: env.bloqueado_em ?? null,
    };
  }
  // Formato legado: era o próprio `EdicaoRevista`.
  const legado = v as EdicaoRevista;
  if (!legado.edicao || !legado.cronica) return null;
  return {
    schema_version: 0,
    renderer_version: RENDERER_VERSION,
    estado: "bloqueado",
    edicao: normalizarEstrutura(legado),
    email_html: "",
    email_text: "",
    url_web: legado.urlPagina ?? "",
    url_web_path: caminhoCanonicoEdicao(legado.edicao?.numero ?? 0),
    preparado_em: "",
    bloqueado_em: null,
  };
}

/** Estrutura congelada gravada, se existir. */
function lerSnapshot(v: unknown): EdicaoRevista | null {
  return lerEnvelope(v)?.edicao ?? null;
}


/**
 * Estrutura final da edição Revista.
 *
 * Se já existir snapshot (edição fechada/enviada), é ele que manda: o
 * conteúdo histórico não muda quando as notícias forem editadas depois.
 * Passa `ignorarSnapshot` apenas para pré-visualizar o estado actual do editor.
 */
export async function composeRevistaEdition(
  edicaoId: string,
  opcoes?: { ignorarSnapshot?: boolean },
): Promise<EdicaoRevista> {
  const sb = admin();

  const [edRes, cfgRes, itRes, feRes, universo] = await Promise.all([
    sb.from("nl_edicoes")
      .select("id, numero, assunto, data_envio_prevista, wordpress_post_url, revista_snapshot")
      .eq("id", edicaoId).single(),
    sb.from("nl_revista_edicao").select("*").eq("edicao_id", edicaoId).maybeSingle(),
    sb.from("nl_revista_itens")
      .select("id, noticia_id, papel, ordem, titulo_override, resumo_factual, minha_leitura, cta_rotulo, radar_nota")
      .eq("edicao_id", edicaoId)
      .order("ordem", { ascending: true }),
    sb.from("nl_ferramentas_semana")
      .select("nome, descricao, url, posicao, etiqueta, cta_rotulo, cor")
      .eq("edicao_id", edicaoId)
      .order("posicao", { ascending: true }),
    // Universo único de notícias da edição (nunca todas as aprovadas do sistema).
    carregarNoticiasDaEdicao(sb as never, edicaoId),
  ]);

  if (edRes.error || !edRes.data) throw new Error("Edição não encontrada");

  if (!opcoes?.ignorarSnapshot) {
    const congelada = lerSnapshot((edRes.data as { revista_snapshot?: unknown }).revista_snapshot);
    if (congelada) return congelada;
  }

  const cfg = normalizarConfigRevista(cfgRes.data);
  const itens = (itRes.data ?? []) as ItemRow[];

  let noticias: NoticiaRow[] = [];
  if (itens.length) {
    const { data } = await sb.from("nl_noticias")
      .select("id, titulo, descricao, url, url_curto, categoria, created_at")
      .in("id", itens.map((i) => i.noticia_id));
    noticias = (data ?? []) as NoticiaRow[];
  }
  const porId = new Map(noticias.map((n) => [n.id, n]));

  // Briefs já publicados desta edição. Com o interruptor desligado, o mapa
  // vem vazio e tudo se comporta exactamente como antes da Fase 3B.
  const ligacoesBrief = await ligacoesBriefsDaEdicao(edicaoId, sb).catch(() => ({}) as Record<string, LigacaoBrief>);

  const destaques: DestaqueRevista[] = [];
  const radar: RadarRevista[] = [];
  for (const it of itens) {
    const n = porId.get(it.noticia_id);
    if (!n) continue;
    const titulo = limparTituloRevista(it.titulo_override?.trim() || n.titulo);
    const url = (n.url_curto?.trim() || n.url?.trim() || "");
    const brief = ligacoesBrief[n.id];
    if (it.papel === "destaque") {
      destaques.push({
        itemId: it.id, noticiaId: n.id, titulo, url,
        categoria: n.categoria, categoriaRotulo: rotuloCategoria(n.categoria),
        resumoFactual: (it.resumo_factual || n.descricao || "").trim(),
        minhaLeitura: (it.minha_leitura || "").trim(),
        ctaRotulo: (it.cta_rotulo || "").trim(),
        data: n.created_at ?? null,
        ...(brief && brief.tipo === "destaque" ? { brief } : {}),
      });
    } else {
      radar.push({
        itemId: it.id, noticiaId: n.id, titulo, url,
        categoria: n.categoria, categoriaRotulo: rotuloCategoria(n.categoria),
        nota: (it.radar_nota || "").trim(),
        ...(brief && brief.tipo === "radar" ? { brief } : {}),
      });
    }
  }

  const ferramentas: FerramentaRevista[] = cfg.bloco_ferramentas
    ? ((feRes.data ?? []) as Array<{
        nome: string | null; descricao: string | null; url: string | null;
        etiqueta?: string | null; cta_rotulo?: string | null; cor?: string | null;
      }>)
        .filter((f) => (f.nome ?? "").trim())
        .map((f) => ({
          nome: (f.nome ?? "").trim(),
          descricao: (f.descricao ?? "").trim(),
          url: (f.url ?? "").trim(),
          cor: (f.cor ?? "indigo").trim() || "indigo",
          etiqueta: (f.etiqueta ?? "").trim(),
          ctaRotulo: (f.cta_rotulo ?? "").trim(),
        }))
    : [];

  const podcast: PodcastRevista | null = cfg.podcast_activo && (cfg.podcast_tema.trim() || cfg.podcast_programa.trim())
    ? {
        etiqueta: cfg.podcast_etiqueta.trim(),
        programa: cfg.podcast_programa.trim(),
        tema: cfg.podcast_tema.trim(),
        convidado: cfg.podcast_convidado.trim(),
        pergunta: cfg.podcast_pergunta.trim(),
        url: cfg.podcast_url.trim(),
        cta: cfg.podcast_cta.trim() || "Ouvir o episódio",
      }
    : null;

  const livro: LivroRevista | null = cfg.livro_activo && cfg.livro_titulo.trim()
    ? {
        etiqueta: cfg.livro_etiqueta.trim(),
        titulo: cfg.livro_titulo.trim(),
        texto: cfg.livro_texto.trim(),
        cta: cfg.livro_cta.trim() || "Conhecer o livro",
        url: cfg.livro_url.trim(),
      }
    : null;

  const linhasServico: ServicoRevista[] = [
    {
      rotulo: "Consultoria",
      texto: cfg.servicos_consultoria_texto.trim(),
      cta: cfg.servicos_consultoria_cta.trim() || "Conhecer a consultoria",
      url: cfg.servicos_consultoria_url.trim(),
    },
    {
      rotulo: "Cursos e formação",
      texto: cfg.servicos_cursos_texto.trim(),
      cta: cfg.servicos_cursos_cta.trim() || "Explorar cursos e formação",
      url: cfg.servicos_cursos_url.trim(),
    },
  ].filter((l) => l.texto || l.url);

  // Grelha 2x2 do modelo v4_2: formação executiva (cartão principal),
  // consultoria, auditoria digital e o livro como quarto cartão.
  const cartoesServico: ServicoRevista[] = [
    ...(cfg.servicos_cursos_activo ? [{
      rotulo: "Formação executiva",
      texto: cfg.servicos_cursos_texto.trim(),
      cta: cfg.servicos_cursos_cta.trim() || "Conhecer os programas",
      url: cfg.servicos_cursos_url.trim(),
      destaque: true,
      tipo: "servico" as const,
    }] : []),
    ...(cfg.servicos_consultoria_activo ? [{
      rotulo: "Consultoria",
      texto: cfg.servicos_consultoria_texto.trim(),
      cta: cfg.servicos_consultoria_cta.trim() || "Conhecer a consultoria",
      url: cfg.servicos_consultoria_url.trim(),
      tipo: "servico" as const,
    }] : []),
    ...(cfg.servicos_auditoria_activo ? [{
      rotulo: "Auditoria digital",
      texto: cfg.servicos_intro.trim(),
      cta: cfg.servicos_cta.trim() || "Pedir uma auditoria",
      url: cfg.servicos_url.trim(),
      tipo: "servico" as const,
    }] : []),
    ...(livro
      ? [{
          rotulo: livro.titulo,
          texto: livro.texto,
          cta: livro.cta,
          url: livro.url,
          tipo: "livro" as const,
        }]
      : []),
  ].filter((c) => c.rotulo && (c.texto || c.url));

  const servicos: ServicosRevista | null = cartoesServico.length
    ? {
        titulo: cfg.servicos_titulo.trim() || "Como te posso ajudar",
        intro: cfg.servicos_intro.trim(),
        cta: cfg.servicos_cta.trim() || "Pedir uma auditoria digital",
        url: cfg.servicos_url.trim(),
        linhas: linhasServico,
        cartoes: cartoesServico,
      }
    : null;

  const recomendacaoTitulo = textoDeHtmlEditorial(cfg.recomendacao_titulo);
  const recomendacao = cfg.recomendacao_activa && recomendacaoTitulo
    ? {
        tipo: cfg.recomendacao_tipo.trim(),
        meta: cfg.recomendacao_meta.trim(),
        titulo: htmlEditorialInline(cfg.recomendacao_titulo),
        tituloTexto: recomendacaoTitulo,
        subtitulo: htmlEditorialInline(cfg.recomendacao_subtitulo),
        url: cfg.recomendacao_url.trim(),
        nota: htmlEditorialSeguro(cfg.recomendacao_nota),
      }
    : null;

  // Atualidades: todas as aprovadas da edição. As que não entram em
  // Destaques nem «Novidades da semana» são, por definição, «só site».
  const papeis = new Map<string, "destaque" | "radar">();
  destaques.forEach((d) => papeis.set(d.noticiaId, "destaque"));
  radar.forEach((r) => papeis.set(r.noticiaId, "radar"));
  const atualidades: AtualidadeRevista[] = (universo as NoticiaDaEdicao[])
    .map((n) => ({
      noticiaId: n.id,
      titulo: limparTituloRevista(n.titulo),
      descricao: (n.descricao ?? "").trim(),
      url: (n.url_curto?.trim() || n.url?.trim() || ""),
      categoria: n.categoria,
      categoriaRotulo: rotuloCategoria(n.categoria),
      papel: papeis.get(n.id) ?? "so_site",
    }));

  const ed = edRes.data as Record<string, unknown>;

  // Recurso: apresentação vazia → usar título e início da crónica.
  let cronicaTituloRecurso = "";
  let cronicaExcertoRecurso = "";
  if (!cfg.cronica_titulo.trim() || !cfg.cronica_excerto.trim()) {
    const { data: cr } = await sb.from("nl_cronicas")
      .select("titulo, conteudo, conteudo_html").eq("edicao_id", edicaoId).maybeSingle();
    const c = cr as { titulo: string | null; conteudo: string | null; conteudo_html: string | null } | null;
    cronicaTituloRecurso = (c?.titulo ?? "").trim();
    cronicaExcertoRecurso = excertoDaCronica(c?.conteudo_html || c?.conteudo || "");
  }
  const estrutura: EdicaoRevista = {
    edicao: {
      id: ed.id as string,
      numero: ed.numero as number,
      assunto: (ed.assunto as string | null) ?? null,
      data_envio_prevista: (ed.data_envio_prevista as string | null) ?? null,
      wordpress_post_url: (ed.wordpress_post_url as string | null) ?? null,
    },
    preheader: preheaderRevista(cfg),
    promocao: cfg.promocao_activa && cfg.promocao_link_texto.trim()
      ? {
          prefixo: cfg.promocao_prefixo.trim(),
          linkTexto: cfg.promocao_link_texto.trim(),
          url: cfg.promocao_url.trim(),
        }
      : null,
    cronica: {
      titulo: cfg.cronica_titulo.trim() || cronicaTituloRecurso,
      subtitulo: cfg.cronica_subtitulo.trim(),
      lede: cfg.cronica_lede.trim(),
      excerto: cfg.cronica_excerto.trim() || cronicaExcertoRecurso,
      url: cfg.cronica_url.trim() || URL_CRONICA_PROVISORIA,
      urlProvisoria: !cfg.cronica_url.trim(),
    },
    momento: cfg.momento_activo && (cfg.momento_valor.trim() || cfg.momento_descricao.trim())
      ? { etiqueta: cfg.momento_etiqueta.trim(), valor: cfg.momento_valor.trim(), descricao: cfg.momento_descricao.trim() }
      : null,
    pullQuote: cfg.pull_quote.trim(),
    momentoPosicao: cfg.momento_posicao,
    pullQuotePosicao: cfg.pull_quote_posicao,
    ledePosicao: cfg.cronica_lede_posicao,
    imagem: cfg.cronica_imagem_url.trim()
      ? {
          url: cfg.cronica_imagem_recorte_url.trim() || cfg.cronica_imagem_url.trim(),
          recortada: !!cfg.cronica_imagem_recorte_url.trim(),
          alt: cfg.cronica_imagem_alt.trim(),
          credito: cfg.cronica_imagem_credito.trim(),
          creditoUrl: cfg.cronica_imagem_credito_url.trim(),
          fonte: cfg.cronica_imagem_fonte.trim(),
        }
      : null,
    imagemPosicao: -1,

    destaques,
    radar,
    recomendacao,
    ferramentas,
    podcast,
    livro,
    servicos,
    atualidades,
    // Canónico da Revista: a página pública própria, derivada da base
    // configurável. O WordPress é backup, nunca identidade.
    urlPagina: await urlCanonicaEdicao(ed.numero as number, sb),
    congelada: false,
    problemas: [],
  };
  estrutura.problemas = validarRevista(estrutura);
  return estrutura;
}

/* ─────────── snapshot: preparado vs. bloqueado ─────────── */

/**
 * Prepara a fotografia da edição: guarda os dados compostos e também o
 * artefacto realmente enviado (HTML e texto), com a versão do renderer.
 * Enquanto o estado for «preparado», a edição pode ainda ser libertada.
 */
export async function prepararSnapshotRevista(
  edicaoId: string,
  estrutura: EdicaoRevista,
  artefacto: { emailHtml: string; emailText: string; urlWeb: string },
): Promise<SnapshotRevista> {
  const envelope: SnapshotRevista = {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    renderer_version: RENDERER_VERSION,
    estado: "preparado",
    edicao: { ...estrutura, congelada: true, problemas: [] },
    email_html: artefacto.emailHtml,
    email_text: artefacto.emailText,
    url_web: artefacto.urlWeb,
    url_web_path: caminhoCanonicoEdicao(estrutura.edicao.numero),
    preparado_em: new Date().toISOString(),
    bloqueado_em: null,
  };
  const sb = admin();
  const { error } = await sb
    .from("nl_edicoes")
    .update({ revista_snapshot: envelope as unknown as Record<string, unknown> })
    .eq("id", edicaoId);
  if (error) throw new Error(`Não foi possível fixar a edição: ${error.message}`);
  return envelope;
}

/** Torna a fotografia definitiva — a partir daqui a edição é imutável. */
export async function bloquearSnapshotRevista(edicaoId: string): Promise<void> {
  const sb = admin();
  const actual = await lerSnapshotRevista(edicaoId);
  if (!actual || actual.estado === "bloqueado") return;
  const envelope: SnapshotRevista = {
    ...actual,
    estado: "bloqueado",
    bloqueado_em: new Date().toISOString(),
  };
  await sb.from("nl_edicoes")
    .update({ revista_snapshot: envelope as unknown as Record<string, unknown> })
    .eq("id", edicaoId);
}

/**
 * Descarta uma fotografia ainda não bloqueada (nenhuma lista foi aceite):
 * a edição volta a ser editável e o snapshot será regenerado no envio seguinte.
 */
export async function descartarSnapshotPreparado(edicaoId: string): Promise<boolean> {
  const actual = await lerSnapshotRevista(edicaoId);
  if (!actual || actual.estado === "bloqueado") return false;
  const sb = admin();
  await sb.from("nl_edicoes").update({ revista_snapshot: null }).eq("id", edicaoId);
  return true;
}

/** Envelope gravado desta edição, ou `null` quando ainda não existe. */
export async function lerSnapshotRevista(edicaoId: string): Promise<SnapshotRevista | null> {
  const sb = admin();
  const { data } = await sb.from("nl_edicoes").select("revista_snapshot, template_version").eq("id", edicaoId).maybeSingle();
  const linha = data as { revista_snapshot?: unknown; template_version?: string } | null;
  if (!linha || linha.template_version !== "revista") return null;
  return lerEnvelope(linha.revista_snapshot);
}

/** Verdadeiro quando a edição já está historicamente bloqueada. */
export async function edicaoRevistaBloqueada(edicaoId: string): Promise<boolean> {
  const env = await lerSnapshotRevista(edicaoId);
  return env?.estado === "bloqueado";
}


export { excertoDaCronica } from "./sequencia-cronica.ts";
