import { Check } from 'lucide-react';

const passos = [
  { nome: 'Fonte', detalhe: 'Escolher o ponto de partida' },
  { nome: 'Direção', detalhe: 'Definir público e objetivo' },
  { nome: 'Plano', detalhe: 'Escolher as peças a incluir' },
  { nome: 'Peças', detalhe: 'Editar e preparar para revisão' },
];
export function PercursoCampanha({ passo }: { passo: 1 | 2 | 3 | 4 }) {
  return <nav aria-label="Percurso da campanha"><ol className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">{passos.map((p, i) => <li key={p.nome} aria-current={passo === i + 1 ? 'step' : undefined} className={`flex min-w-0 items-start gap-3 border-t-2 pt-3 ${passo === i + 1 ? 'border-primary' : passo > i + 1 ? 'border-primary/35' : 'border-border'}`}><span aria-hidden className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${passo >= i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{passo > i + 1 ? <Check className="size-4" /> : i + 1}</span><span className="min-w-0"><span className={`block text-sm font-semibold ${passo < i + 1 ? 'text-muted-foreground' : ''}`}>{p.nome}</span><span className="mt-1 hidden text-xs leading-relaxed text-muted-foreground sm:block">{p.detalhe}</span></span></li>)}</ol></nav>;
}
