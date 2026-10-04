// Edição simulada, usada apenas no ecrã interno de pré-visualização.
// Nunca é gravada nem servida em rotas públicas: existe só para testar a UX
// com uma edição densa (49 atualidades) enquanto não há edição publicada.

import type { PaginaEdicaoPublica, GrupoAtualidades } from "../../lib/revista-web.functions.ts";

type Atualidade = GrupoAtualidades["itens"][number];

const CATS: Array<[string, string, number]> = [
  ["ia", "Inteligência artificial", 11],
  ["google", "Google", 8],
  ["social", "Social", 6],
  ["meta", "Meta", 6],
  ["seo", "SEO", 5],
  ["media", "Media", 4],
  ["ecommerce", "E-commerce", 5],
  ["privacidade", "Privacidade e dados", 4],
];


const TITULOS = [
  "O novo modelo abre a porta a agentes que compram sozinhos",
  "A publicidade contextual volta a ganhar terreno nas redes",
  "Editores europeus somam pressão sobre a indexação automática",
  "Investimento em vídeo curto cresce pelo quinto trimestre seguido",
  "Marcas testam assistentes próprios em vez de chatbots genéricos",
  "Motores de resposta começam a citar menos fontes primárias",
  "Retail media consolida-se como terceira grande fatia do digital",
  "A medição pós-cookie continua sem um padrão aceite por todos",
];

function atualidade(cat: string, rotulo: string, i: number): Atualidade {
  const t = TITULOS[i % TITULOS.length];
  return {
    noticiaId: `${cat}-${i}`,
    titulo: `${t}`,
    descricao: i % 3 === 0 ? "" : "Contexto curto da notícia, com o essencial para decidir se vale a leitura completa.",
    url: `https://exemplo.pt/${cat}/${i}`,
    categoria: cat,
    categoriaRotulo: rotulo,
    papel: i % 5 === 0 ? "so_site" : "radar",
  };
}

