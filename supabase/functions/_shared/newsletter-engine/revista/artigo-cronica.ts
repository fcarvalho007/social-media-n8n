// Construção pura do artigo da crónica para FredericoCarvalho.pt.
//
// Módulo sem rede e sem credenciais: recebe dados já lidos e devolve o payload
// exacto que seria enviado ao WordPress. Isto torna a pré-visualização e a
// publicação rigorosamente iguais.

export interface DadosArtigoCronica {
  /** Edição em curso — âncora de toda a verificação de proveniência. */
  edicaoId: string;
  /** `cronicas.id` da linha lida; `null` quando a edição ainda não tem crónica. */
  cronicaId: string | null;
  /** `cronicas.edicao_id` lido; tem de coincidir com `edicaoId`. */
  cronicaEdicaoId: string | null;
  /** `revista_edicao.edicao_id` lido; tem de coincidir com `edicaoId`. */
  configEdicaoId: string | null;
  numeroEdicao: number;
  /** Título editorial principal (`revista_edicao.cronica_titulo`). */
  titulo: string;
  /** Segunda linha — por defeito NÃO entra no título do artigo. */
  subtitulo: string;
  /** Lede/tese editorial — candidata natural a excerpt. */
  lede: string;
  /** Corpo integral do editor rico (`cronicas.conteudo_html` ou `conteudo`). */
  corpoHtml: string;
  /** URL canónica absoluta da edição pública (`/edicoes/:numero`). */
  urlEdicao: string;
}

export interface ArtigoCronica {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  /** Corpo em texto simples, sem a referência à edição — base da validação. */
  corpoTexto: string;
  /** Canónica candidata — só usada se o WordPress real permitir escrevê-la. */
  canonical: string;
  categoria: string | null;
  tags: string[];
  status: "draft" | "publish";
  /** Suporte futuro; nunca preenchido nesta fase. */
  featured_media_id?: number | null;
  /** Proveniência: edição e crónica que originaram exactamente este payload. */
  edicaoId: string;
  cronicaId: string | null;
  numeroEdicao: number;
  /** Falso quando o corpo editorial não cumpre o mínimo publicável. */
  publicavel: boolean;
}

/**
 * Título final do artigo. Fonte única de verdade.
 * Por decisão editorial explícita, a segunda linha não é concatenada; o
 * parâmetro existe para tornar a alternativa visível, não para a activar.
 */
export function tituloArtigoCronica(
  d: Pick<DadosArtigoCronica, "titulo" | "subtitulo">,
  opts: { incluirSegundaLinha?: boolean } = {},
): string {
  const principal = (d.titulo ?? "").trim();
  if (!opts.incluirSegundaLinha) return principal;
  const segunda = (d.subtitulo ?? "").trim();
  return segunda ? `${principal}: ${segunda}` : principal;
}

/** Slug estável, sem acentos. Só é enviado na criação do artigo. */
export function slugArtigo(titulo: string): string {
  return (titulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/* ─────────── sanitização (server-safe, sem DOM) ─────────── */

const TAGS_PERMITIDAS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li",
  "blockquote", "h2", "h3", "h4", "hr", "code", "pre",
]);

const BLOCOS_A_REMOVER = /<(script|style|iframe|object|embed|form|svg)[\s\S]*?<\/\1\s*>/gi;

