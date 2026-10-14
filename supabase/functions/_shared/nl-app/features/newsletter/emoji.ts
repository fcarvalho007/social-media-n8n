// Biblioteca de emojis + heurística de sugestão para a "Ferramenta da semana".
// Cada entrada tem palavras-chave em pt-PT/en (sem acentos, minúsculas).
// A mesma biblioteca alimenta o EmojiPicker (pesquisa) e o `sugerirEmoji`.

export type EmojiEntry = { emoji: string; palavras: string[]; categoria: string };

export const CATEGORIAS = [
  "IA & Bots",
  "Vídeo & Imagem",
  "Áudio & Podcast",
  "Escrita & Texto",
  "Dados & Análise",
  "Código & Dev",
  "Produtividade",
  "Web & Ligações",
  "Educação & Livros",
  "Negócio & Dinheiro",
  "Comunicação",
  "Diversos",
] as const;

export const EMOJI_LIBRARY: EmojiEntry[] = [
  // IA & Bots
  { emoji: "🤖", palavras: ["ia","ai","bot","chatbot","llm","gpt","claude","gemini","deepseek","assistente","assistant","robo"], categoria: "IA & Bots" },
  { emoji: "🧠", palavras: ["cerebro","inteligencia","modelo","aprendizagem","machine","learning","ml","raciocinio"], categoria: "IA & Bots" },
  { emoji: "✨", palavras: ["magia","generativo","generative","novo","ia","brilho","sugestao"], categoria: "IA & Bots" },
  { emoji: "🪄", palavras: ["varinha","magia","automagico","transforma","gerar"], categoria: "IA & Bots" },
  { emoji: "🧩", palavras: ["plugin","extensao","integracao","peca","modulo","addon"], categoria: "IA & Bots" },

  // Vídeo & Imagem
  { emoji: "🎬", palavras: ["video","videos","filme","filmes","cinema","edicao","editor","claquete","director"], categoria: "Vídeo & Imagem" },
  { emoji: "🎥", palavras: ["camara","camera","gravar","filmar","gravacao","video"], categoria: "Vídeo & Imagem" },
  { emoji: "📹", palavras: ["camara","videocamara","streaming","live","directo"], categoria: "Vídeo & Imagem" },
  { emoji: "📸", palavras: ["fotografia","foto","fotos","camara","camera","imagem"], categoria: "Vídeo & Imagem" },
  { emoji: "🖼️", palavras: ["imagem","quadro","galeria","fotos","picture","banner"], categoria: "Vídeo & Imagem" },
  { emoji: "🎨", palavras: ["design","ilustra","ilustracao","arte","pintura","paleta","cor","midjourney","dalle","dall","stable","diffusion","canva","figma"], categoria: "Vídeo & Imagem" },
  { emoji: "🖌️", palavras: ["pincel","desenho","design","edicao","retoque"], categoria: "Vídeo & Imagem" },
  { emoji: "🎞️", palavras: ["filme","rolo","cinema","montagem","edicao"], categoria: "Vídeo & Imagem" },

  // Áudio & Podcast
  { emoji: "🎧", palavras: ["audio","podcast","som","musica","music","auscultadores","headphones","elevenlabs"], categoria: "Áudio & Podcast" },
  { emoji: "🎙️", palavras: ["microfone","podcast","gravacao","entrevista","voz","narracao"], categoria: "Áudio & Podcast" },
  { emoji: "🔊", palavras: ["som","volume","audio","altifalante","speaker"], categoria: "Áudio & Podcast" },
  { emoji: "🎵", palavras: ["musica","nota","cancao","song","spotify"], categoria: "Áudio & Podcast" },
  { emoji: "🗣️", palavras: ["fala","voz","narrador","tts","transcricao","texto-para-fala"], categoria: "Áudio & Podcast" },

  // Escrita & Texto
  { emoji: "✍️", palavras: ["escrita","escrever","copy","copywriting","redacao","redaccao","texto","artigo","artigos","blog","autor"], categoria: "Escrita & Texto" },
  { emoji: "📝", palavras: ["notas","nota","apontamento","notion","documento","memorando"], categoria: "Escrita & Texto" },
  { emoji: "📄", palavras: ["documento","pagina","pdf","ficheiro","file"], categoria: "Escrita & Texto" },
  { emoji: "📃", palavras: ["pergaminho","documento","carta","folha"], categoria: "Escrita & Texto" },
  { emoji: "🗒️", palavras: ["bloco","notas","apontamentos","lista"], categoria: "Escrita & Texto" },
  { emoji: "🔤", palavras: ["texto","letras","tipografia","font","fonte","idioma","traducao"], categoria: "Escrita & Texto" },
  { emoji: "🌐", palavras: ["traducao","translate","idiomas","linguas","internacional","global","site","web"], categoria: "Escrita & Texto" },

  // Dados & Análise
  { emoji: "📊", palavras: ["grafico","graficos","dashboard","analytics","analitica","bi","dados","data","kpi","metricas","estatistica","excel","sheets","folha-de-calculo","reporting"], categoria: "Dados & Análise" },
  { emoji: "📈", palavras: ["crescimento","tendencia","subida","grafico","analise","performance"], categoria: "Dados & Análise" },
  { emoji: "📉", palavras: ["queda","descida","grafico","tendencia","perda"], categoria: "Dados & Análise" },
  { emoji: "🧮", palavras: ["calculo","calculadora","abacus","conta","matematica"], categoria: "Dados & Análise" },
  { emoji: "🗄️", palavras: ["base","dados","database","arquivo","armazenamento","storage","sql"], categoria: "Dados & Análise" },
  { emoji: "🔢", palavras: ["numeros","dados","tabela","estatistica"], categoria: "Dados & Análise" },
  { emoji: "📋", palavras: ["clipboard","area-transferencia","lista","tarefas","formulario","form"], categoria: "Dados & Análise" },

  // Código & Dev
  { emoji: "💻", palavras: ["codigo","programacao","dev","developer","engenharia","laptop","portatil","ide","editor","framework"], categoria: "Código & Dev" },
  { emoji: "🖥️", palavras: ["desktop","computador","monitor","secretaria"], categoria: "Código & Dev" },
  { emoji: "⌨️", palavras: ["teclado","input","escrever","dev","code"], categoria: "Código & Dev" },
  { emoji: "🐙", palavras: ["github","git","repositorio","polvo","octocat"], categoria: "Código & Dev" },
  { emoji: "🐍", palavras: ["python","cobra","django","flask","script","data-science"], categoria: "Código & Dev" },
  { emoji: "⚡", palavras: ["velocidade","rapido","raio","performance","vite","next","edge","serverless"], categoria: "Código & Dev" },
  { emoji: "🧪", palavras: ["teste","testing","laboratorio","beta","experimento","qa"], categoria: "Código & Dev" },
  { emoji: "🐛", palavras: ["bug","erro","debug","problema"], categoria: "Código & Dev" },

  // Produtividade
  { emoji: "🗂️", palavras: ["organizacao","organizar","pastas","arquivo","automacao","workflow","zapier","make","n8n","tarefas","produtividade","gestor","gestao"], categoria: "Produtividade" },
  { emoji: "📅", palavras: ["calendario","agenda","reuniao","evento","planeamento","data"], categoria: "Produtividade" },
  { emoji: "🗓️", palavras: ["agenda","planeamento","dia","semana","mes"], categoria: "Produtividade" },
  { emoji: "⏰", palavras: ["tempo","alarme","despertador","horario","gestao-tempo","time"], categoria: "Produtividade" },
  { emoji: "⏱️", palavras: ["cronometro","tempo","medir","timer","pomodoro"], categoria: "Produtividade" },
  { emoji: "✅", palavras: ["feito","concluido","check","tarefa","checklist","todo","done"], categoria: "Produtividade" },
  { emoji: "📌", palavras: ["fixar","importante","pin","destaque","nota"], categoria: "Produtividade" },
  { emoji: "🎯", palavras: ["objectivo","meta","foco","target","alvo","estrategia"], categoria: "Produtividade" },
  { emoji: "🧰", palavras: ["ferramentas","caixa","toolkit","utilidades","kit"], categoria: "Produtividade" },
  { emoji: "🛠️", palavras: ["ferramenta","ferramentas","manutencao","construir","reparar","desenvolvimento"], categoria: "Produtividade" },

  // Web & Ligações
  { emoji: "🔗", palavras: ["link","ligacao","url","conectar","hyperlink","partilhar","share"], categoria: "Web & Ligações" },
  { emoji: "🌍", palavras: ["mundo","global","web","internet","internacional"], categoria: "Web & Ligações" },
  { emoji: "🧭", palavras: ["navegacao","bussola","direccao","navegar","browser","descobrir"], categoria: "Web & Ligações" },
  { emoji: "🛰️", palavras: ["satelite","monitorizacao","tracking","observacao","seo"], categoria: "Web & Ligações" },
  { emoji: "🔍", palavras: ["pesquisa","procurar","search","seo","lupa","descobrir","analise"], categoria: "Web & Ligações" },
  { emoji: "☁️", palavras: ["cloud","nuvem","hosting","aws","gcp","azure","backup"], categoria: "Web & Ligações" },
  { emoji: "🔒", palavras: ["seguranca","privacidade","password","senha","cadeado","protecao","cifra","encrypt"], categoria: "Web & Ligações" },
  { emoji: "🛡️", palavras: ["seguranca","escudo","protecao","antivirus","firewall","gdpr"], categoria: "Web & Ligações" },

  // Educação & Livros
  { emoji: "📚", palavras: ["livros","biblioteca","estudar","aprender","curso","formacao"], categoria: "Educação & Livros" },
  { emoji: "📖", palavras: ["livro","ler","leitura","manual","documentacao"], categoria: "Educação & Livros" },
  { emoji: "🎓", palavras: ["educacao","formacao","academia","universidade","diploma","aprender","curso"], categoria: "Educação & Livros" },
  { emoji: "🧑‍🏫", palavras: ["professor","ensino","formador","aula","instrutor"], categoria: "Educação & Livros" },
  { emoji: "💡", palavras: ["ideia","inspiracao","dica","insight","lampada","criativo"], categoria: "Educação & Livros" },

  // Negócio & Dinheiro
  { emoji: "💼", palavras: ["negocio","business","trabalho","pasta","profissional","empresa","b2b"], categoria: "Negócio & Dinheiro" },
  { emoji: "💰", palavras: ["dinheiro","money","preco","pago","monetizacao","saco","cash"], categoria: "Negócio & Dinheiro" },
  { emoji: "💳", palavras: ["cartao","pagamento","stripe","checkout","credito","debito"], categoria: "Negócio & Dinheiro" },
  { emoji: "🛒", palavras: ["carrinho","compras","ecommerce","loja","shopify","woocommerce"], categoria: "Negócio & Dinheiro" },
  { emoji: "🏦", palavras: ["banco","fintech","banca","conta"], categoria: "Negócio & Dinheiro" },
  { emoji: "🚀", palavras: ["lancamento","launch","startup","rapido","escalar","crescer","foguetao"], categoria: "Negócio & Dinheiro" },

  // Comunicação
  { emoji: "💬", palavras: ["chat","mensagem","conversa","messaging","comunicacao","slack"], categoria: "Comunicação" },
  { emoji: "📧", palavras: ["email","mail","correio","newsletter","mensagem"], categoria: "Comunicação" },
  { emoji: "📨", palavras: ["email","envelope","enviar","inbox","mensagem"], categoria: "Comunicação" },
  { emoji: "📢", palavras: ["anuncio","megafone","marketing","comunicar","promover","announcement"], categoria: "Comunicação" },
  { emoji: "📣", palavras: ["marketing","megafone","promover","divulgacao"], categoria: "Comunicação" },
  { emoji: "🔔", palavras: ["notificacao","alerta","sino","aviso"], categoria: "Comunicação" },

  // Diversos
  { emoji: "🧠", palavras: ["ideias","brainstorm","conhecimento"], categoria: "Diversos" },
  { emoji: "🔥", palavras: ["popular","tendencia","hot","trending","viral"], categoria: "Diversos" },
  { emoji: "⭐", palavras: ["favorito","destaque","estrela","top","recomendado"], categoria: "Diversos" },
  { emoji: "🌟", palavras: ["destaque","brilho","novo","especial","premium"], categoria: "Diversos" },
  { emoji: "🎁", palavras: ["oferta","gratis","free","presente","bonus","brinde"], categoria: "Diversos" },
  { emoji: "🏆", palavras: ["premio","vencedor","melhor","top","trofeu"], categoria: "Diversos" },
  { emoji: "🧭", palavras: ["guia","direccao","orientacao"], categoria: "Diversos" },
  { emoji: "🗺️", palavras: ["mapa","roadmap","planeamento","territorio"], categoria: "Diversos" },
  { emoji: "🧵", palavras: ["thread","twitter","x","fio","conversa","linha"], categoria: "Diversos" },
];

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Pontua cada emoji contra o texto e devolve a melhor sugestão (ou ✨). */
export function sugerirEmoji(nome: string, descricao: string = ""): string {
  const t = ` ${norm(`${nome} ${descricao}`)} `;
  let melhor: { emoji: string; score: number } = { emoji: "✨", score: 0 };
  for (const e of EMOJI_LIBRARY) {
    let s = 0;
    for (const p of e.palavras) {
      const pn = norm(p);
      if (t.includes(` ${pn} `) || t.includes(`-${pn} `) || t.includes(` ${pn}-`)) s += 3;
      else if (t.includes(pn)) s += 1;
    }
    if (s > melhor.score) melhor = { emoji: e.emoji, score: s };
  }
  return melhor.emoji;
}

/** Devolve emojis filtrados pela query. Ordem: correspondências exactas primeiro. */
export function pesquisarEmojis(query: string): EmojiEntry[] {
  const q = norm(query.trim());
  if (!q) return EMOJI_LIBRARY;
  const scored = EMOJI_LIBRARY.map((e) => {
    let s = 0;
    for (const p of e.palavras) {
      const pn = norm(p);
      if (pn === q) s += 10;
      else if (pn.startsWith(q)) s += 5;
      else if (pn.includes(q)) s += 2;
    }
    if (norm(e.categoria).includes(q)) s += 1;
    return { e, s };
  }).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return scored.map((x) => x.e);
}
