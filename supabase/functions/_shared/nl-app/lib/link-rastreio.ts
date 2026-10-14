// Detecção de links de redireccionamento/rastreio de plataformas de email.
// Estes URLs (ex.: link.mail.beehiiv.com/ss/c/...) não servem como fonte
// pública da notícia: expiram, são opacos e não identificam o editor
// original. Quando aparecem, o normal é procurar uma fonte alternativa.

/** Domínios (ou sufixos de domínio) sempre considerados redireccionadores. */
const DOMINIOS_RASTREIO = [
  "link.mail.beehiiv.com",
  "beehiiv.com",
  "list-manage.com",
  "sendgrid.net",
  "ct.sendgrid.net",
  "hubspotlinks.com",
  "hs-sending.net",
  "convertkit-mail.com",
  "convertkit-mail2.com",
  "mailerlite.com",
  "click.pstmrk.it",
  "pstmrk.it",
  "substack.com",
  "bit.ly",
  "t.co",
  "lnkd.in",
  "tinyurl.com",
  "rebrand.ly",
  "trk.klclick.com",
  "sparkpostmail.com",
  "insight.insiderintelligence.com",
  "click.insight.insiderintelligence.com",
  "cmail19.com",
  "mailchi.mp",
];


/** Prefixos de subdomínio típicos de servidores de tracking. */
const PREFIXOS_RASTREIO = /^(link|links|click|clicks|track|tracking|email|mail|e|em|url|go|r)\./i;

/** Caminhos que denunciam um redireccionador mesmo em domínios genéricos. */
const CAMINHOS_RASTREIO = /^\/(ss\/c|ls\/click|redirect|track|c\/|e\/|CL0\/)/i;

function hostname(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Verdadeiro quando o URL é um link de redireccionamento/rastreio de email. */
export function isLinkRastreio(url: string | null | undefined): boolean {
  const raw = (url ?? "").trim();
  if (!raw) return false;
  const host = hostname(raw);
  if (!host) return false;

  const dominioConhecido = DOMINIOS_RASTREIO.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );

  let caminho = "";
  try {
    caminho = new URL(raw).pathname;
  } catch {
    caminho = "";
  }

  // Substack só é redireccionador no caminho /redirect/…
  if (host === "substack.com" || host.endsWith(".substack.com")) {
    return /^\/redirect\//i.test(caminho);
  }

  if (dominioConhecido && (PREFIXOS_RASTREIO.test(host) || CAMINHOS_RASTREIO.test(caminho) || host.split(".").length <= 2)) {
    return true;
  }
  if (dominioConhecido && CAMINHOS_RASTREIO.test(caminho)) return true;
  if (dominioConhecido) return true;

  // Domínios desconhecidos: exige prefixo de tracking + caminho suspeito.
  return PREFIXOS_RASTREIO.test(host) && CAMINHOS_RASTREIO.test(caminho);
}

/** Versão curta e legível de um URL longo (para mostrar nos cartões). */
export function abreviarUrl(url: string | null | undefined, max = 64): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  const host = hostname(raw);
  if (!host) return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
  let caminho = "";
  try {
    caminho = new URL(raw).pathname.replace(/\/$/, "");
  } catch {
    caminho = "";
  }
  const texto = `${host}${caminho}`;
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

/**
 * Verdadeiro quando o URL não aponta para um artigo concreto: homepage,
 * secção genérica ou apenas parâmetros de rastreio (ex.: emarketer.com/?jid=…).
 * Estes links levam o leitor a uma página generalista, não à notícia.
 */
export function urlSemArtigo(url: string | null | undefined): boolean {
  const raw = (url ?? "").trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) return true;
    if (segs.length === 1 && /^(news|noticias|blog|artigos|articles|home|index(\.\w+)?)$/i.test(segs[0])) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Domínios de rastreio cujo editor real é conhecido. Serve para pesquisar
 * primeiro dentro do site do editor (`site:emarketer.com "título"`).
 */
const RASTREIO_PARA_EDITOR: Array<{ teste: RegExp; dominio: string; nome: string }> = [
  { teste: /insiderintelligence\.com$/i, dominio: "emarketer.com", nome: "eMarketer" },
  { teste: /^(click\.)?insight\./i, dominio: "emarketer.com", nome: "eMarketer" },
  { teste: /emarketer\.com$/i, dominio: "emarketer.com", nome: "eMarketer" },
  { teste: /theinformation\.com$/i, dominio: "theinformation.com", nome: "The Information" },
  { teste: /axios\.com$/i, dominio: "axios.com", nome: "Axios" },
  { teste: /theverge\.com$/i, dominio: "theverge.com", nome: "The Verge" },
  { teste: /techcrunch\.com$/i, dominio: "techcrunch.com", nome: "TechCrunch" },
  { teste: /socialmediatoday\.com$/i, dominio: "socialmediatoday.com", nome: "Social Media Today" },
  { teste: /searchengineland\.com$/i, dominio: "searchengineland.com", nome: "Search Engine Land" },
];

export type Editor = { dominio: string; nome: string };

/**
 * Tenta deduzir o editor original a partir de um URL (mesmo de rastreio).
 * Devolve `null` quando o domínio é genérico (beehiiv, bit.ly, …).
 */
export function editorDeUrl(url: string | null | undefined): Editor | null {
  const host = hostname((url ?? "").trim());
  if (!host) return null;
  for (const m of RASTREIO_PARA_EDITOR) {
    if (m.teste.test(host)) return { dominio: m.dominio, nome: m.nome };
  }
  if (isLinkRastreio(url)) return null;
  // Domínio normal do editor: usa-o directamente.
  const partes = host.split(".");
  const base = partes.length > 2 ? partes.slice(-2).join(".") : host;
  const nome = base.replace(/\.(com|net|org|pt|io|co|ai|news)(\.\w+)?$/i, "").replace(/[-_]/g, " ");
  return { dominio: base, nome: nome.charAt(0).toUpperCase() + nome.slice(1) };
}

/** Etiquetas legíveis para o estado da fonte guardado na base de dados. */
export type FonteEstado = "ok" | "resolvida" | "por_confirmar";

export function estadoFonte(v: string | null | undefined): FonteEstado {
  return v === "resolvida" || v === "por_confirmar" ? v : "ok";
}

