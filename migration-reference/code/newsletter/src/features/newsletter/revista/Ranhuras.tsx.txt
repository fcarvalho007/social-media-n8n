// Ranhuras numeradas em vez de contadores «0/3».
// Cada linha é um lugar concreto na edição: preenchido mostra o título e leva
// ao painel de edição desse item; vazio leva à escolha de uma notícia.

import { Check } from "lucide-react";

export interface Ranhura {
  id?: string;
  titulo?: string;
  /** Categoria de origem, mostrada como contexto. */
  etiqueta?: string;
}

export function Ranhuras({
  total, minimo, ocupadas, textoVazio, accaoVazia, accaoOcupada, onEscolher,
}: {
  total: number;
  /** Lugares obrigatórios; acima disto o lugar é opcional. */
  minimo?: number;
  ocupadas: Ranhura[];
  textoVazio: string;
  accaoVazia: string;
  accaoOcupada: string;
  /** Recebe o índice do lugar e o item, quando existe. */
  onEscolher?: (indice: number, item: Ranhura | undefined) => void;
}) {
  const linhas = Array.from({ length: Math.max(total, ocupadas.length) }, (_, i) => ocupadas[i]);
  return (
    <div className="flex flex-col gap-2">
      {linhas.map((r, i) => {
        const cheia = !!r;
        const opcional = !cheia && minimo !== undefined && i >= minimo;
        return (
          <button
            key={r?.id ?? `vazia-${i}`}
            type="button"
            onClick={() => onEscolher?.(i, r)}
            className={`flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              cheia
                ? "border-border bg-background text-foreground hover:bg-muted/50"
                : "border-dashed border-border bg-transparent text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span className="grid w-4 flex-none place-items-center text-[11px] font-bold text-muted-foreground">
              {cheia ? <Check size={13} className="text-estado-pronto" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">
                {cheia ? r?.titulo || "—" : opcional ? `${textoVazio} — opcional` : textoVazio}
              </span>
              {cheia && r?.etiqueta && (
                <span className="block truncate text-[12px] text-muted-foreground">{r.etiqueta}</span>
              )}
            </span>
            <span className="flex-none text-[12.5px] font-semibold text-primary">
              {cheia ? accaoOcupada : accaoVazia} →
            </span>
          </button>
        );
      })}
    </div>
  );
}