function atributosSeguros(tag: string, bruto: string): string {
  if (tag !== "a") return "";
  const href = /\shref\s*=\s*("([^"]*)"|'([^']*)')/i.exec(bruto);
  const valor = (href?.[2] ?? href?.[3] ?? "").trim();
  if (!valor || !/^(https?:\/\/|mailto:|\/|#)/i.test(valor)) return "";
  const escapado = valor.replace(/"/g, "&quot;");
  return ` href="${escapado}" rel="noopener"`;
}

/**
 * Allowlist estrita: preserva a estrutura do editor rico (parágrafos,
 * headings, listas, links, ênfase) e elimina tudo o que possa partir o
 * WordPress ou introduzir execução de código.
 */
export function sanitizarHtmlArtigo(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(BLOCOS_A_REMOVER, "")
    .replace(/<\/?([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (todo, nomeBruto: string, attrs: string) => {
      const tag = nomeBruto.toLowerCase();
      if (!TAGS_PERMITIDAS.has(tag)) return "";
      if (todo.startsWith("</")) return `</${tag}>`;
      const fecho = /\/\s*$/.test(attrs) || tag === "br" || tag === "hr" ? " /" : "";
      return `<${tag}${atributosSeguros(tag, attrs)}${fecho}>`;
    })
    .trim();
}

/** Texto simples a partir de HTML — determinístico, sem IA. */
export function textoDeHtml(html: string): string {
  return (html ?? "")
    .replace(BLOCOS_A_REMOVER, "")
    .replace(/<\/(p|li|h2|h3|h4|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

const LIMITE_EXCERPT = 280;
const MINIMO_EXCERPT = 200;

/**
 * Uma lede só serve de excerpt se for mesmo uma lede: notas curtas de trabalho
 * («dada», «bla bla») nunca chegam ao site.
 */
export function ledeValida(lede: string): boolean {
  const t = (lede ?? "").replace(/\s+/g, " ").trim();
  return t.length >= 80 && t.split(" ").filter(Boolean).length >= 12;
}

function cortar(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= LIMITE_EXCERPT) return limpo;
  const corte = limpo.slice(0, LIMITE_EXCERPT);
  const fronteira = corte.lastIndexOf(" ");
  return `${(fronteira > 120 ? corte.slice(0, fronteira) : corte).trimEnd()}…`;
}

/** Excerpt: a lede quando é válida; caso contrário, o arranque do corpo. */
export function excerptArtigo(lede: string, corpoHtml: string): string {
  if (ledeValida(lede)) return cortar(lede);
  const paragrafos = textoDeHtml(corpoHtml)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let acumulado = "";
  for (const p of paragrafos) {
    acumulado = acumulado ? `${acumulado} ${p}` : p;
    if (acumulado.length >= MINIMO_EXCERPT) break;
  }
  return cortar(acumulado);
}


function escaparTexto(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Referência editorial discreta à edição de origem. Nunca um bloco promocional. */
export function referenciaEdicao(numero: number, url: string): string {
  return (
    `<p><em>Esta crónica integra a edição ${numero} da Digital Sprint.</em> ` +
    `<a href="${escaparTexto(url)}" rel="noopener">Ver edição completa →</a></p>`
  );
}

/** Frase automática do rodapé — nunca conta como corpo editorial. */
const FRASE_RODAPE = /esta cr[oó]nica integra a edi[cç][aã]o[\s\S]*?digital sprint/i;
export const MINIMO_CORPO = 200;

/**
 * O corpo é medido antes de existir rodapé.
 *
 * Elimina marcação vazia (`<p></p>`, `<br>`, `&nbsp;`) e qualquer ocorrência da
 * frase automática. Sem isto, uma crónica vazia parecia conteúdo e podia
 * esvaziar um artigo já publicado.
 */
export function corpoEditorialUtil(html: string): string {
  const texto = textoDeHtml(sanitizarHtmlArtigo(html ?? ""))
    .replace(FRASE_RODAPE, " ")
    .replace(/ver edi[cç][aã]o completa\s*→?/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return texto;
}

/** Verdadeiro apenas com corpo editorial real e suficiente para publicar. */
export function corpoEditorialValido(html: string): boolean {
  return corpoEditorialUtil(html).length >= MINIMO_CORPO;
}

function verificarProveniencia(d: DadosArtigoCronica): void {
  const alvo = (d.edicaoId ?? "").trim();
  if (!alvo) throw new Error("Integridade: falta a edição de origem da crónica.");
  if (d.cronicaEdicaoId && d.cronicaEdicaoId !== alvo) {
    throw new Error("Integridade: a crónica pertence a outra edição. Escrita bloqueada.");
  }
  if (d.configEdicaoId && d.configEdicaoId !== alvo) {
    throw new Error("Integridade: os campos editoriais pertencem a outra edição. Escrita bloqueada.");
  }
  if (!Number.isFinite(d.numeroEdicao) || d.numeroEdicao <= 0) {
    throw new Error("Integridade: número da edição inválido.");
  }
}

/**
 * Payload final do artigo — a mesma função alimenta preview e publicação.
 *
 * Lança quando os dados vêm de edições diferentes: mais vale falhar visível do
 * que escrever um artigo cruzado.
 */
export function construirPayloadArtigo(
  d: DadosArtigoCronica,
  opts: {
    status: "draft" | "publish";
    categoria?: string | null;
    tags?: string[];
    /** Edição a que a escrita se destina; tem de ser a mesma dos dados. */
    destinoEdicaoId?: string;
  },
): ArtigoCronica {
  verificarProveniencia(d);
  if (opts.destinoEdicaoId && opts.destinoEdicaoId !== d.edicaoId) {
    throw new Error("Integridade: o destino não corresponde à edição da crónica. Escrita bloqueada.");
  }
  const title = tituloArtigoCronica(d);
  const corpo = sanitizarHtmlArtigo(d.corpoHtml);
  // O rodapé só existe quando há corpo: nunca pode ser o conteúdo do artigo.
  const publicavel = corpoEditorialValido(d.corpoHtml);
  const content = publicavel ? `${corpo}\n${referenciaEdicao(d.numeroEdicao, d.urlEdicao)}` : corpo;
  return {
    title,
    slug: slugArtigo(title),
    excerpt: excerptArtigo(d.lede, d.corpoHtml),
    content,
    corpoTexto: corpoEditorialUtil(d.corpoHtml),
    canonical: d.urlEdicao,
    categoria: opts.categoria ?? null,
    tags: opts.tags ?? [],
    status: opts.status,
    featured_media_id: null,
    edicaoId: d.edicaoId,
    cronicaId: d.cronicaId,
    numeroEdicao: d.numeroEdicao,
    publicavel,
  };
}

/**
 * Validação mínima para permitir escrita automática.
 *
 * O corpo é medido sem a referência à edição: sem isto, uma crónica vazia
 * continuaria a parecer conteúdo e poderia esvaziar um artigo já publicado.
 */
export function validarArtigo(a: ArtigoCronica): string[] {
  const p: string[] = [];
  if (!a.title.trim()) p.push("Falta o título da crónica.");
  const corpo = a.corpoTexto ?? "";
  if (!corpo) p.push("Crónica incompleta: o corpo está vazio.");
  else if (corpo.length < MINIMO_CORPO) p.push("Crónica incompleta: o corpo é demasiado curto para publicar.");
  return p;
}

/* ─────────── sincronização e SEO ─────────── */

/**
 * Impressão digital do conteúdo editorial já publicado.
 *
 * Serve uma única pergunta: o artigo externo contém a versão mais recente?
 * Cobre título, excerpt e corpo — o que a acção «Actualizar artigo» escreve.
 * Determinística e sem rede.
 */
export async function impressaoArtigo(
  a: Pick<ArtigoCronica, "title" | "excerpt" | "content"> & { categoria?: string | null },
): Promise<string> {
  const texto = `${a.title}\u0000${a.excerpt}\u0000${a.content}\u0000${a.categoria ?? ""}`;
  const dados = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LIMITE_META = 155;

/** Meta description: o excerpt determinístico, cortado limpo. Sem IA. */
export function metaDescriptionArtigo(excerpt: string): string {
  const limpo = (excerpt ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (limpo.length <= LIMITE_META) return limpo;
  const janela = limpo.slice(0, LIMITE_META);
  const frase = Math.max(janela.lastIndexOf(". "), janela.lastIndexOf("! "), janela.lastIndexOf("? "));
  if (frase >= 90) return janela.slice(0, frase + 1).trim();
  const espaco = janela.lastIndexOf(" ");
  return `${(espaco > 90 ? janela.slice(0, espaco) : janela).trimEnd()}…`;
}

/* ─────────── comparação semântica com o artigo remoto ─────────── */

export type CampoArtigo = "titulo" | "excerpt" | "corpo" | "categoria";

export interface DiferencaArtigo {
  campo: CampoArtigo;
  local: string;
  remoto: string;
}

/**
 * Normaliza para comparação editorial: tira marcação, entidades, aspas
 * tipográficas, espaços redundantes e maiúsculas. O objectivo é responder a
 * «o texto é o mesmo?», não «os bytes são os mesmos?».
 */
export function normalizarParaComparacao(valor: string): string {
  return textoDeHtml(valor ?? "")
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Compara o payload canónico com o artigo lido no WordPress.
 *
 * Fora da comparação, por decisão explícita: slug (imutável após publicação),
 * timestamps e qualquer formatação que o WordPress reescreva.
 */
export function compararArtigoRemoto(
  local: Pick<ArtigoCronica, "title" | "excerpt" | "content">,
  remoto: { titulo: string; excerpt: string; conteudo: string; categorias?: number[] },
  opts: { categoriaId?: number | null } = {},
): DiferencaArtigo[] {
  const difs: DiferencaArtigo[] = [];
  const par = (campo: CampoArtigo, a: string, b: string) => {
    const na = normalizarParaComparacao(a);
    const nb = normalizarParaComparacao(b);
    if (na !== nb) difs.push({ campo, local: na, remoto: nb });
  };
  par("titulo", local.title, remoto.titulo);
  par("excerpt", local.excerpt, remoto.excerpt);
  par("corpo", local.content, remoto.conteudo);
  const id = opts.categoriaId;
  if (id != null && Array.isArray(remoto.categorias) && !remoto.categorias.includes(id)) {
    difs.push({ campo: "categoria", local: String(id), remoto: remoto.categorias.join(", ") });
  }
  return difs;
}
