// Limpeza de pendentes antigas — partilhada pelos dois editores.
// Duas acções explícitas: arquivar (rejeitar, recuperável) ou apagar de vez.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  idsPendentesAntigas, rejeitarNoticiasEmMassa, apagarNoticiasEmMassa, registarAudit,
} from "../data";

export const DIAS_ANTIGAS = 14;

export function LimparAntigas({
  aberto, onAberto, nomeExibicao, antigasCount, onConcluido,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  nomeExibicao: string;
  antigasCount: number;
  onConcluido?: () => void;
}) {
  const qc = useQueryClient();
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const limpar = useMutation({
    mutationFn: async (modo: "arquivar" | "apagar") => {
      const ids = await idsPendentesAntigas(DIAS_ANTIGAS);
      if (ids.length === 0) return { modo, n: 0 };
      if (modo === "apagar") {
        await apagarNoticiasEmMassa(ids);
        await registarAudit(nomeExibicao, `Apagou definitivamente ${ids.length} notícia(s) antiga(s)`, {
          dias_min: DIAS_ANTIGAS, quantidade: ids.length, modo,
        });
      } else {
        await rejeitarNoticiasEmMassa(ids);
        await registarAudit(nomeExibicao, `Rejeição em massa: ${ids.length} notícia(s) antiga(s)`, {
          dias_min: DIAS_ANTIGAS, quantidade: ids.length, modo,
        });
      }
      return { modo, n: ids.length };
    },
    onSuccess: ({ modo, n }) => {
      qc.invalidateQueries({ queryKey: ["noticias"] });
      qc.invalidateQueries({ queryKey: ["pendentes"] });
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      setConfirmarApagar(false);
      onAberto(false);
      onConcluido?.();
      toast.success(modo === "apagar"
        ? `${n} notícia(s) antiga(s) apagada(s) definitivamente`
        : `${n} notícia(s) antiga(s) arquivada(s) como rejeitadas`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ocupado = limpar.isPending;
  const vazio = antigasCount === 0;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => { if (!ocupado) { onAberto(v); if (!v) setConfirmarApagar(false); } }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-[19px]">Limpar pendentes antigas</DialogTitle>
          <DialogDescription className="text-[14.5px]">
            Há <strong>{antigasCount}</strong> pendentes com mais de {DIAS_ANTIGAS} dias.
            Escolhe o que fazer com elas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Archive size={16} /> Arquivar
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              Ficam marcadas como rejeitadas. Nada é apagado — podes devolvê-las a partir do arquivo.
            </p>
            <button
              type="button" disabled={ocupado || vazio}
              onClick={() => limpar.mutate("arquivar")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-[15px] font-bold text-white disabled:opacity-55"
            >
              {ocupado && limpar.variables === "arquivar" && <Loader2 size={15} className="animate-spin" />}
              Arquivar {antigasCount}
            </button>
          </div>

          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Trash2 size={16} /> Apagar definitivamente
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              Remove mesmo do sistema. Não há forma de recuperar estas notícias depois.
            </p>
            {!confirmarApagar ? (
              <button
                type="button" disabled={ocupado || vazio}
                onClick={() => setConfirmarApagar(true)}
                className="mt-3 rounded-xl border border-destructive px-4 py-2.5 text-[15px] font-bold text-destructive disabled:opacity-55"
              >
                Apagar {antigasCount}…
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-semibold text-destructive">
                  Confirmas apagar {antigasCount} notícia(s)?
                </span>
                <button
                  type="button" disabled={ocupado}
                  onClick={() => limpar.mutate("apagar")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2.5 text-[15px] font-bold text-white disabled:opacity-55"
                >
                  {ocupado && limpar.variables === "apagar" && <Loader2 size={15} className="animate-spin" />}
                  Sim, apagar
                </button>
                <button
                  type="button" disabled={ocupado}
                  onClick={() => setConfirmarApagar(false)}
                  className="rounded-xl bg-muted px-3.5 py-2.5 text-[15px] font-semibold text-foreground disabled:opacity-55"
                >
                  Voltar atrás
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button" onClick={() => onAberto(false)} disabled={ocupado}
            className="rounded-xl bg-muted px-4 py-2.5 text-[15px] font-semibold text-foreground disabled:opacity-55"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
