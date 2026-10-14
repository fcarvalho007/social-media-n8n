// Post-send Instagram carousel proposal for one newsletter edition.
// Real proposal appears only after E-goi confirms a real send; the pre-send test draft is a
// separate, explicitly labelled action that never touches the real send path.
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Images, Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adiarCarrosselEdicao, criarCarrosselEdicao, estadoPropostaEdicao, prepararRascunhoTeste, type PropostaEdicao,
} from "@/services/conteudos";

const TEXTOS: Record<PropostaEdicao["estado"], string> = {
  nenhuma: "Aparece aqui depois de a E-goi confirmar um envio real. Envios de teste não contam.",
  a_confirmar: "Envio real aceite. A aguardar a confirmação de entrega da E-goi.",
  rever_fonte: "É preciso confirmar a fonte antes de criar o carrossel.",
  pronta_criar: "Envio real confirmado pela E-goi. Cria o carrossel desta edição para rever antes de publicar.",
  adiada: "Ficou para mais tarde. Podes criá-lo quando quiseres.",
  a_criar: "A preparar a proposta de carrossel…",
  rascunho: "Rascunho pronto para rever. Nada é publicado sem a tua revisão.",
  erro: "Não foi possível preparar o carrossel.",
};

export function PropostaCarrossel({ edicaoId, numero, enviada }: { edicaoId: string; numero: number; enviada: boolean }) {
  const qc = useQueryClient();
  const [confirmar, setConfirmar] = useState(false);
  const chave = ["proposta-carrossel", edicaoId];
  const q = useQuery({
    queryKey: chave,
    queryFn: () => estadoPropostaEdicao(edicaoId),
    retry: false,
    // Poll only while a confirmation or generation is pending, so the proposal shows up in-session.
    refetchInterval: (query) => {
      const e = (query.state.data as PropostaEdicao | undefined)?.estado;
      return e === "a_confirmar" || e === "a_criar" ? 30_000 : false;
    },
  });
  const actualizar = (d: PropostaEdicao) => qc.setQueryData(chave, d);
  const criar = useMutation({ mutationFn: () => criarCarrosselEdicao(edicaoId), onSuccess: actualizar, onError: (e: Error) => toast.error(e.message) });
  const adiar = useMutation({ mutationFn: () => adiarCarrosselEdicao(edicaoId), onSuccess: actualizar, onError: (e: Error) => toast.error(e.message) });
  const teste = useMutation({
    mutationFn: () => prepararRascunhoTeste(edicaoId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: chave }); toast.success("Rascunho de teste pronto. Abre-o para gerar e rever."); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isError || !q.data) return null; // non-staff or unreachable: no card
  const p = q.data;
  const ocupado = criar.isPending || adiar.isPending;

  return (
    <section aria-labelledby={`carrossel-${edicaoId}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Images size={16} className="text-muted-foreground" aria-hidden />
        <h2 id={`carrossel-${edicaoId}`} className="text-[15px] font-semibold">Carrossel para Instagram</h2>
        {p.estado === "rascunho" && <Badge variant="secondary">Rascunho</Badge>}
      </div>
      <p className="text-[13.5px] text-muted-foreground">{p.erro ? `${TEXTOS.erro} ${p.erro}` : TEXTOS[p.estado]}</p>

      <div className="flex flex-wrap gap-2">
        {(p.estado === "pronta_criar" || p.estado === "adiada") && (
          <Button size="sm" disabled={ocupado} onClick={() => setConfirmar(true)}>
            {criar.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar carrossel
          </Button>
        )}
        {p.estado === "pronta_criar" && (
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => adiar.mutate()}>Mais tarde</Button>
        )}
        {(p.estado === "rascunho" || p.estado === "rever_fonte" || p.estado === "erro" || p.estado === "a_criar") && p.conteudo_id && (
          <Button size="sm" variant={p.estado === "rascunho" ? "default" : "outline"} asChild>
            <Link to={`/estudio/redes-sociais/${p.conteudo_id}`}>{p.estado === "rascunho" ? "Abrir rascunho" : "Abrir"}</Link>
          </Button>
        )}
      </div>

      {!enviada && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FlaskConical size={14} className="text-muted-foreground" aria-hidden />
            <span className="text-[13px] font-semibold">Teste · pré-envio</span>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Rascunho de verificação a partir da composição atual da #{numero}. Não conta como envio, não cria campanhas e não bloqueia o carrossel da versão enviada.
          </p>
          {p.teste ? (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/estudio/redes-sociais/${p.teste.conteudo_id}`}>Abrir rascunho de teste</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={teste.isPending} onClick={() => teste.mutate()}>
              {teste.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Criar rascunho de teste (pré-envio)
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar o carrossel da edição #{numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              A proposta é gerada com IA (tem custo) a partir da versão enviada: crónica, os três destaques com a leitura aprovada e as fontes. Fica como rascunho para rever; nada é publicado nem agendado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => criar.mutate()}>Criar carrossel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
