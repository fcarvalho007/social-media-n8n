import { it, expect } from 'vitest';
// Non-literal path keeps the web typecheck from following this Deno module.
const modulo = '../../supabase/functions/_shared/nl-app/lib/processar-noticias.server';
const { separarBlocos } = (await import(/* @vite-ignore */ modulo)) as { separarBlocos: (t: string) => { blocos: string[] } };

const exemplo = `Comunicados\n\nSpain is considering a TikTok suspension\n\n→ Maldita.es alleges abuse material.\n\n→ No ban has been imposed.\n\nhttps://www.euronews.com/2026/11/10/tiktok\n\nWhatsApp wants to handle more of your life admin 💬\n\n→ Its new boss wants simpler chats.\n\nhttps://techcrunch.com/2026/11/10/whatsapp/\n\neBay is making life harder for Meta’s AI shopper 🛍️\n\n→ Fresh tests found Muse unable to browse.\n\nhttps://www.theverge.com/tech/1030838/ebay`;

it('com linhas vazias detecta as 3 notícias', () => {
  expect(separarBlocos(exemplo).blocos).toHaveLength(3);
});
it('sem linhas vazias continua a detectar 3 notícias', () => {
  expect(separarBlocos(exemplo.replace(/\n\n/g, '\n')).blocos).toHaveLength(3);
});
it('«Comunicados» não fica como título', () => {
  for (const t of [exemplo, exemplo.replace(/\n\n/g, '\n')])
    expect(separarBlocos(t).blocos[0].startsWith('Spain')).toBe(true);
});
it('dois links no mesmo parágrafo dão duas notícias', () => {
  const t = 'Primeira notícia sobre IA generativa\nhttps://a.com/1\nSegunda notícia sobre redes sociais\nhttps://b.com/2';
  expect(separarBlocos(t).blocos).toHaveLength(2);
});
