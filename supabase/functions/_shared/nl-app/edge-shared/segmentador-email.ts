// Segmentador estrutural de emails de newsletter (v3).
//
// Percorre o HTML e devolve blocos TIPADOS para o pipeline saber para onde
// mandar cada pedaço: notícias, ferramentas, links de leitura, patrocínio, etc.
// TypeScript puro; sem APIs específicas de Deno/Node.
//
// v3: além de <h1>-<h4> e <hr>, reconhece "banners" (parágrafos curtos a
// negrito usados como cabeçalho visual, típicos de beehiiv/Substack), corta o
// rodapé, ignora o índice do topo, mantém o contexto de patrocínio através dos
// sub-títulos e escolhe o URL de cada bloco evitando links globais.

export type TipoBloco =
  | "destaque"           // notícia longa com heading próprio → noticias
  | "breve"              // notícia curta (1-3 frases) com link → noticias
  | "ferramenta_bullet"  // bullet numa secção de "AI Tools" → ferramentas_sugeridas
  | "link_roundup"       // bullet numa secção de "Findings/Resources" → noticias (curta)
  | "patrocinio"         // "Together with X", "Sponsored by" → IGNORAR
  | "tutorial"           // "How to / Step-by-step" → IGNORAR (nesta fase)
  | "meta";              // cabeçalho/índice/rodapé/social → IGNORAR

export type BlocoSegmentado = {
  tipo: TipoBloco;
  titulo: string | null;         // heading da secção-mãe (se existir)
  corpo: string;                 // texto limpo (usado por IA)
  html: string;                  // HTML do bloco (útil para heurísticas de nome)
  url: string | null;            // URL canónico do bloco (primeiro link útil)
  contexto_seccao: string | null;// título da secção onde o bloco vive
};

// ---------- Regex de classificação ----------

const RE_SECCAO_FERRAMENTAS = /\b(ai tools( to (check out|try))?|tools to (check out|try)|tool(s)? spotlight|product picks|cool tools|new tools|top tools|tools of the (week|day)|trending tools|tool(s)? of the (week|day)|ferramentas? (da semana|em destaque))\b/i;

const RE_SECCAO_LINKS = /\b(findings|resources?|quick hits?|the latest( in)?|more (news|reads?|links)|in other news|also worth (a )?(read|reading)|worth (a )?(read|click)|around the web|link(s)? roundup|quick reads?|weekly (digest|reads?)|lightning (round|news)|brief bites|quick bites|news bites|recent news|funding frontlines|rapid fire|bites)\b/i;

const RE_SECCAO_TUTORIAL = /\b(ai tutorial|how to|step[- ]by[- ]step|prompt(s)? that work|tutorial|walkthrough)\b/i;

const RE_SECCAO_PATROCINIO = /\b(together with|in partnership with|sponsor(ed)?( by| content)?|our (partner|sponsor)|presented by|brought to you by|thanks to( our sponsor)?|a message from|from our sponsor|advertise with us)\b/i;

// Índice / sumário do topo — repete os títulos das notícias que vêm a seguir.
const RE_SECCAO_INDICE = /(here'?s what'?s (new|inside)|what'?s (new|inside) today|in today'?s (issue|edition|newsletter)|today'?s (rundown|agenda)|nesta edi(ç|c)(ã|a)o|in this issue)/i;

const RE_META = /\b(unsubscribe|manage (your )?(preferences|subscription)|email preferences|privacy policy|forward(ed)? this|share this|follow us|subscribe now|not subscribed yet|was this (email|forwarded)|that'?s a wrap|see you (in our )?next|rate (today'?s|this) (email|issue)|how did (we|you) do|your feedback|refer (&|and) earn|job opportunities|final note|closing bell|featured reply|welcome back)\b/i;

// Marcadores que iniciam o rodapé — tudo a partir daqui é descartado.
const RE_INICIO_RODAPE = /(that'?s a wrap|thanks for (sticking|reading)|not subscribed yet|we'?d love to hear your thoughts|your feedback helps|see you in our next|update your email preferences|unsubscribe)/i;

// Bullet com formato tipo "🔧 Nome: descrição — link" ou "**Nome** — desc"
const RE_BULLET_FERRAMENTA_TEXTO = /^\s*(?:[\p{Extended_Pictographic}\uFE0F]|[\*\-•→]|\d+[.)])\s*(?:\*\*|__|<strong>)?([A-Z][\w.\- ]{1,60})/u;