export function paginaSimulada(): PaginaEdicaoPublica {
  const grupos: GrupoAtualidades[] = CATS.map(([id, rotulo, n]) => ({
    categoria: id,
    rotulo,
    itens: Array.from({ length: n }, (_, i) => atualidade(id, rotulo, i)),
  }));

  const atualidades = grupos.flatMap((g) => g.itens);

  return {
    estrutura: {
      edicao: {
        id: "simulada",
        numero: 999,
        assunto: "Edição simulada",
        data_envio_prevista: "2026-08-27",
        wordpress_post_url: null,
      },
      preheader: "Edição simulada para testar a versão web.",
      cronica: {
        titulo: "Quantos anos tens, e quem é que decide a resposta?",
        subtitulo: "A Internet inteira quer saber, e já não aceita a tua palavra.",
        lede: "A verificação de idade deixou de ser um detalhe legal enterrado nos termos de utilização e passou a ser uma decisão de produto que afecta toda a gente: quem se regista, quem é alcançado por uma campanha e quem simplesmente desiste a meio do formulário.",
        excerto:
          "Durante anos, provar a idade online resumia-se a escrever uma data de nascimento numa caixa. Essa era acabou sem grande aviso.\n\nO que muda agora não é apenas o cumprimento da lei: é a forma como as plataformas passam a conhecer quem está do outro lado do ecrã, e o que fazem com esse conhecimento.\n\nPara quem trabalha em marketing, a consequência prática é simples de enunciar e difícil de resolver: menos alcance orgânico junto de públicos jovens e mais atrito em qualquer registo.\n\nHá ainda uma segunda ordem de efeitos, menos discutida. Se a identidade passa a ser verificada por terceiros, o custo de entrada num canal deixa de ser criativo e passa a ser operacional: integrações, contratos, auditorias. As equipas pequenas sentem isso primeiro.\n\nA minha expectativa é que o mercado se organize em torno de dois ou três fornecedores de verificação, como aconteceu com pagamentos. Quando isso acontecer, a discussão deixa de ser sobre privacidade e passa a ser sobre dependência.",

        url: "https://exemplo.pt/cronica",
      },
      momento: { etiqueta: "O número da semana", valor: "42%", descricao: "das marcas europeias já testou verificação de idade em campanhas próprias." },
      momentoPosicao: 99,
  pullQuotePosicao: 99,
  ledePosicao: 0,
  pullQuote: "A identidade tornou-se infraestrutura de marketing — e ninguém pediu autorização ao mercado.",
      destaques: [0, 1, 2].map((i) => ({
        itemId: `d${i}`,
        noticiaId: `d${i}`,
        titulo: TITULOS[i],
        url: `https://exemplo.pt/destaque/${i}`,
        categoria: CATS[i][0],
        categoriaRotulo: CATS[i][1],
        resumoFactual:
          "O anúncio foi feito esta semana e entra em vigor no próximo trimestre, com impacto directo nas equipas de aquisição.",
        minhaLeitura:
          "Se dependes deste canal para gerar procura, o momento de diversificar era ontem. A janela de arbitragem fecha depressa.",
        ctaRotulo: "Ler o anúncio",
        data: "2026-08-25",
      })),
      radar: [3, 4, 5, 6, 7].map((i) => ({
        itemId: `r${i}`,
        noticiaId: `r${i}`,
        titulo: TITULOS[i % TITULOS.length],
        url: `https://exemplo.pt/radar/${i}`,
        categoria: CATS[i % CATS.length][0],
        categoriaRotulo: CATS[i % CATS.length][1],
        nota: "Nota curta de contexto para leitura rápida.",
      })),
      recomendacao: {
        tipo: "Podcast",
        meta: "Episódio 214 · 38 min",
        titulo: "Como medir marketing quando os dados deixam de existir",
        url: "https://exemplo.pt/podcast",
        nota: "Uma conversa útil para quem tem de justificar orçamento sem atribuição fiável.",
      },
      ferramentas: [],
      podcast: null,
      livro: null,
      servicos: null,
      atualidades,
      urlPagina: "/edicoes/999",
      imagem: null,
  imagemPosicao: 0,
  problemas: [],
    },
    grupos,
    anterior: { numero: 998, titulo: "O fim silencioso do tráfego de pesquisa" },
    seguinte: null,
    enviada: true,
    briefs: {},
  };
}

/**
 * Perfil mínimo: testa o layout sem os opcionais.
 * Sem momento, sem pull quote, sem recomendação, sem radar, um só destaque
 * e poucas atualidades numa única categoria.
 */
export function paginaSimuladaMinima(): PaginaEdicaoPublica {
  const base = paginaSimulada();
  const grupos: GrupoAtualidades[] = [
    {
      categoria: "ia",
      rotulo: "Inteligência artificial",
      itens: Array.from({ length: 3 }, (_, i) => atualidade("ia", "Inteligência artificial", i)),
    },
  ];

  return {
    estrutura: {
      ...base.estrutura,
      edicao: { ...base.estrutura.edicao, numero: 998, assunto: "Edição simulada mínima" },
      preheader: "Edição mínima para testar a ausência de blocos opcionais.",
      cronica: {
        titulo: "O mês em que ninguém mudou de ideias",
        subtitulo: "",
        lede: "",
        excerto:
          "Houve semanas em que o mercado se limitou a confirmar o que já se sabia. Esta foi uma delas, e isso também é informação.",
        url: "",
      },
      momento: null,
      pullQuote: "",
      destaques: base.estrutura.destaques.slice(0, 1),
      radar: [],
      recomendacao: null,
      atualidades: grupos.flatMap((g) => g.itens),
      urlPagina: "/edicoes/998",
    },
    grupos,
    anterior: null,
    seguinte: null,
    enviada: true,
    briefs: {},
  };
}

