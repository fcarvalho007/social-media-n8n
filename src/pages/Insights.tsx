import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextoResultados, NavegacaoResultados } from '@/components/analytics/ContextoResultados';
import { AvisoResultados } from '@/components/analytics/AvisoResultados';
import { useInstagramAnalytics } from '@/hooks/useInstagramAnalytics';
import { filtrarPeriodoSocial, formatoSocial, interacoesRegistadas } from '@/lib/analytics/resultadosSociais';

export default function Insights() {
  const { user } = useAuth();
  const projeto = useProjetoOpcional();
  const posts = useInstagramAnalytics();
  const [periodo, setPeriodo] = useState('90');
  const [conta, setConta] = useState('all');
  useEffect(() => { setConta('all'); }, [projeto?.projetoId]);
  const contas = [...new Set(posts.analytics.map(p => p.owner_username).filter((v): v is string => !!v))].sort();
  const amostra = useMemo(() => filtrarPeriodoSocial(posts.analytics, periodo).filter(p => conta === 'all' || p.owner_username === conta), [posts.analytics, periodo, conta]);
  const destaque = [...amostra].sort((a,b) => interacoesRegistadas(b)-interacoesRegistadas(a))[0];
  const formatos = useMemo(() => {
    const grupos = new Map<string, {n:number; total:number}>();
    for (const p of amostra) { const f = formatoSocial(p.post_type); const atual = grupos.get(f) ?? {n:0,total:0}; grupos.set(f,{n:atual.n+1,total:atual.total+interacoesRegistadas(p)}); }
    return [...grupos].map(([nome,g]) => ({nome,...g,media:g.total/g.n})).sort((a,b) => b.media-a.media);
  }, [amostra]);
  // The legacy learning table is account-wide; never present it as project-specific evidence.
  const aprendizagem = useQuery({
    queryKey:['aprendizagens-sociais',user?.id], enabled:!!user && !projeto?.projetoId, retry:1,
    queryFn: async () => {
      const since = new Date(Date.now()-90*86_400_000).toISOString();
      const [insights, publicacoes] = await Promise.all([
        supabase.from('account_insights').select('*').eq('user_id',user!.id).eq('never_show',false).gte('last_updated',since).order('last_updated',{ascending:false}),
        supabase.from('posts').select('id',{count:'exact',head:true}).eq('user_id',user!.id).eq('status','published').not('performance_classification','is',null).not('ai_features_extracted','is',null).gte('published_at',since),
      ]);
      if (insights.error) throw insights.error;
      if (publicacoes.error) throw publicacoes.error;
      return {insights:insights.data ?? [], quantidade:publicacoes.count ?? 0};
    },
  });
  if (posts.error) return <AvisoResultados titulo="Sugestões editoriais" ocupado={posts.isFetching} repetir={() => { void posts.refetch(); }} />;
  return <div className="hub-page">
    <CabecalhoPagina titulo="Sugestões editoriais" icone={Lightbulb} descricao="Usa os resultados que já tens para decidir o próximo conteúdo. Os números descrevem a amostra; as propostas são hipóteses para testar." />
    <NavegacaoResultados ativa="sugestoes" />
    <ContextoResultados datas={posts.analytics.map(p => p.imported_at)} />
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">O que vale a pena explorar a seguir?</h2><p className="mt-1 text-sm text-muted-foreground">Cálculo sobre dados importados · sem chamada de IA ou custo de pesquisa</p></div>
      <div className="flex flex-wrap gap-3"><Select value={conta} onValueChange={setConta}><SelectTrigger aria-label="Conta das sugestões" className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as contas</SelectItem>{contas.map(n => <SelectItem key={n} value={n}>@{n}</SelectItem>)}</SelectContent></Select>
        <Select value={periodo} onValueChange={setPeriodo}><SelectTrigger aria-label="Período das sugestões" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="all">Todo o histórico</SelectItem></SelectContent></Select></div>
    </div>
    {posts.isLoading ? <p role="status">A ler as publicações importadas…</p> : !amostra.length ? <Card><CardContent className="space-y-4 p-6 sm:p-8"><h3 className="text-xl font-semibold">Faltam publicações neste período</h3><p className="max-w-2xl text-sm text-muted-foreground">Importa dados do Instagram ou alarga o período para consultar o histórico. Não geramos conclusões a partir de uma biblioteca vazia.</p><Button asChild><Link to="/analytics">Importar e analisar Instagram<ArrowRight className="ml-2 size-4" /></Link></Button></CardContent></Card> : <>
      <p className="text-sm text-muted-foreground">Base: {amostra.length} publicações importadas. {conta === 'all' ? 'Escolhe uma conta para evitar misturar públicos diferentes.' : `Conta: @${conta}.`}</p>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card><CardContent className="space-y-4 p-6"><span className="text-xs font-semibold uppercase tracking-wide text-primary">Uma continuação possível</span><h3 className="text-xl font-semibold">Retoma uma publicação com mais interações registadas</h3><blockquote className="line-clamp-4 border-l-2 border-primary pl-4 text-sm leading-relaxed">{destaque.caption || 'Publicação sem legenda no ficheiro'}</blockquote><p className="text-sm text-muted-foreground">@{destaque.owner_username || 'conta não identificada'} · {interacoesRegistadas(destaque)} gostos + comentários · {formatoSocial(destaque.post_type)}</p><p className="text-sm leading-relaxed text-muted-foreground">Experimenta uma explicação mais prática, um caso ou uma pergunta de continuidade. Esta é uma hipótese editorial; a amostra não prova o motivo das interações.</p><Button asChild variant="outline"><Link to="/analytics">Rever a publicação nos resultados</Link></Button></CardContent></Card>
        <Card><CardContent className="space-y-4 p-6"><span className="text-xs font-semibold uppercase tracking-wide text-primary">Formatos da amostra</span><h3 className="text-xl font-semibold">Escolhe um formato para experimentar</h3><dl className="space-y-3">{formatos.map(f => <div key={f.nome} className="flex flex-wrap justify-between gap-2 border-b pb-3 text-sm"><dt className="font-medium">{f.nome} · {f.n} publicações</dt><dd>{f.media.toLocaleString('pt-PT',{maximumFractionDigits:1})} interações/publicação</dd></div>)}</dl><p className="text-xs leading-relaxed text-muted-foreground">Média de gostos + comentários importados. Amostras pequenas e datas de recolha diferentes limitam a comparação. Alcance, cliques e inscrições não são inferidos.</p></CardContent></Card>
      </div>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6"><div className="max-w-2xl"><h3 className="font-semibold">Transforma a hipótese numa campanha</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Escolhe o tema, acrescenta a tua experiência e cola o conteúdo no início da campanha. Para um artigo, valida depois a focus keyword na Pesquisa SEO. Nada é criado ou publicado automaticamente aqui.</p></div><Button asChild><Link to="/campanhas/nova">Preparar campanha<ArrowRight className="ml-2 size-4" /></Link></Button></section>
    </>}
    <section className="space-y-3 border-t pt-6" aria-label="Aprendizagem das publicações do Hub"><h2 className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="size-5 text-primary" />Aprendizagem das publicações do Hub</h2><p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">É uma base diferente da importação Instagram: publicações feitas pelo Hub com métricas e características classificadas pelos processos do servidor. Só mostramos conclusões já guardadas no servidor; sem recolha e classificação não há aprendizagens novas.</p>
      {projeto?.projetoId ? <p className="text-sm text-muted-foreground">Esta análise agrega todos os projetos da tua conta. Para não misturar resultados, não mostramos essas conclusões dentro de um projeto selecionado.</p> : aprendizagem.isLoading ? <p role="status">A consultar a aprendizagem guardada…</p> : aprendizagem.error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">Não foi possível consultar esta base. Não significa que existam zero publicações.</p><Button variant="outline" disabled={aprendizagem.isFetching} onClick={() => { void aprendizagem.refetch(); }}>Tentar novamente</Button></div> : <>
        <p className="text-sm text-muted-foreground">{aprendizagem.data?.quantidade ?? 0} publicações elegíveis nos últimos 90 dias · mínimo do motor: 30 · âmbito: todos os teus projetos.</p>
        {(aprendizagem.data?.quantidade ?? 0) >= 30 && !aprendizagem.data?.insights.length && <p className="text-sm text-muted-foreground">Ainda não há conclusões guardadas para esta amostra. Publicações classificadas e sugestões calculadas são etapas diferentes.</p>}
        {(aprendizagem.data?.quantidade ?? 0) >= 30 ? aprendizagem.data?.insights.filter(i => !i.dismissed_until || Date.parse(i.dismissed_until) <= Date.now()).map(i => <p key={i.id} className="rounded-lg border bg-card p-4 text-sm">{i.finding}<span className="mt-2 block text-xs text-muted-foreground">Amostra: {i.sample_size} · {i.network || 'todas as redes'} · atualização {new Date(i.last_updated).toLocaleDateString('pt-PT')} · heurística do motor, sem causalidade comprovada</span></p>) : <p className="text-sm text-muted-foreground">Ainda não há base suficiente para apresentar padrões deste motor. As observações dos ficheiros importados acima continuam disponíveis.</p>}
      </>}
    </section>
  </div>;
}