// Texto de âncora que denuncia um link administrativo, não editorial.
const RE_ANCORA_LIXO = /^(read online|view (this )?(in browser|online)|subscribe|sign up|sponsor|advertise|share|forward|unsubscribe|watch now|learn more|read more|source|click here|sign up \| sponsor)\.?$/i;

// ---------- Utilitários HTML ----------

function stripTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    // Entidades numéricas e caracteres invisíveis (pré-header de beehiiv).
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/[\u00a0\u200b\u200c\u200d\ufeff\u2060]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

const LIXO_URL = /(unsubscribe|opt-?out|preferences|update.profile|privacy|terms|beehiiv\.com\/subscribe|list-manage|facebook\.com|twitter\.com|x\.com\/|linkedin\.com|instagram\.com|youtube\.com\/channel|tiktok\.com|mailto:|\.png|\.jpe?g|\.gif|beacon|open\?)/i;

function todosOsLinks(html: string): { url: string; texto: string }[] {
  const re = /<a\s+[^>]*href=["'](https?:\/\/[^"'#\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const out: { url: string; texto: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (LIXO_URL.test(m[1])) continue;
    const texto = stripTags(m[2]).trim();
    if (RE_ANCORA_LIXO.test(texto)) continue;
    out.push({ url: m[1], texto });
  }
  return out;
}

function primeiroUrlUtil(html: string): string | null {
  return todosOsLinks(html)[0]?.url ?? null;
}

function normalizarHtml(html: string): string {
  // Remove head/style/script e preserva o body se existir.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const cru = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<img[^>]*>/gi, " ");
  return cru;
}

/** Corta tudo a partir do primeiro marcador de rodapé (fecho da newsletter). */
function cortarRodape(html: string): string {
  // Procura o marcador no texto de cada <p>/<td>/<h*> e corta no primeiro.
  const re = /<(p|td|h[1-4]|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let corte = -1;
  const metadeInicial = Math.floor(html.length * 0.45);
  while ((m = re.exec(html)) !== null) {
    if (m.index < metadeInicial) continue; // rodapé nunca está no topo
    const t = stripTags(m[2]);
    if (t.length > 200) continue;
    if (RE_INICIO_RODAPE.test(t)) { corte = m.index; break; }
  }
  return corte > 0 ? html.slice(0, corte) : html;
}

// ---------- Marcadores de secção (headings + banners) ----------

type Marcador = { indice: number; fim: number; titulo: string; nivel: number; banner: boolean };

function racioMaiusculas(s: string): number {
  const letras = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (!letras) return 0;
  const maius = letras.replace(/[^A-ZÀ-Þ]/g, "").length;
  return maius / letras.length;
}

/** Um "banner" é um parágrafo curto a negrito usado como cabeçalho visual. */
function pareceBanner(htmlInterno: string, texto: string): boolean {
  if (!texto || texto.length > 60) return false;
  if (/[.!?;:]$/.test(texto) && !/:$/.test(texto)) return false;
  if (/<a\s/i.test(htmlInterno)) return false;
  const negrito = /<(b|strong)\b/i.test(htmlInterno);
  const grande = /font-size:\s*(1\.[3-9]|[2-9])(rem|em)|font-size:\s*(1[89]|[2-9]\d)px/i.test(htmlInterno);
  const conhecido = RE_SECCAO_FERRAMENTAS.test(texto) || RE_SECCAO_LINKS.test(texto)
    || RE_SECCAO_TUTORIAL.test(texto) || RE_SECCAO_PATROCINIO.test(texto)
    || RE_SECCAO_INDICE.test(texto);
  if (conhecido && (negrito || grande || racioMaiusculas(texto) > 0.6)) return true;
  return negrito && (grande || racioMaiusculas(texto) > 0.6) && texto.split(/\s+/).length <= 8;
}

function recolherMarcadores(html: string): Marcador[] {
  const marcadores: Marcador[] = [];

  const reH = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = reH.exec(html)) !== null) {
    const titulo = stripTags(m[2]);
    if (!titulo) continue;
    const nivelTag = Number(m[1]);
    // h5/h6 são usados por muitas newsletters (beehiiv) de duas maneiras: como
    // "kicker" de secção em maiúsculas ("AI IN EDUCATION") ou como rótulo
    // interno do artigo ("Key details:"). Só o primeiro caso abre secção.
    let nivel = nivelTag;
    if (nivelTag >= 5) {
      const palavras = titulo.split(/\s+/).length;
      const kicker = !/[:.]$/.test(titulo) && palavras <= 6 && racioMaiusculas(titulo) > 0.8;
      if (!kicker) continue;
      nivel = 2;
    }
    marcadores.push({
      indice: m.index,
      fim: m.index + m[0].length,
      titulo,
      nivel,
      banner: false,
    });
  }


  const reP = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = reP.exec(html)) !== null) {
    const texto = stripTags(m[1]);
    if (!pareceBanner(m[1], texto)) continue;
    marcadores.push({
      indice: m.index,
      fim: m.index + m[0].length,
      titulo: texto,
      nivel: 2,
      banner: true,
    });
  }

  const reHr = /<hr[^>]*\/?>/gi;
  while ((m = reHr.exec(html)) !== null) {
    marcadores.push({ indice: m.index, fim: m.index + m[0].length, titulo: "", nivel: 4, banner: false });
  }

  marcadores.sort((a, b) => a.indice - b.indice);
  // Remove marcadores sobrepostos (um banner dentro de um heading, etc.).
  const limpos: Marcador[] = [];
  for (const mk of marcadores) {
    const anterior = limpos[limpos.length - 1];
    if (anterior && mk.indice < anterior.fim) continue;
    limpos.push(mk);
  }
  return limpos;
}

