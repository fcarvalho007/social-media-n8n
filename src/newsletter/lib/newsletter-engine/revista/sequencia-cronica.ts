// Ordem das peças da crónica (parágrafos + blocos de enriquecimento).
//
// Módulo client-safe: é usado pelos renderizadores (email, web, texto) e
// também pelo editor Revista, para que a ordem mostrada no backoffice seja
// exactamente a ordem enviada.

/** Posição convencional «no fim da crónica». */
export const POSICAO_FIM = 99;

/** Parágrafos a partir de texto simples com quebras de linha. */
export function paragrafosCronica(txt: string): string[] {
  return (txt || "").split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
}

export type PecaCronica =
  | { tipo: "paragrafo"; texto: string; indice: number }
  | { tipo: "lede" }
  | { tipo: "pull_quote" }
  | { tipo: "momento" }
  | { tipo: "imagem" };

export interface OpcoesSequencia {
  excerto: string;
  /** A lede / tese editorial entra na sequência? (fora do email fica no hero) */
  lede?: boolean;
  ledePos?: number;
  /** A frase de destaque entra nesta edição? */
  pullQuote: boolean;
  pullQuotePos: number;
  /** O momento editorial entra nesta edição? */
  momento: boolean;
  momentoPos: number;
  /** A imagem da crónica entra nesta edição? */
  imagem?: boolean;
  imagemPos?: number;
}

/** Normaliza a posição para o intervalo [0, total]. */
export function posicaoValida(pos: number | null | undefined, total: number): number {
  const n = typeof pos === "number" && Number.isFinite(pos) ? Math.round(pos) : POSICAO_FIM;
  if (n < 0) return 0;
  if (n > total) return total;
  return n;
}

/**
 * Devolve a sequência final: cada bloco entra depois do número de parágrafos
 * indicado pela sua posição (0 = antes do primeiro parágrafo).
 *
 * A lede é apenas mais uma peça móvel; a imagem com posição negativa é a
 * convenção antiga de «antes da lede» e continua a ser respeitada.
 */
export function sequenciaCronica(o: OpcoesSequencia): PecaCronica[] {
  const pars = paragrafosCronica(o.excerto);
  const total = pars.length;
  const posLede = posicaoValida(o.ledePos ?? 0, total);
  const imagemAntesLede = (o.imagemPos ?? 0) < 0;
  const posQuote = posicaoValida(o.pullQuotePos, total);
  const posMomento = posicaoValida(o.momentoPos, total);
  const posImagem = imagemAntesLede ? posLede : posicaoValida(o.imagemPos, total);

  const seq: PecaCronica[] = [];
  const inserirEm = (i: number) => {
    // Empate: imagem «antes da lede», lede, imagem, frase de destaque, momento.
    if (o.imagem && imagemAntesLede && posImagem === i) seq.push({ tipo: "imagem" });
    if (o.lede && posLede === i) seq.push({ tipo: "lede" });
    if (o.imagem && !imagemAntesLede && posImagem === i) seq.push({ tipo: "imagem" });
    if (o.pullQuote && posQuote === i) seq.push({ tipo: "pull_quote" });
    if (o.momento && posMomento === i) seq.push({ tipo: "momento" });
  };

  inserirEm(0);
  pars.forEach((texto, i) => {
    seq.push({ tipo: "paragrafo", texto, indice: i + 1 });
    inserirEm(i + 1);
  });
  return seq;
}



/** Excerto de recurso: início da crónica em texto, ~600 caracteres, cortado no fim de uma frase. */
export function excertoDaCronica(fonte: string, limite = 600): string {
  const texto = fonte
    .replace(/<\/(p|div|h[1-6]|li)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n\n");
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  const fim = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf(".\n"), corte.lastIndexOf("? "), corte.lastIndexOf("! "));
  return (fim > limite * 0.4 ? corte.slice(0, fim + 1) : corte.replace(/\s+\S*$/, "") + "…").trim();
}

/** Faixa recomendada de palavras para o excerto da crónica. */
export const EXCERTO_PALAVRAS_MIN = 80;
export const EXCERTO_PALAVRAS_MAX = 120;

export interface EstadoParagrafos {
  paragrafos: string[];
  ledePos: number;
  quotePos: number;
  momentoPos: number;
}

export type OperacaoParagrafo =
  | { op: "editar"; indice: number; texto: string }
  | { op: "inserir"; indice: number; texto: string }
  | { op: "apagar"; indice: number }
  | { op: "mover"; indice: number; delta: -1 | 1 };

/**
 * Aplica uma operação aos parágrafos do excerto (índices 0-based) mantendo as
 * peças móveis no mesmo sítio relativo. Uma peça na posição p fica depois de p
 * parágrafos.
 */
export function editarParagrafos(e: EstadoParagrafos, o: OperacaoParagrafo): EstadoParagrafos {
  const pars = [...e.paragrafos];
  const total = pars.length;
  let pos = [e.ledePos, e.quotePos, e.momentoPos].map((p) => posicaoValida(p, total));
  if (o.op === "editar") {
    if (o.indice < 0 || o.indice >= total) return e;
    pars[o.indice] = o.texto;
  } else if (o.op === "inserir") {
    const i = Math.max(0, Math.min(total, o.indice));
    pars.splice(i, 0, o.texto);
    pos = pos.map((p) => (p > i ? p + 1 : p));
  } else if (o.op === "apagar") {
    if (o.indice < 0 || o.indice >= total) return e;
    pars.splice(o.indice, 1);
    pos = pos.map((p) => (p > o.indice ? p - 1 : p));
  } else {
    const j = o.indice + o.delta;
    if (o.indice < 0 || o.indice >= total || j < 0 || j >= total) return e;
    [pars[o.indice], pars[j]] = [pars[j], pars[o.indice]];
  }
  return { paragrafos: pars, ledePos: pos[0], quotePos: pos[1], momentoPos: pos[2] };
}

export function contarPalavras(txt: string): number {
  return (txt.match(/\S+/g) ?? []).length;
}
