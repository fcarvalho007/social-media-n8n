import type { PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { avaliarSequencia } from "./sequencia";

/** Sequence overview: repetition, text/image alternation, density and excess of strong pages. Advisory only. */
export function VistaSequencia({ pacote, variante }: { pacote: PacoteProva; variante: Variante }) {
  const a = avaliarSequencia(pacote, variante);
  return (
    <div className="space-y-1.5 rounded-[var(--mc-r-md)] border border-border p-2" aria-label="Vista da sequência">
      <p className="text-xs font-medium">Sequência</p>
      <ol className="flex gap-1" aria-hidden>
        {a.paginas.map((p) => (
          <li key={p.n} title={`Slide ${p.n}: ${p.imagem ? "com imagem" : "só texto"}, ${p.palavras} palavras`}
            className={`h-6 flex-1 rounded-sm border ${p.forte ? "border-primary bg-primary/30" : p.imagem ? "border-border bg-muted-foreground/30" : "border-border bg-muted"} ${p.denso ? "ring-1 ring-destructive" : ""}`} />
        ))}
      </ol>
      {a.avisos.length ? <ul className="space-y-0.5 text-xs text-muted-foreground">{a.avisos.map((x) => <li key={x}>{x}</li>)}</ul>
        : <p className="text-xs text-muted-foreground">Sem repetições nem excesso de páginas fortes.</p>}
    </div>
  );
}
