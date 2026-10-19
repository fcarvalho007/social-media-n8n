import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiBackend, BACKEND_NUVEM } from '@/lib/backendHub';
import { useProjetoOpcional } from '@/contexts/ProjetoContext';
import { triagemPublicacao } from './politicas';
import type { PautaEditorial, SiteEditorial } from './contratos';
interface EstadoWordPress {
    podeEditar: boolean;
    publicacaoAtiva: boolean;
    envios: {
        id: string;
        versao: number;
        destino: 'draft' | 'publish';
        estado: string;
        escrita_iniciada?:boolean|null;
        remoto_url: string | null;
    }[];
    imagens?:{site_id:string;hash:string;estado:string;metadados?:{titulo?:string}}[];
    trabalhos: {
        id: string;
        estado: string;
        resultado: {
            erro?: string;
        } | null;
        pedido: {
            versao: number;
            destino: string;
        };
    }[];
}
const nomes: Record<string, string> = { fila: 'Na fila', em_curso: 'Em processamento', concluido: 'Concluído', incerto: 'Resultado por confirmar', falhou: 'Falhou', cancelado: 'Cancelado', reservado: 'Envio reservado', enviado: 'Confirmado no WordPress' };
export function PublicacaoWordPress(props: {
    pauta: PautaEditorial;
    site: SiteEditorial;
    sujo: boolean;
}) { return BACKEND_NUVEM ? <Publicacao {...props}/> : null; }
export function Publicacao({ pauta, site, sujo, consultar = apiBackend }: {
    pauta: PautaEditorial;
    site: SiteEditorial;
    sujo: boolean;
    consultar?: typeof apiBackend;
}) {
    const ctx = useProjetoOpcional(), projeto = ctx?.projetoId ?? undefined;
    const [confirmar, setConfirmar] = useState<'draft' | 'publish' | null>(null), [busy, setBusy] = useState(false), [erro, setErro] = useState(''), [aviso, setAviso] = useState('');
    const q = useQuery({ queryKey: ['wordpress-envios', projeto, pauta.id], queryFn: () => consultar<EstadoWordPress>('/wordpress/estado', { pautaId: pauta.id }, { projeto }), refetchInterval: q => q.state.data?.trabalhos.some(j => ['fila', 'em_curso'].includes(j.estado)) ? 5000 : 30000, retry: false });
    const bloqueado = sujo || !!triagemPublicacao(pauta, site).length || busy, pendente = q.data?.trabalhos.some(j => j.pedido.versao === pauta.versao && ['fila', 'em_curso'].includes(j.estado));
    async function executar(acao: string, dados: Record<string, unknown>) {
        setBusy(true);
        setErro('');
        setAviso('');
        try {
            const r = await consultar<{
                confirmado?: boolean;
                detalhe?: string;
            }>(`/wordpress/${acao}`, dados, { projeto });
            setConfirmar(null);
            setAviso(acao === 'enfileirar' ? 'Pedido guardado na fila. O resultado aparece abaixo.' : r.confirmado ? 'Resultado confirmado no WordPress.' : r.detalhe ?? 'Ligação ao WordPress verificada.');
            await q.refetch();
        }
        catch (e) {
            setErro((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <section aria-label="Publicação WordPress" className="flex flex-col gap-3 border-t pt-5">
  <h4 className="text-lg font-semibold">Publicar em {site.dominio}</h4>
  <p className="max-w-prose text-sm text-muted-foreground">Envia a versão guardada para este destino. O rascunho fica no WordPress para revisão; publicar torna o artigo público.{site.revisaoObrigatoria ? ' Este site exige a tua aprovação desta versão.' : ''}</p>
  {q.isPending ? <p role="status" className="text-sm">A consultar os envios…</p> : q.error ? <Alert variant="destructive"><AlertDescription>Não foi possível consultar o WordPress. <Button variant="link" className="min-h-11" onClick={() => void q.refetch()}>Tentar novamente</Button></AlertDescription></Alert> : <>
  {q.data?.podeEditar && <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void executar('verificar', { siteId: site.id })}>Verificar ligação</Button><Button variant="outline" className="min-h-11" disabled={bloqueado || pendente} onClick={() => setConfirmar('draft')}>Criar rascunho no WordPress</Button><Button className="min-h-11" disabled={bloqueado || pendente || !q.data.publicacaoAtiva || (!pauta.aprovacao && site.revisaoObrigatoria)} onClick={() => setConfirmar('publish')}>Publicar versão {pauta.versao}</Button></div>}
  {sujo && <p className="text-sm text-muted-foreground">Guarda as alterações antes de enviar.</p>}
  {q.data && !q.data.publicacaoAtiva && <p className="text-sm text-muted-foreground">A publicação pública está desligada no servidor. Podes preparar rascunhos.</p>}
  {confirmar && <Alert><AlertDescription><p className="font-medium">{confirmar === 'publish' ? 'Publicar este artigo?' : 'Criar este rascunho?'}</p><p className="mt-1 break-words">{pauta.texto?.titulo} · versão {pauta.versao} · {site.dominio}.</p><p className="mt-1">{confirmar === 'publish' ? 'O conteúdo ficará visível no site.' : 'O conteúdo ficará guardado no WordPress sem publicação pública.'}</p><div className="mt-3 flex flex-wrap gap-2"><Button className="min-h-11" disabled={busy || bloqueado} onClick={() => void executar('enfileirar', { pautaId: pauta.id, versao: pauta.versao, destino: confirmar, confirmar: true, pedidoId: crypto.randomUUID() })}>{busy ? 'A registar…' : confirmar === 'publish' ? 'Confirmar publicação' : 'Confirmar rascunho'}</Button><Button variant="ghost" className="min-h-11" disabled={busy} onClick={() => setConfirmar(null)}>Cancelar</Button></div></AlertDescription></Alert>}
  {!!q.data?.envios.length && <ul className="divide-y">{q.data.envios.map(e => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">Versão {e.versao} · {e.destino === 'publish' ? 'Publicação' : 'Rascunho'}</p><p className="mt-1 text-muted-foreground">{e.estado==='falhou'&&e.escrita_iniciada===false?'Preparação falhou antes de enviar. Corrige a causa e cria um novo pedido.':nomes[e.estado] ?? e.estado}</p></div>{e.estado === 'enviado' && e.remoto_url ? <Button asChild variant="link" className="min-h-11"><a href={e.remoto_url} target="_blank" rel="noreferrer">Abrir no site<ExternalLink aria-hidden="true" className="size-4"/></a></Button> : q.data.podeEditar&&!(e.estado==='falhou'&&e.escrita_iniciada===false) ? <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void executar('reconciliar', { id: e.id })}><RefreshCw aria-hidden="true" className="size-4"/>Confirmar resultado</Button> : null}</li>)}</ul>}
  {!!q.data?.imagens?.filter(i=>i.site_id===site.id&&i.estado!=='enviado').length&&<Alert><AlertDescription><p className="font-medium">Imagens com resultado por confirmar</p><p className="mt-1 text-sm">A confirmação consulta o WordPress sem repetir o upload.</p>{q.data.imagens.filter(i=>i.site_id===site.id&&i.estado!=='enviado').map(i=><div key={i.hash} className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="break-words">{i.metadados?.titulo||'Imagem do artigo'}</span>{q.data.podeEditar&&<Button variant="outline" disabled={busy} onClick={()=>void executar('imagem-reconciliar',{siteId:site.id,hash:i.hash})}>Confirmar imagem</Button>}</div>)}</AlertDescription></Alert>}
  {!!q.data?.trabalhos.length && <details><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary underline underline-offset-4">Histórico de processamento ({q.data.trabalhos.length})</summary><ul className="divide-y text-sm">{q.data.trabalhos.map(j => <li key={j.id} className="py-3"><p>Versão {j.pedido.versao} · {nomes[j.estado] ?? j.estado}</p>{j.resultado?.erro && <p className="mt-1 break-words text-muted-foreground">{j.resultado.erro}</p>}</li>)}</ul></details>}
  </>}
  {erro && <p role="alert" className="aviso-texto text-sm">{erro}</p>}{aviso && <p role="status" className="text-sm">{aviso}</p>}
 </section>;
}
