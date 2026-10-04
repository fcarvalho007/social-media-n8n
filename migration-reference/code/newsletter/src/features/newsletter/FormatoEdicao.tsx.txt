// Formato da edição como *tipo* e não como modo: escolhe-se ao criar e fica fixo.
// Aqui vivem o modal de criação e o selo informativo usado nos dois editores.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type FormatoEdicao = "revista" | "classic";

export function normalizarFormato(v: string | null | undefined): FormatoEdicao {
  return v === "revista" ? "revista" : "classic";
}

const OPCOES: { id: FormatoEdicao; titulo: string; nota?: string; texto: string }[] = [
  {
    id: "revista",
    titulo: "Revista",
    nota: "recomendado",
    texto: "Novo formato editorial: crónica, momento editorial, três destaques comentados, radar e recomendação.",
  },
  {
    id: "classic",
    titulo: "Clássico",
    texto: "Formato anterior, organizado por categorias e com os blocos fixos.",
  },
];

const ESTILO: Record<FormatoEdicao, { background: string; color: string; border: string }> = {
  revista: { background: "#EFF4FF", color: "#1A5FC4", border: "1px solid #C7D7FE" },
  classic: { background: "#F2F4F7", color: "#475467", border: "1px solid #E4E7EC" },
};

/**
 * Bloco «Formato». Informativo quando a edição já saiu; comutador enquanto
 * estiver em rascunho (o formato define o editor e o modelo de email).
 */
export function SeloFormato({
  formato, onTrocar, bloqueado = false, aTrocar = false,
}: {
  formato: FormatoEdicao;
  onTrocar?: (f: FormatoEdicao) => void;
  bloqueado?: boolean;
  aTrocar?: boolean;
}) {
  const [confirmar, setConfirmar] = useState<FormatoEdicao | null>(null);
  const editavel = Boolean(onTrocar) && !bloqueado;
  const alvo: FormatoEdicao = formato === "revista" ? "classic" : "revista";

  if (!editavel) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Formato</span>
        <span
          className="inline-flex h-6 items-center rounded-md px-2 text-[11.5px] font-bold uppercase tracking-wide"
          style={ESTILO[formato]}
        >
          {formato === "revista" ? "Revista" : "Clássico"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Formato</span>
      <div
        role="group"
        aria-label="Formato da edição"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
      >
        {(["revista", "classic"] as FormatoEdicao[]).map((f) => {
          const activo = f === formato;
          return (
            <button
              key={f}
              type="button"
              disabled={aTrocar}
              aria-pressed={activo}
              onClick={() => { if (!activo) setConfirmar(f); }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-bold uppercase tracking-wide transition disabled:opacity-60"
              style={activo ? ESTILO[f] : { background: "transparent", color: "#667085", border: "1px solid transparent" }}
            >
              {aTrocar && !activo && <Loader2 size={13} className="animate-spin" />}
              {f === "revista" ? "Revista" : "Clássico"}
            </button>
          );
        })}
      </div>

      <AlertDialog open={confirmar !== null} onOpenChange={(v) => { if (!v) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[19px]">
              Mudar para o formato {alvo === "revista" ? "Revista" : "Clássico"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14.5px]">
              O editor e o modelo de email do envio passam a ser os do formato{" "}
              {alvo === "revista" ? "Revista (novo)" : "Clássico (antigo)"}. Nada é apagado: as notícias
              aprovadas, a crónica e os blocos continuam associados a esta edição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[15px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="text-[15px]"
              onClick={() => {
                const f = confirmar;
                setConfirmar(null);
                if (f) onTrocar?.(f);
              }}
            >
              Mudar formato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DialogoNovaEdicao({
  aberto, onAberto, onCriar, aCriar,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  onCriar: (f: FormatoEdicao) => void;
  aCriar: boolean;
}) {
  const [formato, setFormato] = useState<FormatoEdicao>("revista");
  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[20px]">Criar nova edição</DialogTitle>
          <DialogDescription className="text-[14.5px]">
            Escolhe o formato desta edição. Depois de criada, o formato fica associado à edição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {OPCOES.map((o) => {
            const activo = formato === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setFormato(o.id)}
                aria-pressed={activo}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  activo ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      activo ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  />
                  <span className="text-[16px] font-semibold text-foreground">{o.titulo}</span>
                  {o.nota && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                      {o.nota}
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block pl-6 text-[14px] leading-snug text-muted-foreground">
                  {o.texto}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={aCriar}
          onClick={() => onCriar(formato)}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {aCriar && <Loader2 size={18} className="animate-spin" />}
          Criar edição
        </button>
      </DialogContent>
    </Dialog>
  );
}
