import { CheckCircle2, CircleAlert } from 'lucide-react';
import type { PautaEditorial, SiteEditorial } from './contratos';
import { verificarArtigo } from './sequencia';

export function RevisaoArtigo({ pauta, site, outras }: { pauta: PautaEditorial; site: SiteEditorial; outras: PautaEditorial[] }) {
  const itens = verificarArtigo(pauta, site, outras), bloqueios = itens.filter(x => x.nivel === 'bloqueio').length;
  return <section aria-label="Verificações do artigo" className="flex flex-col gap-3 border-t pt-5">
    <h4 className="text-lg font-semibold">Revisão antes da aprovação</h4>
    <p className="max-w-prose text-sm text-muted-foreground">Verificações locais e sem custo sobre esta versão. Não certificam factos, plágio, qualidade da escrita ou posicionamento.</p>
    <p role="status" className="text-sm font-medium">{bloqueios ? `${bloqueios} verificações bloqueiam a aprovação` : 'Sem bloqueios nestas verificações'} · {itens.filter(x => x.nivel === 'aviso').length} pontos para rever</p>
    <ul className="divide-y">{itens.map(v => <li key={v.id} className="flex gap-3 py-3 text-sm">{v.nivel === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />}<div className="min-w-0"><p className="font-medium">{v.nome} · {v.nivel === 'ok' ? 'Verificado' : v.nivel === 'bloqueio' ? 'Corrigir' : 'Rever'}</p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{v.detalhe}</p></div></li>)}</ul>
  </section>;
}
