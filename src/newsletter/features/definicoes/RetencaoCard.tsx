// Retenção de dados — apaga conteúdo com mais de 30 dias que nunca entrou
// numa edição. O automatismo corre todas as noites; aqui é só o disparo manual.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { contarDadosAntigos, limparDadosAntigos } from "@/newsletter/features/newsletter/data";

const T = { card: "#FFFFFF", line: "#E4E7EC", ink: "#101828", muted: "#667085" };
const COR = "#EF4444";
const DIAS = 30;

export function RetencaoCard({ podeEditar }: { podeEditar: boolean }) {
  const qc = useQueryClient();
  const [confirmar, setConfirmar] = useState(false);

  const contagem = useQuery({
    queryKey: ["retencao", DIAS],
    queryFn: () => contarDadosAntigos(DIAS),
    staleTime: 60_000,
  });

  const limpar = useMutation({
    mutationFn: () => limparDadosAntigos(DIAS),
    onSuccess: (r) => {
      setConfirmar(false);
      qc.invalidateQueries({ queryKey: ["retencao"] });
      qc.invalidateQueries({ queryKey: ["noticias"] });
      qc.invalidateQueries({ queryKey: ["pendentes"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      toast.success(`Limpeza concluída: ${r.noticias} notícias, ${r.fila} itens de fila, ${r.emails} emails`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = contagem.data;
  const total = d ? d.noticias + d.fila + d.emails : 0;

  return (
    <section className="rounded-[20px] p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      <header className="mb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: `${COR}1F`, color: COR }}>
            <Trash2 size={16} />
          </span>
          <h2 className="text-[15px] font-bold" style={{ color: T.muted }}>Retenção de dados · {DIAS} dias</h2>
        </div>
        <p className="mt-2 text-[13px]" style={{ color: T.muted }}>
          Todas as noites é apagado o conteúdo com mais de {DIAS} dias que nunca entrou numa edição:
          notícias rejeitadas, itens de fila já processados e emails sem uso. O arquivo e as edições
          passadas mantêm-se intactos.
        </p>
      </header>

      {contagem.isLoading ? (
        <p className="text-[14px]" style={{ color: T.muted }}>A contar…</p>
      ) : d ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { rotulo: "Notícias", valor: d.noticias },
            { rotulo: "Fila de curadoria", valor: d.fila },
            { rotulo: "Emails", valor: d.emails },
          ].map((x) => (
            <div key={x.rotulo} className="rounded-xl px-3.5 py-3" style={{ border: `1px solid ${T.line}` }}>
              <p className="text-[22px] font-bold tabular-nums" style={{ color: T.ink }}>{x.valor}</p>
              <p className="text-[12.5px]" style={{ color: T.muted }}>{x.rotulo}</p>
            </div>
          ))}
        </div>
      ) : null}

      {podeEditar && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!confirmar ? (
            <button
              type="button" disabled={total === 0 || limpar.isPending}
              onClick={() => setConfirmar(true)}
              className="rounded-xl px-4 py-2.5 text-[14.5px] font-bold text-white disabled:opacity-50"
              style={{ background: COR }}
            >
              Limpar agora ({total})
            </button>
          ) : (
            <>
              <span className="text-[13.5px] font-semibold" style={{ color: COR }}>
                Confirmas apagar {total} registo(s)?
              </span>
              <button
                type="button" disabled={limpar.isPending} onClick={() => limpar.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[14.5px] font-bold text-white disabled:opacity-50"
                style={{ background: COR }}
              >
                {limpar.isPending && <Loader2 size={15} className="animate-spin" />} Sim, apagar
              </button>
              <button
                type="button" disabled={limpar.isPending} onClick={() => setConfirmar(false)}
                className="rounded-xl bg-muted px-3.5 py-2.5 text-[14.5px] font-semibold"
                style={{ color: T.ink }}
              >
                Voltar atrás
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
