// Post-send Instagram carousel proposal for one newsletter edition.
// Real proposal appears only after E-goi confirms a real send; the pre-send test draft is a
// separate, explicitly labelled action that never touches the real send path.
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Images, Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adiarCarrosselEdicao, prepararDivulgacao, estadoPropostaEdicao, prepararRascunhoTeste, type PropostaEdicao,
} from "@/services/conteudos";

const TEXTOS: Record<PropostaEdicao["estado"], string> = {
  nenhuma: "Após o envio real confirmado, o Hub prepara um Story da crónica e um carrossel dos destaques. O envio interno serve apenas para testar.",
  a_confirmar: "Envio real aceite. A aguardar a confirmação de entrega da E-goi.",
  rever_fonte: "É preciso confirmar a fonte antes de criar o carrossel.",
  pronta_criar: "Envio real confirmado. Prepara duas peças editáveis, sem chamadas à IA, para rever antes de publicar.",
  adiada: "Ficou para mais tarde. Podes criá-lo quando quiseres.",
  a_criar: "A preparar a proposta de carrossel…",
  rascunho: "Story no dia do envio; carrossel no dia seguinte. Abre para preparar ou rever as duas peças no Hub. A publicação é manual.",
  erro: "Não foi possível preparar o carrossel.",
};

export function PropostaCarrossel({ edicaoId, numero, enviada }: { edicaoId: string; numero: number; enviada: boolean }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const chave = ["proposta-carrossel", edicaoId];
  const q = useQuery({
    queryKey: chave,
    queryFn: () => estadoPropostaEdicao(edicaoId),
    retry: false,
    // Poll only while a confirmation or generation is pending, so the proposal shows up in-session.
    refetchInterval: (query) => {
      const e = (query.state.data as PropostaEdicao | undefined)?.estado;
      return e === "nenhuma" || e === "a_confirmar" || e === "a_criar" ? 30_000 : false;
    },
  });
  useEffect(() => { if (enviada) void q.refetch(); }, [enviada]); // eslint-disable-line react-hooks/exhaustive-deps
  const actualizar = (d: PropostaEdicao) => qc.setQueryData(chave, d);
  const criar = useMutation({ mutationFn: async () => {
    if (!q.data?.conteudo_id) throw new Error("Ainda não há uma fonte confirmada para esta edição.");
    await prepararDivulgacao(q.data.conteudo_id); return q.data.conteudo_id;
  }, onSuccess: (id) => { qc.invalidateQueries({ queryKey: chave }); nav(`/estudio/redes-sociais/${id}`); }, onError: (e: Error) => toast.error(e.message) });
  const adiar = useMutation({ mutationFn: () => adiarCarrosselEdicao(edicaoId), onSuccess: actualizar, onError: (e: Error) => toast.error(e.message) });
  const teste = useMutation({
    mutationFn: () => prepararRascunhoTeste(edicaoId),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: chave }); nav(`/estudio/redes-sociais/${d.conteudo_id}`); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isError) return <section className="rounded-xl border p-4 text-sm" role="alert"><p>Não foi possível ler o estado da divulgação.</p><Button variant="outline" size="sm" onClick={() => q.refetch()}>Tentar de novo</Button></section>;
  if (!q.data) return <p role="status" className="text-sm text-muted-foreground">A ler o estado da divulgação…</p>;
  const p = q.data;
  const ocupado = criar.isPending || adiar.isPending;

  return (
    <section aria-labelledby={`carrossel-${edicaoId}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Images size={16} className="text-muted-foreground" aria-hidden />
        <h2 id={`carrossel-${edicaoId}`} className="text-[15px] font-semibold">Divulgação no Instagram</h2>
        {p.estado === "rascunho" && <Badge variant="secondary">Rascunho</Badge>}
      </div>
      <p className="text-[13.5px] text-muted-foreground">{p.erro ? `${TEXTOS.erro} ${p.erro}` : TEXTOS[p.estado]}</p>

      <div className="flex flex-wrap gap-2">
        {(p.estado === "pronta_criar" || p.estado === "adiada") && (
          <Button size="sm" disabled={ocupado} onClick={() => criar.mutate()}>
            {criar.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Preparar divulgação · sem IA
          </Button>
        )}
        {p.estado === "pronta_criar" && (
          <Button size="sm" variant="ghost" disabled={ocupado} onClick={() => adiar.mutate()}>Mais tarde</Button>
        )}
        {(p.estado === "rascunho" || p.estado === "rever_fonte" || p.estado === "erro" || p.estado === "a_criar") && p.conteudo_id && (
          <Button size="sm" variant={p.estado === "rascunho" ? "default" : "outline"} asChild>
            <Link to={`/estudio/redes-sociais/${p.conteudo_id}`}>{p.estado === "rascunho" ? "Rever Story e carrossel" : "Abrir"}</Link>
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
            Experimenta as duas peças a partir da composição atual da #{numero}. Não conta como envio real e não interfere com os rascunhos da versão enviada.
          </p>
          {p.teste ? (
            <Button size="sm" variant="outline" asChild>
              <Link to={`/estudio/redes-sociais/${p.teste.conteudo_id}`}>Rever divulgação de teste</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={teste.isPending} onClick={() => teste.mutate()}>
              {teste.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Preparar divulgação de teste · sem IA
            </Button>
          )}
        </div>
      )}

    </section>
  );
}
