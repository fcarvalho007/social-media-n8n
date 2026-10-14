// Espelho cliente da heurística Deno em
// `supabase/functions/_shared/ajustar-descricao.ts`. Mantém a mesma
// assinatura e regras — actualiza os dois em conjunto.

export interface AjustarOpts {
  max?: number;
  min?: number;
}

const DEFAULTS: Required<AjustarOpts> = { max: 180, min: 90 };

export function ajustarDescricaoDestaque(texto: string | null | undefined): string {
  return ajustarDescricao(texto, { max: 200, min: 100 });
}

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

function limparFim(s: string): string {
  let out = s.trim();
  out = out.replace(/[.\u2026]{2,}\s*$/u, "");
  out = out.replace(/\s+[A-Za-zÀ-ÿ]\.?\s*$/u, "");
  out = out.replace(/[\s,;:–\-]+$/u, "").trim();
  const partes = out.split(/\s+/);
  while (partes.length > 3) {
    const ult = partes[partes.length - 1].toLowerCase().replace(/[.,;:!?]+$/u, "");
    if (STOPWORDS_FIM.has(ult)) partes.pop();
    else break;
  }
  return partes.join(" ").replace(/[\s,;:–\-]+$/u, "").trim();
}

function garantirPonto(s: string): string {
  if (!s) return s;
  const ult = s[s.length - 1];
  if (/[.!?]/.test(ult)) return s;
  return `${s}.`;
}

export function ajustarDescricao(texto: string | null | undefined, opts: AjustarOpts = {}): string {
  const { max, min } = { ...DEFAULTS, ...opts };
  const t = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return garantirPonto(limparFim(t));

  const buscarFrase = (janela: string): number => Math.max(
    janela.lastIndexOf(". "),
    janela.lastIndexOf("! "),
    janela.lastIndexOf("? "),
  );

  const janela = t.slice(0, max);
  const fim = buscarFrase(janela);
  if (fim >= min) return limparFim(janela.slice(0, fim + 1));

  const alargada = t.slice(0, Math.min(t.length, max + 40));
  const fimAlargado = buscarFrase(alargada);
  if (fimAlargado >= min) return limparFim(alargada.slice(0, fimAlargado + 1));

  const suave = Math.max(janela.lastIndexOf("; "), janela.lastIndexOf(": "));
  if (suave >= min) return garantirPonto(limparFim(janela.slice(0, suave)));

  const virgula = janela.lastIndexOf(", ");
  if (virgula >= min) return garantirPonto(limparFim(janela.slice(0, virgula)));

  const espaco = janela.lastIndexOf(" ");
  if (espaco > 0) return garantirPonto(limparFim(janela.slice(0, espaco)));

  return garantirPonto(limparFim(janela));
}

export type EstadoDescricao = "curta" | "ideal" | "longa" | "excessiva" | "vazia";

export function estadoDescricao(texto: string | null | undefined): EstadoDescricao {
  const n = (texto ?? "").trim().length;
  if (n === 0) return "vazia";
  if (n < 90) return "curta";
  if (n <= 180) return "ideal";
  if (n <= 220) return "longa";
  return "excessiva";
}

export function corEstadoDescricao(estado: EstadoDescricao): string {
  switch (estado) {
    case "ideal": return "#059669";
    case "longa":
    case "curta": return "#B45309";
    case "excessiva": return "#B91C1C";
    case "vazia":
    default: return "#94A3B8";
  }
}
