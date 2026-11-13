import { useQuery } from "@tanstack/react-query";
import { resumoSemanaCuradoria, type ResumoSemana as Resumo } from "@/services/curadoria";

export const CHAVE_RESUMO_SEMANA = ["curadoria-resumo-semana"] as const;

/** Orders categories by count (desc) for the compact breakdown. */
export function categoriasOrdenadas(r: Pick<Resumo, "por_categoria">): Array<[string, number]> {
  return Object.entries(r.por_categoria).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-PT"));
}

export function ResumoSemana({ onAbrir }: { onAbrir: () => void }) {
  const q = useQuery({ queryKey: CHAVE_RESUMO_SEMANA, queryFn: resumoSemanaCuradoria, staleTime: 30_000, retry: false });
  if (!q.data) return null;
  const r = q.data;
  const cats = categoriasOrdenadas(r);
  return (
    <button type="button" onClick={onAbrir} className="flex w-full flex-col gap-1 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent sm:flex-row sm:items-center sm:gap-4" aria-label={`Aprovadas esta semana: ${r.total}. Ver aprovadas`}>
      <span className="flex items-baseline gap-2"><span className="text-2xl font-semibold tabular-nums">{r.total}</span><span className="text-sm font-medium">aprovadas esta semana</span></span>
      <span className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{r.por_enviar}</span> por enviar na newsletter · {r.enviadas} já enviadas</span>
      {cats.length > 0 && <span className="text-xs text-muted-foreground sm:ml-auto">{cats.map(([c, n]) => `${c} ${n}`).join(" · ")}</span>}
    </button>
  );
}
