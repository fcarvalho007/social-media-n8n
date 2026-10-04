export type CorFerramenta = "indigo" | "verde" | "laranja" | "cinzento";

export interface PaletaFerramenta {
  chave: CorFerramenta;
  nome: string;
  descricao: string;
  solid: string;
  ink: string;
  pastel: string;
  pastelForte: string;
  borda: string;
}

export const PALETAS_FERRAMENTA: Record<CorFerramenta, PaletaFerramenta> = {
  indigo: {
    chave: "indigo",
    nome: "Índigo",
    descricao: "Genérico / marca",
    solid: "#4F46E5",
    ink: "#3730A3",
    pastel: "#EEF2FF",
    pastelForte: "#E0E7FF",
    borda: "#C7D2FE",
  },
  verde: {
    chave: "verde",
    nome: "Verde",
    descricao: "Inscrições e urgência",
    solid: "#059669",
    ink: "#065F46",
    pastel: "#ECFDF5",
    pastelForte: "#D1FAE5",
    borda: "#A7F3D0",
  },
  laranja: {
    chave: "laranja",
    nome: "Laranja",
    descricao: "Oportunidade / destaque",
    solid: "#D97706",
    ink: "#92400E",
    pastel: "#FFFBEB",
    pastelForte: "#FEF3C7",
    borda: "#FDE68A",
  },
  cinzento: {
    chave: "cinzento",
    nome: "Cinzento",
    descricao: "Institucional / neutro",
    solid: "#475569",
    ink: "#1F2937",
    pastel: "#F3F4F6",
    pastelForte: "#E5E7EB",
    borda: "#D1D5DB",
  },
};

export const CORES_FERRAMENTA: CorFerramenta[] = ["indigo", "verde", "laranja", "cinzento"];

export function paletaFerramenta(cor: string | null | undefined): PaletaFerramenta {
  if (cor === "verde" || cor === "laranja" || cor === "cinzento") return PALETAS_FERRAMENTA[cor];
  return PALETAS_FERRAMENTA.indigo;
}