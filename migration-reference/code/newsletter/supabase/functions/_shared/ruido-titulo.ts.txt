// Filtro único de títulos administrativos e entradas sem conteúdo real.
//
// Usado por TODAS as portas de entrada de notícias (emails recebidos,
// curadoria RSS/HTML, colagem de texto e adição manual). Antes cada motor
// tinha a sua própria lista parcial, pelo que páginas institucionais
// («Termos de serviço», «Política de privacidade», «Sobre nós») entravam
// na fila de pendentes.

/** Rodapés administrativos, páginas institucionais e blocos promocionais. */
/** Footer phrases that never appear in a real headline: matched anywhere. */
const RODAPE_INEQUIVOCO =
  /(this email was sent|este email foi enviado|view (this )?in browser|ver no browser|all rights reserved|direitos reservados|manage your subscription|unsubscribe|desinscrever)/i;

const RUIDO_TITULO =
  /(termos (de|e) (servi|uso|utiliza)|termos e condi|terms of (service|use)|condi(ç|c)(õ|o)es gerais|pol[ií]tica de privacidade|privacy policy|pol[ií]tica de cookies|cookie (policy|settings)|aviso legal|legal notice|rodap[ée]|footer|direitos reservados|all rights reserved|copyright|©|sobre n[óo]s|about us|quem somos|contact(o|os|s)?( us)?|fale connosco|ficha t[ée]cnica|mapa do site|sitemap|prefer[eê]nci?as? de e-?mail|email preferences|gerir prefer[eê]ncias|manage preferences|unsubscribe|desinscrever|cancelar (a )?subscri|subscri(ç|c)(ã|a)o|subscription|convite para subscri|subscreve|subscreva|inscreve-te|manage your subscription|advertise with us|together with|in partnership with|patrocinad|sponsor|partilha (esta|a) newsletter|share this|feedback|d[aá] a tua opini[ãa]o|segue-nos|follow us|ver (este )?email|this email was sent|este email foi enviado|ver no browser|view (this )?in browser|ler online|read online|read in browser|clica aqui|click here|saber mais|learn more|ler mais|read more|carreiras|careers|trabalha connosco|newsletter archive|arquivo da newsletter|login|iniciar sess[ãa]o|criar conta|sign ?up|log ?in)/i;

const PALAVRAS_VAZIAS = /^(not[ií]cias?|news|blog|home|in[ií]cio|artigos?|posts?|updates?|novidades|destaques|resumo|newsletter)$/i;

/** Títulos-marcador que a extracção deixa quando não conseguiu ler nada. */
const TITULOS_MARCADOR =
  /^(sem dados|sem titulo|sem informacao|sem conteudo|n\/?a|na|null|undefined|\(?sem assunto\)?|untitled|no title|no data)$/i;

/** Domínios/URLs que continuam a ser redireccionadores por resolver. */
const LINK_RASTREIO =
  /(click\.|clicks\.|link\.|links\.|email\.|mail\.|track\.|tracking\.|e\.|go\.)[a-z0-9.-]+\/|\/(ss\/c|CL0\/|track|redirect|r\.php)|[?&]qs=|beehiiv\.com\/[a-z0-9-]+\/c\//i;

function normalizar(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dominioDe(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export type MotivoLixo = "pagina_institucional" | "titulo_vazio" | "titulo_sem_conteudo";

/**
 * Devolve o motivo pelo qual o título deve ser descartado, ou `null` quando é
 * uma notícia legítima. Nunca chama IA — corre antes de qualquer extracção.
 */
export function motivoTituloLixo(
  titulo: string,
  descricao?: string | null,
  url?: string | null,
): MotivoLixo | null {
  const t = (titulo || "").trim();
  if (!t) return "titulo_vazio";
  if (RODAPE_INEQUIVOCO.test(t)) return "pagina_institucional";
  // Labels only count when they ARE the title (short and starting with the label);
  // real headlines mentioning «contactos», «login», «subscrição»… must pass.
  const semAdorno = t.replace(/^[^\p{L}\p{N}]+/u, "");
  const palavras = semAdorno.split(/\s+/).filter(Boolean).length;
  if (palavras <= 6) {
    const m = RUIDO_TITULO.exec(semAdorno);
    if (m && m.index === 0) return "pagina_institucional";
  }

  const norm = normalizar(t);
  if (TITULOS_MARCADOR.test(norm)) return "titulo_vazio";

  // Link de rastreio ainda por resolver + título pobre (sem números, sem nome
  // próprio, poucas palavras) → não dá para publicar nada de útil.
  if (url && LINK_RASTREIO.test(url)) {
    const temNumero = /\d/.test(t);
    const temNomeProprio = /(?:^|\s)[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\wÀ-ÿ]{2,}/.test(t.slice(1));
    if (!temNumero && !temNomeProprio && t.split(/\s+/).length <= 6) return "titulo_sem_conteudo";
  }

  if (norm.length < 12 && !/\d/.test(norm)) {
    // Títulos telegráficos («Notícias», «Blog», nome do site) não são notícia.
    if (PALAVRAS_VAZIAS.test(norm) || norm.split(" ").length <= 2) return "titulo_sem_conteudo";
  }

  const dom = dominioDe(url);
  if (dom) {
    const domSemTld = dom.split(".")[0];
    if (norm === dom || norm === domSemTld) return "titulo_sem_conteudo";
  }

  // Sem descrição e com título de duas palavras não dá para publicar nada útil.
  const desc = normalizar(descricao ?? "");
  if (!desc && norm.split(" ").length <= 3) return "titulo_sem_conteudo";

  return null;
}

export function ehTituloLixo(
  titulo: string,
  descricao?: string | null,
  url?: string | null,
): boolean {
  return motivoTituloLixo(titulo, descricao, url) !== null;
}

/** Rótulo legível para os resumos de cada corrida. */
export function descreverMotivoLixo(m: MotivoLixo): string {
  return m === "pagina_institucional"
    ? "página institucional"
    : m === "titulo_vazio"
      ? "sem título"
      : "título sem conteúdo";
}
