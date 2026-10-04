// Fonte única de verdade para tokens visuais partilhados entre
// gerar-html-newsletter.ts (email) e gerar-html-wordpress.ts (página LearnDash).

export const COR = {
  tituloCor: "#0F172A",
  descricaoCor: "#475569",
  linkCor: "#6366F1",
  linkBorda: "#C7D2FE",
  fundoClaro: "#EEF1F5",
  fundoCartao: "#FFFFFF",
  bordaCartao: "#E2E8F0",
  tenue: "#94A3B8",
  divisor: "#F1F5F9",
} as const;

export const FONT_TITULO =
  "'Space Grotesk', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
export const FONT_CORPO =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

export const ESCALA = {
  xs: 13,
  sm: 15,
  base: 16,
  md: 18,
  lg: 21,
  xl: 24,
} as const;

export const GRADIENTE = {
  marca: "linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#EC4899 100%)",
  estatisticas: "linear-gradient(135deg,#10B981 0%,#059669 100%)",
  podcast: "linear-gradient(135deg,#EF4444 0%,#F97316 100%)",
  livro: "linear-gradient(135deg,#F97316 0%,#C2410C 100%)",
  curso: "linear-gradient(135deg,#6366F1 0%,#4338CA 100%)",
} as const;

export interface CategoriaDef {
  id: string;
  nome: string;
  emoji: string;
  accent: string;
}

// Fonte única de cor por categoria — usada no editor, no email e na página WordPress.
// Nenhuma cor pode ser repetida entre categorias.
export const CATEGORIAS: CategoriaDef[] = [
  { id: "ia",       nome: "Inteligência Artificial",                     emoji: "🤖", accent: "#7C3AED" },
  { id: "google",   nome: "Google",                                      emoji: "🔍", accent: "#F59E0B" },
  { id: "youtube",  nome: "YouTube & Vídeo",                             emoji: "▶️", accent: "#DC2626" },
  { id: "meta",     nome: "Meta (Facebook, Instagram, WhatsApp, Threads)", emoji: "📘", accent: "#2563EB" },
  { id: "linkedin", nome: "LinkedIn",                                    emoji: "💼", accent: "#0284C7" },
  { id: "tiktok",   nome: "TikTok",                                      emoji: "🎬", accent: "#0D9488" },
  { id: "x",        nome: "X (ex-Twitter)",                              emoji: "𝕏",  accent: "#475569" },
  { id: "media",    nome: "Media & Negócios Online",                     emoji: "✨", accent: "#B45309" },
];