// ---------- Segmentação em SECÇÕES ----------

type SeccaoBruta = { titulo: string; html: string; banner: boolean; nivel: number; vazia: boolean };

function segmentarSeccoes(html: string): SeccaoBruta[] {
  const marcadores = recolherMarcadores(html);
  const partes: SeccaoBruta[] = [];

  if (marcadores.length === 0) {
    return [{ titulo: "", html, banner: false, nivel: 0, vazia: false }];
  }

  const inicial = html.slice(0, marcadores[0].indice);
  if (stripTags(inicial).length >= 200) {
    partes.push({ titulo: "", html: inicial, banner: false, nivel: 0, vazia: false });
  }

  for (let i = 0; i < marcadores.length; i++) {
    const mk = marcadores[i];
    const fimSeccao = i + 1 < marcadores.length ? marcadores[i + 1].indice : html.length;
    const corpo = html.slice(mk.fim, fimSeccao);
    // Secções sem corpo (kickers isolados) continuam na lista: não geram
    // blocos, mas definem o contexto das secções seguintes.
    const vazia = stripTags(corpo).length < 40 && todosOsLinks(corpo).length === 0;
    partes.push({ titulo: mk.titulo, html: corpo, banner: mk.banner, nivel: mk.nivel, vazia });
  }

  return partes;
}

// ---------- Extração de bullets ----------

function extrairBullets(seccao: SeccaoBruta): { html: string; texto: string; url: string | null }[] {
  const bullets: { html: string; texto: string; url: string | null }[] = [];

  // 1) <li>
  const reLi = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = reLi.exec(seccao.html)) !== null) {
    const html = m[1];
    const texto = stripTags(html);
    if (texto.length < 15) continue;
    bullets.push({ html, texto, url: primeiroUrlUtil(html) });
  }
  if (bullets.length >= 2) return bullets;

  // 2) Parágrafos curtos (fallback quando não há <ul>) — com ou sem link.
  const reP = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  bullets.length = 0;
  while ((m = reP.exec(seccao.html)) !== null) {
    const html = m[1];
    const texto = stripTags(html);
    if (texto.length < 20 || texto.length > 600) continue;
    if (pareceBanner(html, texto)) continue;
    bullets.push({ html, texto, url: primeiroUrlUtil(html) });
  }
  if (bullets.length >= 2) return fundirTituloCorpo(bullets);

  // 3) Linhas de texto separadas por <br> com bullet char
  const linhas = decodeEntities(stripTags(seccao.html)).split(/\n|(?:•|→|▶|▪|●)/).map((l) => l.trim()).filter((l) => l.length >= 20);
  if (linhas.length >= 2) {
    const links = todosOsLinks(seccao.html);
    return linhas.slice(0, 12).map((texto, i) => ({
      html: "",
      texto,
      url: links[i]?.url ?? null,
    }));
  }

  return [];
}

