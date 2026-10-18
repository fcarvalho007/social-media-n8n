import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { textoPlano } from './pesquisa';
/** Read with the caller's RLS; search never changes the editorial decision. */
export function NoticiaEncontrada({ id, fechar }: { id: string; fechar: () => void }) {
  const q = useQuery({ queryKey: ['noticia-encontrada', id], queryFn: async () => { const r = await supabase.from('nl_noticias').select('id,titulo,descricao,corpo_artigo,url').eq('id', id).maybeSingle(); if (r.error || !r.data) throw new Error('Esta notícia não está disponível para a tua conta.'); return r.data; }, retry: false });
  let url: string | null = null;
  try { const u = new URL(q.data?.url ?? ''); if (u.protocol === 'https:' && !u.username && !u.password) url = u.href; } catch { /* no unsafe external link */ }
  return <section aria-label="Notícia encontrada" className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="max-w-prose break-words text-xl font-semibold">{q.data?.titulo ?? 'Notícia encontrada'}</h2><Button className="min-h-11" variant="outline" onClick={fechar}>Fechar leitura</Button></div>{q.isLoading ? <p role="status">A abrir notícia…</p> : q.error ? <p role="alert" className="text-sm text-destructive">{(q.error as Error).message}</p> : <><p className="text-xs text-muted-foreground">{q.data?.corpo_artigo ? 'Texto guardado na curadoria' : 'Apenas o resumo está guardado no Hub.'} A abertura não altera a decisão editorial.</p><div className="max-h-[32rem] max-w-prose overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">{textoPlano(q.data?.corpo_artigo || q.data?.descricao || 'Sem texto guardado.')}</div><div className="flex flex-wrap gap-3">{url && <Button variant="outline" className="min-h-11" asChild><a href={url} target="_blank" rel="noreferrer noopener">Consultar fonte original<span className="sr-only"> (abre noutro separador)</span></a></Button>}<Button variant="link" className="min-h-11" asChild><Link to="/artigos/percurso">Ver percurso editorial</Link></Button></div></>}</section>;
}
