// Highlights of a composed/sent edition, as carousel sources. Dependency-free (Deno + Vite).
import { publisherDe, type DestaqueFonte } from "./carrossel.ts";
import { paraBaseDestino } from "../nl-destino-urls.ts";

export interface DestaqueLido { titulo?: string; url?: string; resumoFactual?: string; minhaLeitura?: string; brief?: { url?: string } }
export interface EdicaoLida {
  cronica?: { titulo?: string; url?: string; urlProvisoria?: boolean };
  destaques?: DestaqueLido[];
  urlPagina?: string;
}
/** The first three highlights exactly as composed (approved reading verbatim, sources and Brief links kept). */
export function destaquesDaEdicao(ed: EdicaoLida | null | undefined, destino = ""): DestaqueFonte[] {
  const ajustar = (u: string) => (u && destino ? paraBaseDestino(u, destino) : u);
  return (ed?.destaques ?? []).slice(0, 3)
    .filter((d) => d.titulo?.trim() && d.url)
    .map((d) => ({
      titulo: d.titulo!.trim(),
      sintese: (d.resumoFactual ?? "").trim(),
      leitura: d.minhaLeitura ?? "",
      fonteUrl: d.url!,
      publisher: publisherDe(d.url!),
      ...(d.brief?.url ? { briefUrl: ajustar(d.brief.url) } : {}),
    }));
}

