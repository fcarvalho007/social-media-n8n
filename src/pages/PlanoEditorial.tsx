import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSeo } from '@/features/seo/api';
import { EstadoCargaSeo, MolduraSeo } from '@/features/seo/ComponentesSeo';
import { PautaEditor } from '@/features/seo/PautaEditor';
import { NovoPlano } from '@/features/seo/NovoPlano';
import { QuadroArtigos } from '@/features/seo/QuadroArtigos';
export default function PlanoEditorial(){
 const {data:e,error,isLoading,refetch,atualizar}=useSeo(),[sp,setSp]=useSearchParams(),id=sp.get('id'),novo=sp.get('novo')==='1';
 if(isLoading||!e)return <MolduraSeo titulo="Plano de artigos" descricao="Prepara, escreve e revê os artigos de cada site."><EstadoCargaSeo erro={error as Error} repetir={()=>void refetch()}/></MolduraSeo>;
 const voltar=<Button asChild variant="outline" className="min-h-11"><Link to="/artigos/plano"><ArrowLeft/>Voltar ao plano</Link></Button>;
 if(novo)return <MolduraSeo titulo="Novo tema" descricao="Define os destinos, escolhe as palavras-chave e prepara os artigos." acao={voltar}><NovoPlano sites={e.sites}/></MolduraSeo>;
 if(!id)return <MolduraSeo titulo="Plano de artigos" descricao="Um único quadro para preparar, escrever e rever os artigos de cada site." acao={<Button asChild className="min-h-11"><Link to="/artigos/plano?novo=1"><Plus/>Novo tema</Link></Button>}><QuadroArtigos pautas={e.pautas} sites={e.sites} grupo={sp.get('grupo')}/></MolduraSeo>;
 const pauta=e.pautas.find(p=>p.id===id),site=e.sites.find(s=>s.id===pauta?.siteId);
 if(!pauta||!site)return <MolduraSeo titulo="Artigo não encontrado" descricao="Este artigo não está disponível no projeto atual." acao={voltar}><Alert><AlertTitle>Escolhe um artigo no plano</AlertTitle><AlertDescription>A ligação pode pertencer a outro projeto ou a um artigo já indisponível. O restante plano foi preservado.</AlertDescription></Alert></MolduraSeo>;
 const redacao=sp.get('secao')==='texto';
 return <MolduraSeo redacao={redacao} titulo={pauta.titulo} descricao={`${site.dominio} · completa o plano e as fontes, confirma a estrutura, escreve e revê a publicação.`} acao={voltar}>
 {error&&<Alert variant="destructive"><AlertTitle>Não foi possível atualizar o artigo</AlertTitle><AlertDescription>A última leitura está visível. Confirma o estado antes de guardar. <Button variant="link" onClick={()=>void refetch()}>Tentar novamente</Button></AlertDescription></Alert>}
 <div className={redacao?"hub-redacao-cartao min-w-0":"min-w-0 rounded-xl border bg-card p-4 sm:p-6"}>{pauta.loteId&&<p hidden={redacao} className="mb-4 text-sm">Parte da série <Link className="inline-flex min-h-11 items-center text-primary underline" to={`/artigos/lotes?id=${pauta.loteId}`}>{e.lotes?.find(l=>l.id===pauta.loteId)?.nome??'Abrir série e calendário'}</Link></p>}{e.campanhas?.filter(c=>c.pecas.some(p=>p.pautaId===pauta.id)).map(c=><p key={c.id} hidden={redacao} className="mb-4 text-sm">Parte da campanha <Link className="inline-flex min-h-11 items-center text-primary underline" to={`/campanhas/${c.id}`}>{c.nome}</Link></p>)}<PautaEditor key={pauta.id} secaoInicial={sp.get('secao')??'brief'} pauta={pauta} siteInicial={site.id} sites={e.sites} pautas={e.pautas} pesquisas={e.pedidos} atualizar={atualizar} onGuardada={p=>setSp(v=>{const n=new URLSearchParams(v);n.set('id',p.id);n.delete('novo');return n;},{replace:true})}/></div>
 </MolduraSeo>;
}
