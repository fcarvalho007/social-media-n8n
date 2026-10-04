// Heurística sem IA que garante descrições de 2–3 linhas nos cartões da
// newsletter. Corta em limite de frase completa sem `…` e nunca acrescenta
// reticências. Partilhada entre Edge Functions (Deno) — o cliente tem um
// espelho em `src/lib/ajustar-descricao.ts` com a mesma assinatura.

export interface AjustarOpts {
  /** Comprimento máximo aceitável em caracteres (aprox. 3 linhas). */
  max?: number;
  /** Mínimo desejado para o corte procurar um limite de frase natural. */
  min?: number;
}

const DEFAULTS: Required<AjustarOpts> = { max: 180, min: 90 };

/** Variante para cartões de destaque (cartão mais largo, fonte 15px). */
export function ajustarDescricaoDestaque(texto: string | null | undefined): string {
  return ajustarDescricao(texto, { max: 200, min: 100 });
}

/** Palavras curtas que não podem ficar à solta no fim do texto. */
const STOPWORDS_FIM = new Set([
  "a", "o", "e", "à", "ao", "os", "as", "um", "uma", "uns", "umas",
  "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
  "para", "por", "pela", "pelo", "pelas", "pelos",
  "com", "sem", "sob", "sobre", "entre", "após", "até", "ante",
  "que", "se", "ou", "nem", "mas", "como", "quando", "onde", "porque",
  "seu", "sua", "seus", "suas", "meu", "minha", "teu", "tua",
  "esta", "este", "estas", "estes", "essa", "esse", "essas", "esses",
  "num", "numa", "nuns", "numas", "dum", "duma", "duns", "dumas",
]);

/** Remove reticências, letras/palavras órfãs e pontuação errante no fim. */
function limparFim(s: string): string {
  let out = s.trim();
  // Reticências, três pontos, ou pontos consecutivos.
  out = out.replace(/[.\u2026]{2,}\s*$/u, "");
  // Uma única letra isolada no fim (ex.: "A", "O") com ou sem pontuação.
  out = out.replace(/\s+[A-Za-zÀ-ÿ]\.?\s*$/u, "");
  // Pontuação/espaços residuais.
  out = out.replace(/[\s,;:–\-]+$/u, "").trim();
  // Palavra final que é stopword — recua uma palavra.
  const partes = out.split(/\s+/);
  while (partes.length > 3) {
    const ult = partes[partes.length - 1].toLowerCase().replace(/[.,;:!?]+$/u, "");
    if (STOPWORDS_FIM.has(ult)) partes.pop();
    else break;
  }
  return partes.join(" ").replace(/[\s,;:–\-]+$/u, "").trim();
}

/** Garante ponto final se a última letra for alfanumérica. */
function garantirPonto(s: string): string {
  if (!s) return s;
  const ult = s[s.length - 1];
  if (/[.!?]/.test(ult)) return s;
  return `${s}.`;
}

/** Devolve `texto` inalterado se `≤ max`; caso contrário corta no último
 *  limite de frase (. ! ?) ≥ min. Se não existir, tenta alargar a janela
 *  até `max+40` para apanhar a frase completa. Nunca acrescenta `…`. */
export function ajustarDescricao(texto: string | null | undefined, opts: AjustarOpts = {}): string {
  const { max, min } = { ...DEFAULTS, ...opts };
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return garantirPonto(limparFim(t));

  const buscarFrase = (janela: string): number => {
    return Math.max(
      janela.lastIndexOf(". "),
      janela.lastIndexOf("! "),
      janela.lastIndexOf("? "),
    );
  };

  // 1) Limite de frase forte dentro do `max`.
  const janela = t.slice(0, max);
  const fim = buscarFrase(janela);
  if (fim >= min) return limparFim(janela.slice(0, fim + 1));

  // 2) Alargar até max+40 à procura da próxima frase completa.
  const alargada = t.slice(0, Math.min(t.length, max + 40));
  const fimAlargado = buscarFrase(alargada);
  if (fimAlargado >= min) return limparFim(alargada.slice(0, fimAlargado + 1));

  // 3) Limite de frase suave: ; ou :
  const suave = Math.max(janela.lastIndexOf("; "), janela.lastIndexOf(": "));
  if (suave >= min) return garantirPonto(limparFim(janela.slice(0, suave)));

  // 4) Limite de cláusula: vírgula
  const virgula = janela.lastIndexOf(", ");
  if (virgula >= min) return garantirPonto(limparFim(janela.slice(0, virgula)));

  // 5) Última palavra completa.
  const espaco = janela.lastIndexOf(" ");
  if (espaco > 0) return garantirPonto(limparFim(janela.slice(0, espaco)));

  return garantirPonto(limparFim(janela));
}

/** Categoriza uma descrição face ao alvo ideal (≈2 linhas). */
export function estadoDescricao(texto: string | null | undefined): "curta" | "ideal" | "longa" | "excessiva" | "vazia" {
  const n = (texto ?? "").trim().length;
  if (n === 0) return "vazia";
  if (n < 90) return "curta";
  if (n <= 180) return "ideal";
  if (n <= 220) return "longa";
  return "excessiva";
}