type Bullet = { html: string; texto: string; url: string | null };

/**
 * Nos roundups do tipo "The latest in AI", cada item vem em dois parágrafos:
 * um título curto e, a seguir, o resumo. Junta-os num único bullet.
 */
function fundirTituloCorpo(bullets: Bullet[]): Bullet[] {
  const out: Bullet[] = [];
  for (let i = 0; i < bullets.length; i++) {
    const actual = bullets[i];
    const seguinte = bullets[i + 1];
    const comecaBullet = (t: string) => /^\s*(?:[\p{Extended_Pictographic}\uFE0F]|[•→▶▪●\-*]|\d+[.)])/u.test(t);
    const ehTitulo = actual.texto.length <= 100 && !/[.!?]$/.test(actual.texto) && !comecaBullet(actual.texto);
    if (ehTitulo && seguinte && !comecaBullet(seguinte.texto) && seguinte.texto.length > actual.texto.length) {
      out.push({
        html: `${actual.html}${seguinte.html}`,
        texto: `${actual.texto}. ${seguinte.texto}`.slice(0, 700),
        url: actual.url ?? seguinte.url,
      });
      i++;
      continue;
    }
    out.push(actual);
  }
  return out;
}

// ---------- Classificação da secção ----------

type Classificacao = TipoBloco | "conteudo";

function classificarTitulo(titulo: string): Classificacao {
  const t = (titulo ?? "").toLowerCase();
  if (!t) return "conteudo";
  if (RE_SECCAO_INDICE.test(t)) return "meta";
  if (RE_META.test(t)) return "meta";
  if (RE_SECCAO_PATROCINIO.test(t)) return "patrocinio";
  if (RE_SECCAO_FERRAMENTAS.test(t)) return "ferramenta_bullet";
  if (RE_SECCAO_LINKS.test(t)) return "link_roundup";
  if (RE_SECCAO_TUTORIAL.test(t)) return "tutorial";
  return "conteudo";
}

/**
 * Um "kicker" é a etiqueta curta que abre um bloco (OPENAI, TOGETHER WITH FIN,
 * AI Tools to check out). Só os kickers mudam o contexto da secção — os títulos
 * de artigo que vêm a seguir herdam-no.
 */
function ehKicker(s: SeccaoBruta): boolean {
  if (s.banner) return true;
  if (!s.titulo) return false;
  if (s.titulo.length > 45) return false;
  return s.nivel >= 4 || racioMaiusculas(s.titulo) > 0.7;
}

// ---------- Segmentador principal ----------

