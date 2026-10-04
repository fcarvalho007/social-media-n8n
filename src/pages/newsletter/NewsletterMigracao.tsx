import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserRoles } from '@/hooks/useUserRoles';
import { apagarPacoteStaging, dryRunImport, enviarPacoteStaging, importarLote, listarExecucoes } from '@/services/estudio';

type Relatorio = Record<string, unknown>;

export default function NewsletterMigracao() {
  const { user } = useAuth();
  const { isAdmin, isLoading } = useCurrentUserRoles();
  const qc = useQueryClient();
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [caminho, setCaminho] = useState<string | null>(null);
  const [estado, setEstado] = useState<string>('');
  const [dry, setDry] = useState<Relatorio | null>(null);
  const [final, setFinal] = useState<Relatorio | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const { data: execucoes = [] } = useQuery({ queryKey: ['nl-import-runs'], queryFn: listarExecucoes, enabled: isAdmin });

  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">A verificar permissões…</p>;
  if (!isAdmin) return <p className="p-4 text-sm text-destructive">Apenas administradores podem aceder à migração.</p>;

  const verificar = async () => {
    if (!ficheiro || !user) return;
    setOcupado(true); setDry(null); setFinal(null);
    try {
      setEstado('A enviar o pacote para o armazenamento privado…');
      const { caminho: c } = await enviarPacoteStaging(user.id, ficheiro);
      setCaminho(c);
      setEstado('A verificar hashes, relações e conflitos no servidor…');
      const r = await dryRunImport(c);
      setDry(r.relatorio as Relatorio);
      setEstado('Verificação concluída.');
      qc.invalidateQueries({ queryKey: ['nl-import-runs'] });
    } catch (e) { setEstado(''); toast.error((e as Error).message); }
    finally { setOcupado(false); }
  };

  const importar = async () => {
    if (!caminho) return;
    setOcupado(true);
    try {
      let runId: string | undefined;
      for (let i = 0; i < 200; i++) {
        const r = await importarLote(caminho, runId);
        runId = r.run_id as string;
        const prog = r.progresso as { tabelas?: Record<string, number> } | undefined;
        setEstado(`A importar… ${Object.keys(prog?.tabelas ?? {}).length} tabelas em curso ou concluídas`);
        if (r.concluido) { setFinal((r.relatorio as Relatorio) ?? { concluido: true }); break; }
      }
      setEstado('Importação concluída.');
      qc.invalidateQueries();
    } catch (e) { toast.error(`Importação interrompida (pode ser retomada): ${(e as Error).message}`); }
    finally { setOcupado(false); }
  };

  const limpar = async () => {
    if (caminho) await apagarPacoteStaging(caminho);
    setCaminho(null); setFicheiro(null); setDry(null);
    toast.success('Pacote temporário apagado');
  };

  const pronto = dry?.pronto === true;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Link to="/newsletter" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" />Newsletter</Link>
      <h1 className="text-2xl font-semibold">Migração da newsletter</h1>
      <Card className="flex gap-2 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p>O pacote é confidencial: fica num armazenamento privado só de administradores e é validado no servidor. Os papéis de utilizador nunca são criados a partir do pacote; atribuem-se depois em Utilizadores. Agendamentos importados ficam suspensos.</p>
      </Card>

      <Card className="space-y-3 p-4">
        <Input type="file" accept="application/json,.json" aria-label="Pacote de exportação" disabled={ocupado}
          onChange={(e) => { setFicheiro(e.target.files?.[0] ?? null); setDry(null); setFinal(null); }} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={verificar} disabled={!ficheiro || ocupado}>Verificar (simulação)</Button>
          <Button onClick={importar} disabled={!pronto || ocupado} variant={pronto ? 'default' : 'secondary'}>Importar</Button>
          {caminho && <Button variant="outline" onClick={limpar} disabled={ocupado}>Apagar pacote temporário</Button>}
        </div>
        {estado && <p className="text-sm" aria-live="polite">{estado}</p>}
      </Card>

      {dry && <RelatorioDry r={dry} />}
      {final && (
        <Card className="space-y-2 p-4">
          <h2 className="font-medium">Relatório da importação</h2>
          <pre className="max-h-96 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(final, null, 2)}</pre>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 font-medium">Execuções recentes</h2>
        <ul className="space-y-1 text-sm">
          {execucoes.map((x) => (
            <li key={x.id} className="flex flex-wrap gap-2">
              <span>{new Date(x.created_at).toLocaleString('pt-PT')}</span>
              <Badge variant="outline">{x.modo === 'dry_run' ? 'Simulação' : 'Importação'}</Badge>
              <Badge variant={x.estado === 'falhada' ? 'destructive' : 'secondary'}>{x.estado}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{x.ficheiro_sha256.slice(0, 12)}</span>
            </li>
          ))}
          {execucoes.length === 0 && <li className="text-muted-foreground">Sem execuções.</li>}
        </ul>
      </Card>
    </div>
  );
}

function RelatorioDry({ r }: { r: Record<string, unknown> }) {
  const v = r.verificacao as { erros: string[]; avisos: string[]; tabelas: { nome: string; registos: number; hash_ok: boolean }[]; ficheiros: unknown[]; hash_global_ok: boolean };
  const fks = (r.fks as { relacao: string; em_falta: number }[]).filter((f) => f.em_falta > 0);
  const conflitos = (r.conflitos as { tabela: string; existentes: number }[]).filter((c) => c.existentes > 0);
  const users = r.utilizadores as { source_nome: string | null; source_papel: string | null; target_user_id: string | null }[];
  const ign = r.colunas_ignoradas as { tabela: string; colunas: string[] }[];
  const total = v.tabelas.reduce((s, t) => s + t.registos, 0);
  return (
    <Card className="space-y-3 p-4 text-sm">
      <h2 className="font-medium">Resultado da simulação</h2>
      <p>{v.tabelas.length} tabelas · {total} registos · {v.ficheiros.length} ficheiros · hash global {v.hash_global_ok ? 'válido' : 'inválido'}</p>
      {r.pronto ? <Badge>Pronto a importar</Badge> : <Badge variant="destructive">Bloqueado</Badge>}
      {v.erros.length > 0 && <ul className="list-disc pl-5 text-destructive">{v.erros.map((e) => <li key={e}>{e}</li>)}</ul>}
      {v.avisos.length > 0 && <ul className="list-disc pl-5 text-muted-foreground">{v.avisos.map((e) => <li key={e}>{e}</li>)}</ul>}
      {fks.length > 0 && <div><b>Relações em falta:</b><ul className="list-disc pl-5">{fks.map((f) => <li key={f.relacao}>{f.relacao}: {f.em_falta}</li>)}</ul></div>}
      {conflitos.length > 0 && <div><b>Registos já existentes (serão mantidos, não substituídos):</b><ul className="list-disc pl-5">{conflitos.map((c) => <li key={c.tabela}>{c.tabela}: {c.existentes}</li>)}</ul></div>}
      {ign.length > 0 && <div><b>Colunas sem correspondência (ignoradas):</b><ul className="list-disc pl-5">{ign.map((c) => <li key={c.tabela}>{c.tabela}: {c.colunas.join(', ')}</li>)}</ul></div>}
      <p>Agendamentos a suspender: {String(r.agendamentos_a_suspender)}</p>
      <div>
        <b>Utilizadores de origem</b>
        <ul className="list-disc pl-5">
          {users.map((u, i) => <li key={i}>{u.source_nome ?? 'Sem nome'} ({u.source_papel ?? '—'}): {u.target_user_id ? 'corresponde a uma conta existente' : 'sem conta correspondente'}</li>)}
        </ul>
      </div>
    </Card>
  );
}
