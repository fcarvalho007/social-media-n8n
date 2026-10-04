import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarContasEstudio, listarMapeamentos, mapearPerfil, type ContaEstudio, type MapeamentoPerfil } from "@/services/estudio";

const NENHUMA = "__nenhuma__";

/** `versao` changes (e.g. after a completed import) reload the list without a page reload. */
export function MapeamentoPerfis({ versao = 0 }: { versao?: number }) {
  const [maps, setMaps] = useState<MapeamentoPerfil[]>([]);
  const [contas, setContas] = useState<ContaEstudio[]>([]);

  const carregar = () => Promise.all([listarMapeamentos(), listarContasEstudio()])
    .then(([m, c]) => { setMaps(m); setContas(c); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { carregar(); }, [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!maps.length) return null;
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="text-sm font-medium">Perfis da origem</div>
      <p className="text-xs text-muted-foreground">Associa cada perfil a uma conta já existente. Não altera papéis; cada mudança fica no histórico.</p>
      {maps.map((m) => (
        <div key={m.source_user_id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">{m.source_nome ?? "Sem nome"} <span className="text-muted-foreground">({m.source_papel ?? "sem papel"} na origem · {m.historico.length} alteração(ões))</span></div>
          <Select value={m.target_user_id ?? NENHUMA} onValueChange={async (v) => {
            try { await mapearPerfil(m.source_user_id, v === NENHUMA ? null : v); toast.success("Associação guardada"); carregar(); }
            catch (e) { toast.error((e as Error).message); }
          }}>
            <SelectTrigger className="sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA}>Sem associação</SelectItem>
              {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.email ?? c.full_name ?? c.id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
