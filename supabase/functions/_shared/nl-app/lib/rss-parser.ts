// Parser de RSS/Atom partilhado entre o cron da curadoria e o endpoint de
// teste manual em `/definicoes`. Sem dependências externas — usa apenas
// regex sobre o XML, suficiente para os feeds típicos.

export type ItemFeed = {
  titulo: string;
  url: string;
  descricao: string;
  publicado: number; // epoch ms
};

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function pickTag(bloco: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = bloco.match(re);
  return m ? m[1] : null;
}

function pickLink(bloco: string): string | null {
  const atom = bloco.match(/<link[^>]*?href=["']([^"']+)["'][^>]*\/?>/i);
  if (atom) {
    const rel = atom[0].match(/rel=["']([^"']+)["']/i);
    if (!rel || rel[1].toLowerCase() === "alternate") return atom[1];
  }
  const rss = pickTag(bloco, "link");
  if (rss) return rss.trim();
  return null;
}

export function parseFeed(xml: string): ItemFeed[] {
  const items: ItemFeed[] = [];
  const regexItem = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = regexItem.exec(xml)) !== null) {
    const bloco = m[0];
    const titulo = stripTags(pickTag(bloco, "title") ?? "");
    const url = (pickLink(bloco) ?? "").trim();
    const desc = stripTags(
      pickTag(bloco, "description") ?? pickTag(bloco, "summary") ?? pickTag(bloco, "content") ?? "",
    );
    const dataRaw = pickTag(bloco, "pubDate") ?? pickTag(bloco, "published") ?? pickTag(bloco, "updated") ?? "";
    const ts = dataRaw ? Date.parse(dataRaw.trim()) : NaN;
    if (!url || !titulo) continue;
    items.push({ titulo, url, descricao: desc, publicado: Number.isFinite(ts) ? ts : Date.now() });
  }
  return items;
}

export async function lerFeed(url: string, timeoutMs = 15_000): Promise<ItemFeed[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { "User-Agent": "DigitalSprintBot/1.0 (+curadoria)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseFeed(xml);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
