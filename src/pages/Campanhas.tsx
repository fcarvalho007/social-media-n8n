import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { Route } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useProjeto } from '@/contexts/ProjetoContext';
import { BACKEND_NUVEM } from '@/lib/backendHub';
import { ProjetoPesquisa } from '@/features/percurso/ProjetoPesquisa';
import { useSeo } from '@/features/seo/api';
import { carregarDescoberta, type ReferenciaDescoberta } from '@/features/campanhas/api';
import { NovaCampanha } from '@/features/campanhas/NovaCampanha';
import { EscolherFonteCampanha } from '@/features/campanhas/EscolherFonteCampanha';
import { reabrirTextoCampanha } from '@/features/campanhas/rascunhoFonte';
import { EditarCampanha } from '@/features/campanhas/EditarCampanha';
import { dataCampanha, nomeFonteCampanha, formatosCampanha, pecasAtivas, type Campanha, type FonteCampanha } from '@/features/campanhas/modelo';
import type { EstadoPublicoSeo } from '@/features/seo/contratos';
import { CompositorCampanha } from '@/features/campanhas/CompositorCampanha';
export default function Campanhas() {
  const { id, peca } = useParams(), [sp, setSp] = useSearchParams(), ctx = useProjeto(), { user } = useAuth(), q = useSeo(), client = useQueryClient(), navigate = useNavigate();
  const nova = id === 'nova', e = q.data, c = e?.campanhas?.find(c => c.id === id), podeEditar = e?.podeEditar !== false;
  useEffect(() => { if(document.scrollingElement) document.scrollingElement.scrollTop=0; }, [id,peca]);
  const ref: ReferenciaDescoberta | null = sp.get('noticia') ? { tipo:'noticia', id:sp.get('noticia')!, paginas:[] } : sp.get('documento') ? { tipo:'documento', id:sp.get('documento')!, paginas:(sp.get('paginas')??'').split(',').filter(Boolean).map(Number) } : null;
  const textoColado = sp.get('conteudo') === 'colado';
  const fonteKey = ['campanha-fonte', user?.id, ctx.projetoId, ref ?? (textoColado ? 'texto' : null)];
  const fonte = useQuery({ queryKey:fonteKey, enabled:nova && (!!ref || textoColado) && !!user && !!ctx.projetoId, queryFn:() => ref ? carregarDescoberta(ref,user!.id,ctx.projetoId!) : reabrirTextoCampanha(user!.id,ctx.projetoId!), retry:false });
  function guardada(c:Campanha) { const key = BACKEND_NUVEM ? ['seo-nuvem-estado',ctx.projetoId] : ['seo-local-estado']; client.setQueryData<EstadoPublicoSeo>(key,atual => atual ? {...atual,campanhas:[...(atual.campanhas??[]).filter(a=>a.id!==c.id),c]} : atual); void q.atualizar().catch(()=>{}); }
  function escolher(r:ReferenciaDescoberta) { setSp(r.tipo === 'noticia' ? { noticia:r.id } : { documento:r.id, paginas:r.paginas.join(',') }); }
  function colar(f:FonteCampanha) { client.setQueryData(['campanha-fonte',user?.id,ctx.projetoId,'texto'],f);setSp({ conteudo:'colado' }); }
  function mudarFonte() { const f=fonte.data;if(f?.tipo==='documento')setSp({origem:'documento',estudo:f.id,selecionadas:f.paginas.join(',')});else setSp({ origem:f?.tipo ?? (ref?.tipo ?? (textoColado?'texto':'noticia')) }); }
  if(c&&peca&&!formatosCampanha(c).includes(peca as import('@/features/campanhas/modelo').TipoPeca))return <div className="hub-page"><Alert><AlertTitle>Esta peça não está incluída na campanha</AlertTitle><AlertDescription>O trabalho guardado foi preservado. Podes voltar a incluir a peça na vista geral.<Button asChild variant="link"><Link to={`/campanhas/${c.id}?vista=plano`}>Abrir vista geral</Link></Button></AlertDescription></Alert></div>;
  if(c && peca) return <CompositorCampanha key={`${ctx.projetoId}:${c.id}:${peca}`} campanha={c} tipo={peca} projetoId={ctx.projetoId!} podeEditar={podeEditar} aoGuardar={guardada}/>;
  const campanhas = [...(e?.campanhas??[])].sort((a,b)=>b.alteradoEm.localeCompare(a.alteradoEm));
  return <div className="hub-page">{id&&<Button variant="link" className="min-h-11 self-start px-0" asChild><Link to="/campanhas"><ArrowLeft className="size-4" aria-hidden/>Voltar às campanhas</Link></Button>}<CabecalhoPagina icone={Route} titulo={nova?'Nova campanha':c?.nome??'Campanhas'} descricao={nova?'Da fonte ao plano: prepara uma campanha coordenada, passo a passo.':id?'Acompanha o plano, trabalha as peças e revê cada canal.':'Transforma uma notícia, estudo ou texto teu em artigo, newsletter e peças de divulgação.'} acoes={!id&&<><ProjetoPesquisa/><Button className="min-h-11" asChild><Link to="/campanhas/nova"><Plus className="size-4" aria-hidden/>Nova campanha</Link></Button></>}/>
    {!ctx.projetoId?<p>Escolhe um projeto para preparar as campanhas.</p>:q.isLoading?<p role="status">A abrir campanhas…</p>:!e?<Alert variant="destructive"><AlertTitle>Não foi possível abrir as campanhas</AlertTitle><AlertDescription><p>{q.error instanceof Error?q.error.message:'O motor não respondeu.'}</p><Button variant="outline" className="mt-3 min-h-11" onClick={()=>void q.refetch()}>Tentar novamente</Button></AlertDescription></Alert>:<>
      {q.error&&<Alert><AlertDescription>Não foi possível atualizar a lista. A última leitura foi preservada; atualiza antes de voltar a guardar.</AlertDescription></Alert>}
      {!BACKEND_NUVEM&&<p className="text-xs text-muted-foreground">Pré-visualização local · motor partilhado nesta demonstração. Sem envios ou agendamentos.</p>}
      {nova ? <div key={`${user?.id}:${ctx.projetoId}`}>
        {!ref&&!textoColado ? user&&<EscolherFonteCampanha userId={user.id} projetoId={ctx.projetoId} aoEscolher={escolher} aoColar={colar}/> : fonte.isLoading ? <p role="status">A abrir a fonte selecionada…</p> : fonte.error ? <Alert variant="destructive"><AlertTitle>Não foi possível usar a fonte</AlertTitle><AlertDescription><p>{(fonte.error as Error).message}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={()=>void fonte.refetch()}>Tentar novamente</Button><Button variant="ghost" className="min-h-11" onClick={mudarFonte}>Escolher outra fonte</Button></div></AlertDescription></Alert> : fonte.data ? <NovaCampanha key={`${ctx.projetoId}:${fonte.data.hash}`} fonte={fonte.data} sites={e.sites} projetoId={ctx.projetoId} podeEditar={podeEditar} campanhasExistentes={e.campanhas??[]} aoMudarFonte={mudarFonte} aoCriar={c=>{guardada(c);navigate(`/campanhas/${c.id}?vista=plano&resultado=${e.campanhas?.some(a=>a.id===c.id)?'existente':'criada'}`);}}/> : null}
      </div> : id ? c&&e.sites.find(s=>s.id===c.siteId) ? <EditarCampanha pautas={e.pautas} eventos={e.eventos??[]} key={`${ctx.projetoId}:${c.id}`} campanha={c} site={e.sites.find(s=>s.id===c.siteId)!} projetoId={ctx.projetoId} podeEditar={podeEditar} revisoes={e.revisoesCampanhas?.[c.id]??{}} aoGuardar={guardada}/> : <Alert><AlertTitle>Campanha não encontrada neste projeto</AlertTitle><AlertDescription>Volta à lista e confirma o projeto escolhido.</AlertDescription></Alert> : campanhas.length ? <ul className="divide-y rounded-xl border bg-card">{campanhas.map(c=><li key={c.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0 flex-1 basis-72"><h2 className="break-words font-semibold">{c.nome}</h2><p className="mt-2 text-sm text-muted-foreground">{e.sites.find(s=>s.id===c.siteId)?.dominio} · {dataCampanha(c.inicio)} · {pecasAtivas(c).length} {pecasAtivas(c).length===1?'peça incluída':'peças incluídas'}</p><p className="mt-2 text-xs text-muted-foreground">{nomeFonteCampanha(c.fonte)} · {c.fonteConfirmadaEm?'Fonte confirmada':'Fonte por verificar'} · proposta sem agendamento</p></div><Button variant="outline" className="min-h-11" asChild><Link to={`/campanhas/${c.id}?vista=plano`}>Abrir campanha</Link></Button></li>)}</ul> : <section className="flex max-w-prose flex-col gap-4 py-6"><h2 className="text-xl font-semibold">Uma boa descoberta pode ir mais longe</h2><p className="text-sm leading-relaxed text-muted-foreground">Parte de uma notícia, PDF ou texto teu. Define a direção, escolhe as peças e acompanha o que falta rever.</p><Button className="min-h-11 self-start" asChild><Link to="/campanhas/nova">Preparar a primeira campanha</Link></Button></section>}
    </>}
  </div>;
}
