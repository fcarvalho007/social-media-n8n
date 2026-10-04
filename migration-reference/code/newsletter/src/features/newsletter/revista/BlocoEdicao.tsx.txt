// Cartão de bloco do editor Revista.
// Mostra, fechado, o número de ordem no email, o estado e um resumo do conteúdo
// real — para se perceber a edição inteira sem abrir nada.

import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EstadoBloco = "pronto" | "falta" | "vazio" | "omitido";

export interface ResumoBloco {
  estado: EstadoBloco;
  /** Texto do selo: «Pronto», «Faltam 3», «Por preencher», «Não entra». */
  selo: string;
  /** Linha com o conteúdo real do bloco. */
  linha: string;
}

const SELO: Record<EstadoBloco, string> = {
  pronto: "border-estado-pronto-borda bg-estado-pronto-suave text-estado-pronto",
  falta: "border-estado-falta-borda bg-estado-falta-suave text-estado-falta",
  vazio: "border-border bg-muted text-muted-foreground",
  omitido: "border-border bg-transparent text-muted-foreground",
};

export function BlocoEdicao({
  id, numero, titulo, icone: Icone, resumo, aberto, alternar, accao, children,
}: {
  id: string;
  numero?: number;
  titulo: string;
  icone: LucideIcon;
  resumo: ResumoBloco;
  aberto: boolean;
  alternar: (id: string) => void;
  /** Acção rápida para incluir um bloco opcional que está de fora. */
  accao?: { rotulo: string; onClick: () => void; desactivada?: boolean };
  children: React.ReactNode;
}) {
  const omitido = resumo.estado === "omitido";
  return (
    <section
      id={`bloco-${id}`}
      className={`scroll-mt-32 rounded-2xl border shadow-sm transition ${
        omitido
          ? "border-dashed border-border bg-card/50"
          : resumo.estado === "falta"
            ? "border-estado-falta-borda bg-card"
            : "border-border bg-card"
      }`}
    >
      <button
        type="button"
        onClick={() => alternar(id)}
        aria-expanded={aberto}
        className="flex w-full items-start gap-3 rounded-2xl px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {numero !== undefined && (
          <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md bg-muted text-[12px] font-bold text-muted-foreground">
            {numero}
          </span>
        )}
        <Icone size={18} className={`mt-1 flex-none ${omitido ? "text-muted-foreground" : "text-primary"}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[16.5px] font-semibold ${omitido ? "text-muted-foreground" : "text-foreground"}`}>
              {titulo}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[12px] font-semibold ${SELO[resumo.estado]}`}>
              {resumo.selo}
            </span>
          </span>
          <span className="mt-1 block text-[13.5px] leading-relaxed text-muted-foreground">{resumo.linha}</span>
        </span>
        <ChevronDown
          size={18}
          className={`mt-1 flex-none text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {omitido && accao && (
        <div className="px-5 pb-4">
          <button
            type="button"
            disabled={accao.desactivada}
            onClick={accao.onClick}
            className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {accao.rotulo}
          </button>
        </div>
      )}

      {aberto && <div className="space-y-4 border-t border-border px-5 py-5">{children}</div>}
    </section>
  );
}
