// Conteúdo simulado dos protótipos QA (Fase 0A).
// O desenho vive em `PaginaBrief.tsx` — aqui só ficam os dados de exemplo.

import { PaginaBrief, type BriefConteudo } from "./PaginaBrief";

export type { BriefConteudo };
export const BriefPreview = PaginaBrief;

const AVISO_QA = "Preview QA · não publicado";
const NOTA_QA = "Conteúdo de demonstração para avaliação visual";

export const BRIEF_DESTAQUE: BriefConteudo = {
  variante: "brief",
  categoria: "Inteligência Artificial",
  titulo: "Google leva agentes de IA para dentro das equipas de marketing",
  subtitulo: "A novidade é tecnológica. A consequência pode ser organizacional.",
  data: "14 setembro 2026",
  dataISO: "2026-09-14",
  tempo: "2 min",
  fonte: "The Verge",
  fonteUrl: "https://www.theverge.com/",
  edicaoNumero: 319,
  aviso: AVISO_QA,
  notaRodape: NOTA_QA,
  resumo: [
    "A Google apresentou novas capacidades de agentes de IA destinadas a automatizar partes do trabalho de marketing.",
    "Os agentes conseguem receber objetivos, consultar informação e executar sequências de tarefas com menor intervenção manual.",
    "A primeira vaga está orientada para produtividade, análise e produção assistida — não para substituir integralmente a decisão humana.",
  ],
  implicacoes: [
    {
      titulo: "Processos",
      texto: "O ganho poderá estar menos na geração de conteúdos e mais na redução de trabalho repetitivo entre ferramentas.",
    },
    {
      titulo: "Equipas",
      texto: "Pequenas equipas passam a conseguir operar processos que antes exigiam maior capacidade operacional.",
    },
    {
      titulo: "Diferenciação",
      texto: "Se todos utilizarem os mesmos agentes da mesma forma, a eficiência aumenta, mas a diferenciação pode diminuir.",
    },
  ],
  leitura: {
    texto: "A parte mais interessante dos agentes não é fazerem mais coisas por nós. É obrigarem-nos a decidir melhor aquilo que queremos delegar. Uma equipa com maus processos não se transforma numa boa equipa por acrescentar agentes — apenas automatiza mais depressa a confusão.",
    citacao: "Automatizar confusão continua a ser confusão. Só acontece mais depressa.",
    autor: "Frederico Carvalho",
  },
  relacionados: [
    { categoria: "Estratégia", titulo: "O novo custo invisível de adotar IA sem redesenhar processos", tempo: "3 min" },
    { categoria: "Equipas", titulo: "Cinco decisões que não devem ser delegadas a um agente", tempo: "2 min" },
    { categoria: "Ferramentas", titulo: "Como comparar copilotos sem cair na lista de funcionalidades", tempo: "4 min" },
  ],
};

export const QUICK_BRIEF_RADAR: BriefConteudo = {
  variante: "quick",
  categoria: "Social Media",
  titulo: "Instagram testa uma nova forma de organizar recomendações",
  subtitulo: "Mais controlo para o utilizador pode significar novos sinais para as marcas.",
  data: "14 setembro 2026",
  dataISO: "2026-09-14",
  tempo: "1 min",
  fonte: "Instagram",
  fonteUrl: "https://www.instagram.com/",
  edicaoNumero: 319,
  aviso: AVISO_QA,
  notaRodape: NOTA_QA,
  resumo: [
    "O Instagram está a testar uma área onde cada pessoa pode rever e reorganizar os temas que influenciam as recomendações que recebe.",
    "A experiência continua limitada a um grupo de utilizadores e procura tornar mais visível a forma como o interesse declarado afeta o conteúdo sugerido.",
  ],
  implicacoes: [
    {
      titulo: "Conteúdo",
      texto: "As marcas terão de depender menos de categorias amplas e criar sinais temáticos mais claros em cada publicação.",
    },
    {
      titulo: "Medição",
      texto: "Mudanças no controlo das recomendações podem alterar alcance e retenção antes de aparecerem nas métricas agregadas.",
    },
  ],
  relacionados: [
    { categoria: "Instagram", titulo: "O que muda quando o utilizador escolhe o próprio algoritmo", tempo: "2 min" },
    { categoria: "Conteúdo", titulo: "Sinais editoriais que ajudam uma plataforma a perceber um tema", tempo: "3 min" },
  ],
};
