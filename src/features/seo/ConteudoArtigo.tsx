import { Fragment, type ReactNode } from 'react';
import type { FonteEditorial } from './contratos';

function hrefSeguro(v: string) { try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; } }
function inline(texto: string, fontes: FonteEditorial[]): ReactNode[] {
  return texto.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\[fonte:[^\]]+\]|\*\*[^*]+\*\*)/g).map((t, i) => {
    const link = t.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/), fonte = t.match(/^\[fonte:([^\]]+)\]$/);
    if (link && hrefSeguro(link[2])) return <a key={i} href={hrefSeguro(link[2])!} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">{link[1]}</a>;
    const f = fonte && fontes.find(f => f.id === fonte[1]);
    if (f && hrefSeguro(f.url)) return <a key={i} href={hrefSeguro(f.url)!} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">[{f.titulo || f.id}]</a>;
    if (t.startsWith('**') && t.endsWith('**')) return <strong key={i}>{t.slice(2, -2)}</strong>;
    return <Fragment key={i}>{t}</Fragment>;
  });
}
export function ConteudoArtigo({ corpo, fontes }: { corpo: string; fontes: FonteEditorial[] }) {
  return <div className="flex flex-col gap-4 text-sm leading-relaxed">{corpo.split(/\n\s*\n/).map((bloco, i) => {
    if (/^#{1,3} /.test(bloco)) return <h4 key={i} className="mt-3 text-lg font-semibold">{inline(bloco.replace(/^#+\s*/, ''), fontes)}</h4>;
    if (bloco.split('\n').every(l => /^[-*] /.test(l))) return <ul key={i} className="list-disc space-y-2 pl-5">{bloco.split('\n').map((l, j) => <li key={j}>{inline(l.slice(2), fontes)}</li>)}</ul>;
    return <p key={i} className="whitespace-pre-wrap break-words">{inline(bloco, fontes)}</p>;
  })}</div>;
}
