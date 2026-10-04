// Fita de fases do editor Revista: Curar → Compor → Publicar.
// Cada fase é um trabalho com ritmo próprio e critério de «concluído».

import { Check, Lock } from "lucide-react";

export type Fase = "curar" | "compor" | "publicar";

export interface EstadoFase {
  id: Fase;
  nome: string;
  linha: string;
  concluida: boolean;
  bloqueada?: boolean;
}

export function FitaFases({
  fases, activa, onEscolher,
}: { fases: EstadoFase[]; activa: Fase; onEscolher: (f: Fase) => void }) {
  return (
    <div className="sticky top-2 z-20 -mx-1 mb-4 rounded-2xl border border-border bg-card/95 px-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex snap-x snap-mandatory overflow-x-auto sm:overflow-visible">
        {fases.map((f, i) => {
          const on = f.id === activa;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onEscolher(f.id)}
              aria-current={on ? "step" : undefined}
              className={`flex min-w-[62%] flex-1 snap-start items-center gap-3 border-b-[3px] px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:min-w-0 ${
                on ? "border-foreground" : "border-transparent hover:bg-muted/50"
              }`}
            >
              <span
                className={`grid h-7 w-7 flex-none place-items-center rounded-full border text-[12px] font-bold ${
                  on
                    ? "border-foreground bg-foreground text-background"
                    : f.concluida
                      ? "border-estado-pronto-borda bg-estado-pronto-suave text-estado-pronto"
                      : "border-border text-muted-foreground"
                }`}
              >
                {f.concluida && !on ? <Check size={14} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[14.5px] font-semibold text-foreground">
                  {f.nome}
                  {f.bloqueada && <Lock size={12} className="text-muted-foreground" aria-label="Ainda com pendências" />}
                </span>
                <span className="block truncate text-[12.5px] text-muted-foreground">{f.linha}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
