import type { Capa, TrabalhoResumo } from "@/services/motor";

/** Test/demo work is labelled only from persisted markers, never from the title a user may choose. */
export function etiquetaTeste(t: TrabalhoResumo, capa?: Capa): string | null {
  if (t.modelo === "simulado-demo" || capa?.conteudo.demonstracao) return "Demonstração";
  if (t.prova) return "Prova";
  return null;
}
export const eProva = (t: TrabalhoResumo) => t.prova === true || t.modelo === "simulado-demo";
