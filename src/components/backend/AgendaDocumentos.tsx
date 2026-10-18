import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiBackend } from '@/lib/backendHub';
export interface AgendaRecolha {
    ativa: boolean;
    dias: number[];
    hora: string;
}
export function AgendaDocumentos({ projeto, inicial, consultar = apiBackend, atualizar }: {
    projeto: string;
    inicial?: AgendaRecolha | null;
    consultar?: typeof apiBackend;
    atualizar: () => Promise<unknown>;
}) {
    const base = JSON.stringify(inicial ?? { ativa: false, dias: [1], hora: '08:00' }), [form, setForm] = useState<AgendaRecolha>(JSON.parse(base)), [guardado, setGuardado] = useState(base), [busy, setBusy] = useState(false), [erro, setErro] = useState(''), [sucesso, setSucesso] = useState(false), sujo = JSON.stringify(form) !== guardado;
    useEffect(() => {
        if (!sujo) {
            setForm(JSON.parse(base));
            setGuardado(base);
        }
    }, [base, sujo]);
    async function guardar() {
        setBusy(true);
        setErro('');
        setSucesso(false);
        try {
            await consultar('/operacao/agenda', { agenda: form }, { projeto });
            await atualizar();
            setGuardado(JSON.stringify(form));
            setSucesso(true);
        }
        catch (e) {
            setErro((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <details className="border-t pt-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm text-primary underline underline-offset-4">Recolha periódica de documentos{inicial?.ativa ? ' · ativa' : ' · desligada'}</summary><div className="flex max-w-prose flex-col gap-3 pb-2 pt-3"><p className="text-sm text-muted-foreground">Consulta as fontes configuradas, evita PDFs repetidos e prepara texto e capas no servidor. A execução respeita a pausa geral e o robots.txt. Consome uso do backend; não usa IA paga.</p><label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={form.ativa} disabled={busy} onCheckedChange={v => { setForm(f => ({ ...f, ativa: v === true })); setSucesso(false); }}/>Ativar recolha periódica</label><div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col gap-2"><Label htmlFor="agenda-docs-cadencia">Frequência</Label><select id="agenda-docs-cadencia" disabled={busy} className="min-h-11 rounded-lg border bg-background px-3 text-sm" value={form.dias.length === 7 ? 'diaria' : 'semanal'} onChange={e => setForm(f => ({ ...f, dias: e.target.value === 'diaria' ? [0, 1, 2, 3, 4, 5, 6] : [1] }))}><option value="semanal">Semanal · segunda-feira</option><option value="diaria">Todos os dias</option></select></div><div className="flex flex-col gap-2"><Label htmlFor="agenda-docs-hora">Hora de Lisboa</Label><Input id="agenda-docs-hora" className="min-h-11" type="time" disabled={busy} value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}/></div></div><Button variant="outline" className="min-h-11 self-start" disabled={busy || !sujo || !form.hora} onClick={() => void guardar()}>{busy ? 'A guardar…' : 'Guardar recolha periódica'}</Button>{sujo && <p className="text-xs text-muted-foreground">Alterações por guardar. A agenda anterior mantém-se.</p>}{erro && <p role="alert" className="text-sm text-aviso-texto">{erro}</p>}{sucesso && <p role="status" className="text-sm text-muted-foreground">Agenda guardada. As tarefas só avançam quando o serviço está ativo.</p>}</div></details>;
}
