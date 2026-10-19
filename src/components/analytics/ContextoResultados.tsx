import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Database, Search, ArrowRight } from 'lucide-react';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';

export function NavegacaoResultados({ ativa }: { ativa: 'resultados' | 'sugestoes' | 'comparar' }) {
  return <nav className="hub-section-nav flex-wrap" aria-label="Análise social">
    {([
      ['resultados', '/analytics', 'Instagram importado'],
      ['sugestoes', '/insights', 'Sugestões editoriais'],
      ['comparar', '/benchmark', 'Comparar contas'],
    ] as const).map(([id, url, nome]) => <Link key={id} to={url} className="hub-section-link" aria-current={ativa === id ? 'page' : undefined}>{nome}</Link>)}
  </nav>;
}

export function ContextoResultados({ datas = [] }: { datas?: Array<string | null | undefined> }) {
  const projeto = useProjetoOpcional();
  const ultima = datas.map(d => d ? Date.parse(d) : NaN).filter(Number.isFinite).sort((a,b) => b-a)[0];
  return <section className="rounded-xl border bg-card p-5 sm:p-6" aria-label="Origem e limites dos dados">
    <div className="flex items-start gap-3">
      <Database className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="font-semibold">Dados importados, com contexto</h2>
          {!!projeto?.projetos?.length && <label className="flex min-w-0 flex-col gap-2 text-xs text-muted-foreground">Biblioteca do projeto
            <select aria-label="Biblioteca do projeto" className="min-h-11 max-w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" disabled={projeto.aGuardar || projeto.estado !== 'pronto'} value={projeto.projetoId ?? ''} onChange={e => { void projeto.escolher(e.target.value || null).catch(() => toast.error('Não foi possível mudar de projeto. A seleção anterior foi preservada.')); }}><option value="">Todos os teus projetos</option>{projeto.projetos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </label>}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">Estas páginas analisam ficheiros Excel ou JSON do Instagram carregados por ti. Não fazem scraping, não sincronizam métricas em tempo real e não usam DataForSEO. A importação não permite confirmar como um ficheiro antigo foi obtido.</p>
        <dl className="grid gap-3 pt-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Âmbito da biblioteca</dt><dd className="mt-1 font-medium">{projeto?.projeto?.name ?? 'Todos os teus projetos'} · dados da tua conta no Hub</dd></div>
          <div><dt className="text-xs text-muted-foreground">Última importação disponível</dt><dd className="mt-1 font-medium">{ultima === undefined ? 'Ainda sem importações' : new Date(ultima).toLocaleString('pt-PT', { timeZone:'Europe/Lisbon', dateStyle:'medium', timeStyle:'short' })}</dd></div>
        </dl>
        <p className="text-xs leading-relaxed text-muted-foreground">Gostos e comentários são valores registados no ficheiro. Ausência de alcance, cliques, guardados ou vendas não significa zero. A data de importação não é a data de medição no Instagram.</p>
      </div>
    </div>
    <Link to="/artigos/pesquisa" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"><Search className="size-4" aria-hidden />Para keywords e procura no Google, abre a Pesquisa SEO<ArrowRight className="size-4 shrink-0" aria-hidden /></Link>
  </section>;
}