export function segmentar(html: string | null): BlocoSegmentado[] {
  if (!html) return [];
  const normalized = cortarRodape(normalizarHtml(html));
  const seccoes = segmentarSeccoes(normalized);
  const blocos: BlocoSegmentado[] = [];

  // Contexto herdado do último kicker (ex.: patrocínio ou secção de ferramentas).
  let contexto: Classificacao = "conteudo";
  let contextoTitulo = "";

  for (const s of seccoes) {
    const propria = classificarTitulo(s.titulo);
    if (ehKicker(s)) {
      contexto = propria;
      contextoTitulo = s.titulo;
    }
    if (s.vazia) continue; // kicker isolado: só define contexto
    const tipo: Classificacao = propria !== "conteudo" ? propria : contexto;
    const tituloSeccao = s.titulo || contextoTitulo || null;

    if (tipo === "meta" || tipo === "patrocinio" || tipo === "tutorial") {
      blocos.push({
        tipo,
        titulo: tituloSeccao,
        corpo: stripTags(s.html).slice(0, 400),
        html: s.html,
        url: primeiroUrlUtil(s.html),
        contexto_seccao: tituloSeccao,
      });
      continue;
    }

    if (tipo === "ferramenta_bullet") {
      const bullets = extrairBullets(s);
      if (bullets.length === 0) continue;
      for (const b of bullets) {
        blocos.push({
          tipo: "ferramenta_bullet",
          titulo: tituloSeccao,
          corpo: b.texto.slice(0, 500),
          html: b.html,
          url: b.url,
          contexto_seccao: tituloSeccao,
        });
      }
      continue;
    }

    if (tipo === "link_roundup") {
      const bullets = extrairBullets(s);
      if (bullets.length === 0) continue;
      for (const b of bullets) {
        if (!b.url) continue; // link_roundup sem URL não serve
        blocos.push({
          tipo: "link_roundup",
          titulo: tituloSeccao,
          corpo: b.texto.slice(0, 500),
          html: b.html,
          url: b.url,
          contexto_seccao: tituloSeccao,
        });
      }
      continue;
    }

    // Conteúdo genérico: tenta partir por parágrafos.
    const paragrafos = (s.html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? []);
    const textoTotal = stripTags(s.html);
    if (paragrafos.length >= 3 && textoTotal.length >= 400) {
      // Provável destaque com múltiplos parágrafos → 1 bloco
      blocos.push({
        tipo: "destaque",
        titulo: tituloSeccao,
        corpo: (s.titulo ? `${s.titulo}. ` : "") + textoTotal.slice(0, 4000),
        html: s.html,
        url: primeiroUrlUtil(s.html),
        contexto_seccao: tituloSeccao,
      });
    } else if (paragrafos.length >= 2) {
      // Vários parágrafos curtos com link → breves
      let apanhou = 0;
      for (const p of paragrafos) {
        const t = stripTags(p);
        if (t.length < 40) continue;
        const url = primeiroUrlUtil(p);
        if (!url) continue;
        blocos.push({
          tipo: "breve",
          titulo: tituloSeccao,
          corpo: t.slice(0, 600),
          html: p,
          url,
          contexto_seccao: tituloSeccao,
        });
        apanhou++;
      }
      if (apanhou === 0 && textoTotal.length >= 150) {
        blocos.push({
          tipo: "destaque",
          titulo: tituloSeccao,
          corpo: (s.titulo ? `${s.titulo}. ` : "") + textoTotal.slice(0, 4000),
          html: s.html,
          url: primeiroUrlUtil(s.html),
          contexto_seccao: tituloSeccao,
        });
      }
    } else if (textoTotal.length >= 100) {
      const url = primeiroUrlUtil(s.html);
      blocos.push({
        tipo: textoTotal.length >= 400 ? "destaque" : "breve",
        titulo: tituloSeccao,
        corpo: (s.titulo ? `${s.titulo}. ` : "") + textoTotal.slice(0, 4000),
        html: s.html,
        url,
        contexto_seccao: tituloSeccao,
      });
    }
  }

  // Heurística extra: se um "destaque" começa com um bullet de ferramenta e
  // não vem numa secção de ferramentas, promove para ferramenta_bullet.
  for (const b of blocos) {
    if (b.tipo === "destaque" && b.corpo.length < 300 && RE_BULLET_FERRAMENTA_TEXTO.test(b.corpo) && b.url) {
      b.tipo = "ferramenta_bullet";
    }
  }

  return limparUrlsGlobais(blocos);
}

/**
 * Links que aparecem em muitos blocos (logótipo, "Read online", subscrição)
 * não identificam nenhuma notícia — são removidos para a IA não os herdar.
 */
function limparUrlsGlobais(blocos: BlocoSegmentado[]): BlocoSegmentado[] {
  const contagem = new Map<string, number>();
  for (const b of blocos) {
    if (!b.url) continue;
    contagem.set(b.url, (contagem.get(b.url) ?? 0) + 1);
  }
  const usados = new Set<string>();
  for (const b of blocos) {
    if (!b.url) continue;
    if ((contagem.get(b.url) ?? 0) >= 3) { b.url = null; continue; }
    // Dois blocos distintos não podem partilhar o mesmo URL.
    if (usados.has(b.url)) { b.url = null; continue; }
    usados.add(b.url);
  }
  return blocos;
}

// Ordena por prioridade quando há budget de IA limitado.
export function priorizar(blocos: BlocoSegmentado[]): BlocoSegmentado[] {
  const ord: Record<TipoBloco, number> = {
    destaque: 0,
    ferramenta_bullet: 1,
    breve: 2,
    link_roundup: 3,
    patrocinio: 9,
    tutorial: 9,
    meta: 9,
  };
  return [...blocos].sort((a, b) => ord[a.tipo] - ord[b.tipo]);
}
