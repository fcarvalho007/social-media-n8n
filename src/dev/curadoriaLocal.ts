import type { API_CURADORIA } from "@/features/curadoria/CuradoriaNoticias";
import type { NoticiaCurada } from "@/services/curadoria";
const itens: NoticiaCurada[] = [
  { id: "local-biblioteca", titulo: "Uma biblioteca abre uma sala de leitura", descricao: "O novo espaço tem quarenta lugares e funciona de segunda a sábado. A biblioteca também empresta livros, jornais e revistas.", url: "https://example.com/biblioteca", categoria: "media", origem: "rss", editorial_estado: "aprovada", estado_newsletter: "enviada", edicao_id: "edicao-local", criado_em: new Date().toISOString(), nivel: "resumo", usos: 0, edicoes: [] },
  { id: "local-equipa", titulo: "Uma equipa publica o seu primeiro guia", descricao: "O guia reúne práticas de organização do trabalho editorial. Foi escrito pela equipa e revisto antes de ser divulgado.", url: null, categoria: "ia", origem: "email", editorial_estado: "pendente", estado_newsletter: "pendente", edicao_id: null, criado_em: new Date().toISOString(), nivel: "artigo", usos: 0, edicoes: [] },
];
export const apiLocal: typeof API_CURADORIA = {
  listar: async (f = {}) => { const i = itens.filter((n) => n.editorial_estado === (f.estado ?? "aprovada") && (!f.categoria || n.categoria === f.categoria) && `${n.titulo} ${n.descricao}`.toLowerCase().includes((f.query ?? "").toLowerCase())); return { total: i.length, itens: structuredClone(i) }; },
  ler: async (id) => { const n = itens.find((n) => n.id === id && n.editorial_estado === "aprovada"); if (!n) throw new Error("Aprova esta notícia primeiro."); return { noticia_id: n.id, hash: "local-fixture", titulo: n.titulo, texto: n.descricao!, url: n.url, categoria: n.categoria, origem: n.origem, nivel: n.nivel, parcial: false }; },
  decidir: async (id, estado) => { const n = itens.find((n) => n.id === id); if (n) n.editorial_estado = estado; },
  selecionarEdicao: async () => "local-selecao",
};
