import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Progresso = { estado: string; offset_proximo: number; total_egoi: number | null; actualizados: number; ja_correctos: number; ignorados: number; ultimo_erro: string | null; concluido_em: string | null };
type ListaEstado = { nome: string; egoi_lista_id: string; progresso: Progresso | null; falhas_pendentes: number };
type Resposta = { ok: boolean; configurado?: boolean; tag?: string | null; listas: ListaEstado[]; problemas?: string[]; terminado?: boolean; resultado?: { estado: string; erro?: string } | null; error?: string };

const ESTADOS: Record<string, string> = { por_iniciar: "Por iniciar", em_curso: "Em curso", concluida: "Concluída", campo_invalido: "Campo inválido" };
const CONFIRMAR = { confirmar: "sincronizar-tokens" };

/** Admin panel for the resumable E-goi token sync: progress per list, batches, retry failures, readiness. */
export function SincronizacaoTokens() {
  const [r, setR] = useState<Resposta | null>(null);
  const [aCorrer, setACorrer] = useState(false);
  const parar = useRef(false);

  const chamar = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("nl-hooks/sincronizar-tokens", { body });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json().catch(() => null) as Resposta | null : null;
      if (j?.listas) setR((a) => ({ ...(a ?? j), ...j }));
      throw new Error(j?.error ?? j?.problemas?.join(" ") ?? "Pedido recusado");
    }
    return data as Resposta;
  }, []);

  const actualizar = useCallback(() => chamar({ accao: "estado" }).then(setR).catch((e: Error) => toast.error(e.message)), [chamar]);
  useEffect(() => { actualizar(); }, [actualizar]);

  async function correr() {
    setACorrer(true); parar.current = false;
    try {
      // Each call is one limited batch from the saved position; stopping or closing the page loses nothing.
      for (let i = 0; i < 500 && !parar.current; i++) {
        const d = await chamar({ accao: "lote", ...CONFIRMAR });
        setR((a) => ({ ...(a as Resposta), listas: d.listas }));
        if (d.terminado) break;
        if (d.resultado?.erro) { toast.error(d.resultado.erro); break; }
      }
    } catch (e) { toast.error((e as Error).message); }
    setACorrer(false); actualizar();
  }

  async function accao(body: Record<string, unknown>, ok: string) {
    setACorrer(true);
    try { await chamar({ ...body, ...CONFIRMAR }); toast.success(ok); } catch (e) { toast.error((e as Error).message); }
    setACorrer(false); actualizar();
  }

  const Confirmar = ({ rotulo, titulo, texto, onOk, variante }: { rotulo: string; titulo: string; texto: string; onOk: () => void; variante?: "outline" }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button size="sm" variant={variante} disabled={aCorrer}>{rotulo}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{titulo}</AlertDialogTitle><AlertDialogDescription>{texto}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onOk}>Continuar</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <section className="space-y-2 rounded-md border p-3 text-sm">
      <h2 className="font-medium">Tokens de subscrição na E-goi</h2>
      <p className="text-muted-foreground">Escreve em cada contacto das listas reais o token assinado das ligações «Gerir a subscrição» e «Cancelar». Avança por lotes e guarda a posição: pode parar e retomar sem voltar ao início. Não envia emails.</p>
      <p>Código nos emails: <code>{r?.tag ?? "por configurar"}</code></p>
      {r && (
        <p className={r.ok ? "text-primary" : "text-destructive"}>
          {r.ok ? "Pronto para envio real." : `Envio real bloqueado: ${(r.problemas ?? []).join(" ") || "por verificar."}`}
        </p>
      )}
      <ul className="space-y-1">
        {(r?.listas ?? []).map((l) => (
          <li key={l.egoi_lista_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-1">
            <span className="font-medium">{l.nome}</span>
            <span>{ESTADOS[l.progresso?.estado ?? "por_iniciar"]}</span>
            <span className="text-muted-foreground">{l.progresso ? `${l.progresso.offset_proximo}${l.progresso.total_egoi !== null ? ` de ${l.progresso.total_egoi}` : ""} contactos · ${l.progresso.actualizados} escritos · ${l.progresso.ja_correctos} já certos · ${l.falhas_pendentes} falha(s)` : "—"}</span>
            {l.progresso?.ultimo_erro && <span className="text-destructive">{l.progresso.ultimo_erro}</span>}
            {l.progresso && (
              <Confirmar variante="outline" rotulo="Recomeçar" titulo={`Recomeçar «${l.nome}»?`} texto="Apaga o progresso e as falhas desta lista e volta a percorrer todos os contactos. Os tokens já certos não são reescritos." onOk={() => accao({ accao: "recomecar", lista: l.egoi_lista_id }, "Lista recomeçada.")} />
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {aCorrer
          ? <Button size="sm" variant="outline" onClick={() => { parar.current = true; }}>Parar depois deste lote</Button>
          : <Confirmar rotulo="Sincronizar / retomar" titulo="Atualizar contactos na E-goi?" texto="Escreve o token de subscrição nos contactos das listas reais, a partir da posição guardada. Não envia emails." onOk={correr} />}
        <Confirmar variante="outline" rotulo="Repetir falhas" titulo="Repetir os contactos com falha?" texto="Volta a escrever o token só nos contactos que falharam." onOk={() => accao({ accao: "repetir-falhas" }, "Falhas repetidas.")} />
        <Button size="sm" variant="ghost" disabled={aCorrer} onClick={actualizar}>Verificar estado</Button>
      </div>
    </section>
  );
}
