import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, ArrowRight } from 'lucide-react';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvisoResultados } from '@/components/analytics/AvisoResultados';
import { ContextoResultados, NavegacaoResultados } from '@/components/analytics/ContextoResultados';
import { useInstagramAnalytics } from '@/hooks/useInstagramAnalytics';
import { useInstagramProfiles } from '@/hooks/useInstagramProfiles';
import { filtrarPeriodoSocial, resumirContasSociais } from '@/lib/analytics/resultadosSociais';

const numero = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 1 });
const data = (n: number | null) => n === null ? 'Sem data' : new Date(n).toLocaleDateString('pt-PT');
export default function Benchmark() {
  const projetoId = useProjetoOpcional()?.projetoId;
  const posts = useInstagramAnalytics();
  const perfis = useInstagramProfiles();
  const [periodo, setPeriodo] = useState('all');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  useEffect(() => { setSelecionadas([]); }, [projetoId]);
  const contas = useMemo(() => resumirContasSociais(filtrarPeriodoSocial(posts.analytics, periodo)), [posts.analytics, periodo]);
  const comparadas = contas.filter(c => selecionadas.includes(c.username)).sort((a,b) => b.media-a.media);
  const maximo = Math.max(1, ...comparadas.map(c => c.media));
  if (posts.error || perfis.error) return <AvisoResultados titulo="Comparar contas" ocupado={posts.isFetching || perfis.isFetching} repetir={() => { void Promise.all([posts.refetch(), perfis.refetch()]); }} />;
  if (posts.isLoading || perfis.isLoading) return <div className="hub-page" role="status" aria-label="A carregar resultados"><h1 className="sr-only">Comparar contas</h1><Skeleton className="h-48" /></div>;
  return <div className="hub-page">
    <CabecalhoPagina titulo="Comparar contas" icone={Users} descricao="Compara a amostra Instagram que importaste. Escolhe o mesmo período e verifica quantas publicações sustentam cada resultado."
      acoes={<Button asChild variant="outline"><Link to="/analytics">Importar ou rever dados<ArrowRight className="ml-2 size-4" /></Link></Button>} />
    <NavegacaoResultados ativa="comparar" />
    <ContextoResultados datas={[...posts.analytics.map(p => p.imported_at), ...perfis.latestProfiles.map(p => p.scraped_at)]} />
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Uma comparação com a mesma base</h2>
      <label className="flex items-center gap-3 text-sm">Período<Select value={periodo} onValueChange={setPeriodo}><SelectTrigger aria-label="Período da comparação" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todo o histórico</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="365">Últimos 12 meses</SelectItem></SelectContent></Select></label>
    </div>
    {contas.length === 0 ? <Card><CardContent className="space-y-4 p-6 sm:p-8"><h2 className="text-xl font-semibold">Ainda não há contas para comparar neste período</h2><p className="max-w-2xl text-sm text-muted-foreground">Importa publicações de pelo menos duas contas ou alarga o período. Não são pesquisadas contas nem recolhidos dados de concorrentes automaticamente.</p><Button asChild><Link to="/analytics">Abrir importação do Instagram</Link></Button></CardContent></Card> :
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(230px,300px)_minmax(0,1fr)]">
      <section className="rounded-xl border bg-card p-5" aria-label="Contas disponíveis"><h3 className="mb-4 font-semibold">Escolhe de 2 a 5 contas</h3><div className="space-y-2">{contas.map(conta => <label key={conta.username} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent">
        <Checkbox aria-label={`Comparar @${conta.username}`} checked={selecionadas.includes(conta.username)} disabled={!selecionadas.includes(conta.username) && selecionadas.length >= 5} onCheckedChange={ativo => setSelecionadas(prev => ativo ? [...prev, conta.username] : prev.filter(n => n !== conta.username))} />
        <span className="min-w-0"><span className="block break-all text-sm font-medium">@{conta.username}</span><span className="text-xs text-muted-foreground">{conta.quantidade} publicações na amostra</span></span>
      </label>)}</div></section>
      {comparadas.length < 2 ? <Card><CardContent className="space-y-3 p-6 sm:p-8"><BarChart3 className="size-6 text-primary" /><h3 className="text-xl font-semibold">{contas.length < 2 ? 'Falta uma segunda conta' : 'Escolhe as contas a comparar'}</h3><p className="text-sm text-muted-foreground">Vais ver interações registadas por publicação, dimensão da amostra e datas cobertas. Não calculamos uma pontuação global de autoridade.</p>{contas.length < 2 && <Button asChild variant="outline"><Link to="/analytics">Importar outra conta</Link></Button>}</CardContent></Card> :
      <section className="min-w-0 space-y-5 rounded-xl border bg-card p-5 sm:p-6" aria-label="Comparação da amostra">
        <div><h3 className="text-lg font-semibold">Gostos + comentários por publicação</h3><p className="mt-1 text-sm text-muted-foreground">Média aritmética dos valores registados nos ficheiros. Não é taxa de engagement por alcance nem garantia de resultados futuros.</p></div>
        {comparadas.map(conta => { const perfil = perfis.latestProfiles.find(p => p.username.toLowerCase() === conta.username); return <div key={conta.username} className="space-y-2 border-t pt-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="break-all font-medium">@{conta.username}</span><strong className="tabular-nums">{numero(conta.media)} interações/publicação</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full rounded-full bg-primary" style={{ width: `${100*conta.media/maximo}%` }} /></div>
          <p className="text-xs leading-relaxed text-muted-foreground">{conta.quantidade} publicações · {numero(conta.total)} interações · {data(conta.primeira)} a {data(conta.ultima)}</p>
          <p className="text-xs text-muted-foreground">{perfil ? `${numero(perfil.followers_count)} seguidores no perfil importado · registo ${new Date(perfil.scraped_at).toLocaleDateString('pt-PT')}` : 'Seguidores: sem perfil importado. Não estimamos este valor.'}</p>
        </div>; })}
        <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">Mesmo com o mesmo filtro, os ficheiros podem cobrir datas e quantidades diferentes. Uma exportação parcial não comprova a frequência de publicação. Usa a comparação para encontrar hipóteses editoriais e valida-as em novos conteúdos.</p>
      </section>}
    </div>}
  </div>;
}
