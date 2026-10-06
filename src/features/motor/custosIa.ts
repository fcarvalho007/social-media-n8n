// Single table of AI action costs shown in the UI. Values are public-price ESTIMATES (marked as such)
// until the owner confirms the real ones; the provider account is the only exact source.
export interface AcaoCusto {
  id: string;
  nome: string;
  fornecedor: string;
  /** Estimated cost per request in euros; null = free. */
  euros: number | null;
  unidade: string;
}

export const CUSTOS_IA: AcaoCusto[] = [
  { id: "imagem_ia", nome: "Gerar imagem IA", fornecedor: "Kie · Seedream 5.0 Flash", euros: 0.02, unidade: "por imagem" },
  { id: "texto_ia", nome: "Narrativa e textos com IA", fornecedor: "DeepSeek Flash", euros: 0.002, unidade: "por pedido" },
  { id: "visao_ia", nome: "Ler imagem com IA", fornecedor: "fal.ai · Gemini 2.5 Flash-Lite (alternativo: Kie · Gemini 3 Flash)", euros: 0.001, unidade: "por pedido" },
  { id: "logo_ia", nome: "Criar logótipo com IA", fornecedor: "Kie · Seedream 5.0 Flash", euros: 0.02, unidade: "por proposta" },
];

export const GRATUITOS = ["Redesenhar slide (5 propostas)", "Pexels", "Biblioteca", "Carregar imagem", "Efeitos e paletas", "Exportar PNG/PDF"];

const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 3 });
export const formatarCusto = (euros: number | null) => (euros == null ? "Sem custo" : `~${fmt.format(euros)}`);
export const custoDe = (id: string) => CUSTOS_IA.find((c) => c.id === id) ?? null;
/** Short label for buttons: "1 imagem · ~0,02 € (estimativa)". */
export const rotuloCusto = (id: string) => { const c = custoDe(id); return c ? `1 pedido · ${formatarCusto(c.euros)}` : ""; };
