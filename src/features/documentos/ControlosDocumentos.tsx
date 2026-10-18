import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FiltroDocumentos({ id, nome, valor, opcoes, onChange, disabled = false }: { id: string; nome: string; valor: string; opcoes: { valor: string; nome: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return <div className="flex min-w-0 flex-col gap-1.5"><Label htmlFor={id}>{nome}</Label><Select value={valor || 'todos'} onValueChange={v => onChange(v === 'todos' ? '' : v)} disabled={disabled}><SelectTrigger id={id} className="min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{opcoes.map(o => <SelectItem key={o.valor || 'todos'} value={o.valor || 'todos'}>{o.nome}</SelectItem>)}</SelectGroup></SelectContent></Select></div>;
}
export function PaginacaoDocumentos({ pagina, total, tamanho, onChange, nome = 'documentos' }: { pagina: number; total: number; tamanho: number; onChange: (p: number) => void; nome?: string }) {
  const paginas = Math.max(1, Math.ceil(total / tamanho)); if (paginas <= 1) return null;
  return <nav aria-label={`Páginas de ${nome}`} className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-xs tabular-nums text-muted-foreground">{(pagina - 1) * tamanho + 1}–{Math.min(pagina * tamanho, total)} de {total}</p><div className="flex items-center gap-2"><Button variant="outline" className="min-h-11" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)} aria-label={`Página anterior de ${nome}`}><ChevronLeft aria-hidden="true" /><span className="hidden sm:inline">Anterior</span></Button><span className="text-xs tabular-nums" aria-live="polite">{pagina} / {paginas}</span><Button variant="outline" className="min-h-11" disabled={pagina >= paginas} onClick={() => onChange(pagina + 1)} aria-label={`Página seguinte de ${nome}`}><span className="hidden sm:inline">Seguinte</span><ChevronRight aria-hidden="true" /></Button></div></nav>;
}
