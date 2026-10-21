import { AgendaDocumentos, type AgendaRecolha } from './AgendaDocumentos';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiBackend } from '@/lib/backendHub';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
interface Estado {
    podeEditar: boolean;
    operacao: {
        pausado: boolean;
        agenda_documentos?: AgendaRecolha | null;
    };
    trabalhos: {
        id: string;
        tipo: string;
        estado: string;
    }[];
}
export function EstadoServicoEditorial({ projeto, consultar = apiBackend }: {
    projeto: string | null;
    consultar?: typeof apiBackend;
}) {
    const qc = useQueryClient(), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState(''), [confirmar, setConfirmar] = useState(false), [sucesso, setSucesso] = useState('');
    const key = ['hub-servico', projeto];
    const q = useQuery({ queryKey: key, enabled: !!projeto, queryFn: () => consultar<Estado>('/operacao/estado', {}, { projeto: projeto! }), retry: false, refetchInterval: 15000 });
    async function mudar(acao: 'pausar' | 'retomar' | 'backup') {
        setOcupado(true);
        setErro('');
        setSucesso('');
        try {
            await consultar(`/operacao/${acao}`, { confirmar: true }, { projeto: projeto! });
            setConfirmar(false);
            setSucesso(acao === 'backup' ? 'Ponto de recuperação guardado; os ficheiros foram verificados.' : acao === 'pausar' ? 'Novos trabalhos em pausa. As operações já enviadas podem terminar.' : 'Serviço retomado; os limites e as aprovações continuam ativos.');
            await qc.invalidateQueries({ queryKey: key });
        }
        catch (e) {
            setErro((e as Error).message);
        }
        finally {
            setOcupado(false);
        }
    }
    if (!projeto)
        return null;
    if (q.isLoading)
        return <p role="status" className="text-sm text-muted-foreground">A verificar o serviço de tarefas…</p>;
    if (q.error)
        return <Alert><AlertTitle>Serviço editorial indisponível</AlertTitle><AlertDescription><p>{q.error.message}</p><Button variant="outline" className="mt-3 min-h-11" onClick={() => void q.refetch()}>Tentar novamente</Button></AlertDescription></Alert>;
    const pausado = q.data?.operacao.pausado !== false, ativos = q.data?.trabalhos.filter(t => ['fila', 'em_curso'].includes(t.estado)).length ?? 0;
    return <section aria-label="Serviço de tarefas editoriais" className="flex flex-col gap-3 rounded-xl border bg-card p-4"><div><h2 className="text-base font-semibold">{pausado ? 'Tarefas em pausa' : 'Serviço de tarefas ativo'}</h2><p className="mt-1 text-sm text-muted-foreground">{pausado ? 'As recolhas e os ciclos automáticos aguardam a tua retoma.' : 'Podes fechar o navegador. O servidor continua os trabalhos autorizados pelas políticas e pelos limites.'} {ativos > 0 ? `${ativos} trabalhos na fila ou em execução.` : ''}</p></div>
 {q.data?.podeEditar === true && (confirmar ? <div className="flex flex-col gap-3"><p className="text-sm">Retomar permite executar os trabalhos já na fila e os ciclos autorizados. Os limites e as aprovações mantêm-se.</p><div className="flex flex-wrap gap-2"><Button className="min-h-11" disabled={ocupado} onClick={() => void mudar('retomar')}>Confirmar retoma</Button><Button variant="outline" className="min-h-11" disabled={ocupado} onClick={() => setConfirmar(false)}>Cancelar</Button></div></div> : <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" disabled={ocupado} onClick={() => pausado ? setConfirmar(true) : void mudar('pausar')}>{ocupado ? 'A atualizar…' : pausado ? 'Retomar tarefas' : 'Pausar tarefas'}</Button><Button variant="outline" className="min-h-11" disabled={ocupado || !pausado || ativos > 0} onClick={() => void mudar('backup')}>Guardar ponto de recuperação</Button></div>)}
 {q.data?.podeEditar && <AgendaDocumentos projeto={projeto} inicial={q.data.operacao.agenda_documentos} consultar={consultar} atualizar={() => qc.invalidateQueries({ queryKey: key })}/>}
 {sucesso && <p role="status" className="text-sm text-muted-foreground">{sucesso}</p>}
 {erro && <p role="alert" className="text-sm text-aviso-texto">{erro}</p>}</section>;
}
