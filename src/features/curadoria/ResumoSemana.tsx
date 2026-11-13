import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resumoSemanaCuradoria, type ResumoSemana as Resumo } from "@/services/curadoria";
import { getEdicaoAtual, listarAprovadasDaEdicao } from "@/newsletter/features/newsletter/data";
import { getItensRevista } from "@/newsletter/features/newsletter/revista/data-revista";

export const CHAVE_RESUMO_SEMANA = ["curadoria-resumo-semana"] as const;
export const CHAVE_EDICAO_CURADORIA = ["curadoria-edicao-proxima"] as const;

export interface EdicaoProxima { numero: number; total: number; hoje: number; porOrganizar: number; porCategoria: Array<[string, number]> }
type ItemEdicao = { id: string; categoria: string | null; created_at: string; destino?: string | null };

/** Orders categories by count (desc) for the compact breakdown. */
export function categoriasOrdenadas(r: Pick<Resumo, "por_categoria">): Array<[string, number]> {
  return Object.entries(r.por_categoria).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-PT"));
}

const diaLisboa = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);

/** Summarises the next edition's news: total, added today (Lisbon day) and per category. */
export function resumirEdicao(numero: number, itens: ItemEdicao[], colocadas: ReadonlySet<string> = new Set(), agora = new Date()): EdicaoProxima {
  const hojeStr = diaLisboa(agora);
  const cats: Record<string, number> = {};
  for (const n of itens) { const c = n.categoria || "outra"; cats[c] = (cats[c] ?? 0) + 1; }
  return {
    numero, total: itens.length,
    porOrganizar: itens.filter((n) => !colocadas.has(n.id) && n.destino !== "site").length,
    hoje: itens.filter((n) => diaLisboa(new Date(n.created_at)) === hojeStr).length,
    porCategoria: categoriasOrdenadas({ por_categoria: cats }),
  };
}

export async function lerEdicaoProxima(): Promise<EdicaoProxima | null> {
  const ed = await getEdicaoAtual();
  if (!ed) return null;
  const [noticias, itens] = await Promise.all([listarAprovadasDaEdicao(ed.id), getItensRevista(ed.id)]);
  return resumirEdicao(ed.numero, noticias, new Set(itens.map((i) => i.noticia_id)));
}

const NOMES: Record<string, string> = { ia: "IA", media: "Media", meta: "Meta", google: "Google", linkedin: "LinkedIn", tiktok: "TikTok", outra: "Outra" };
const nomeCat = (c: string) => NOMES[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

export function ResumoSemana({ onAbrir }: { onAbrir: () => void }) {
  const semana = useQuery({ queryKey: CHAVE_RESUMO_SEMANA, queryFn: resumoSemanaCuradoria, staleTime: 30_000, retry: false });
  const edicao = useQuery({ queryKey: CHAVE_EDICAO_CURADORIA, queryFn: lerEdicaoProxima, staleTime: 30_000, retry: false });
  if (edicao.isLoading) return null;
  const e = edicao.data;
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-col gap-1 text-left" aria-label="Ver notícias aprovadas">
        {e ? <span className="flex flex-wrap items-baseline gap-x-2"><span className="text-2xl font-semibold tabular-nums">{e.total}</span><span className="font-medium">na edição #{e.numero}</span>{e.porOrganizar > 0 && <span className="text-sm font-medium text-primary">· {e.porOrganizar} por organizar</span>}</span>
          : <span className="font-medium">Sem edição aberta: as aprovadas ficam guardadas</span>}
        <span className="text-sm text-muted-foreground">
          {e && <><span className="font-medium text-foreground">{e.hoje}</span> adicionadas hoje</>}
          {semana.data && <>{e ? " · " : ""}{semana.data.total} aprovadas esta semana</>}
          {e && e.porCategoria.length > 0 && <> · {e.porCategoria.map(([c, n]) => `${nomeCat(c)} ${n}`).join(" · ")}</>}
        </span>
      </button>
      {e && <Button asChild variant="outline" className="min-h-11 shrink-0"><Link to="/newsletter">{e.porOrganizar > 0 ? "Organizar na newsletter" : "Abrir edição"}<ArrowRight data-icon="inline-end" aria-hidden="true" /></Link></Button>}
    </div>
  );
}
