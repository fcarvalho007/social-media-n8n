// Pré-visualização interna da página web de uma edição Revista.
//
// Existe porque a página pública (/edicoes/:numero) só passa a existir depois
// de a edição ser enviada. Aqui vê-se exactamente a mesma apresentação, mas
// construída com o conteúdo actual do editor — sem publicar nada.

import { createFileRoute, Link } from "@/newsletter/shim/router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import { ArrowLeft, Eye } from "lucide-react";

import { previsualizarEdicaoWebFn } from "@/newsletter/lib/revista-preview.functions";
import { PaginaEdicao } from "@/newsletter/features/revista-web/PaginaEdicao";
import { ConteudoArtigoCronica } from "@/newsletter/features/newsletter/revista/PreviewArtigoCronica";

export const Route = createFileRoute("/_authenticated/pre-visualizar/$numero")({
  validateSearch: (s: Record<string, unknown>) => ({
    vista: s["vista"] === "cronica" ? ("cronica" as const) : ("edicao" as const),
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Pré-visualizar a edição #${params.numero} · Digital Sprint` },
      { name: "description", content: "Pré-visualização interna da versão web da edição." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreVisualizarEdicao,
});

function PreVisualizarEdicao() {
  const { numero } = Route.useParams();
  const { vista } = Route.useSearch();
  const n = Number(numero);
  const previsualizar = useServerFn(previsualizarEdicaoWebFn);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["previa-edicao-web", n],
    queryFn: () => previsualizar({ data: { numero: n } }),
    enabled: vista === "edicao" && Number.isInteger(n) && n > 0,
  });

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-50 dark:bg-amber-950/40">
        <div className="mx-auto flex max-w-[60rem] flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-amber-700 dark:text-amber-300">
            <Eye size={15} /> Pré-visualização {vista === "cronica" ? "da crónica" : "da edição"} #{numero} — ainda não publicada
          </span>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted"
          >
            <ArrowLeft size={14} /> Voltar ao editor
          </Link>
        </div>
      </div>

      {vista === "cronica" ? (
        <div className="mx-auto max-w-4xl p-5">
          <ConteudoArtigoCronicaPorNumero numero={n} />
        </div>
      ) : isLoading ? (
        <p className="p-10 text-center text-sm text-muted-foreground">A montar a página da edição…</p>
      ) : isError ? (
        <p className="p-10 text-center text-sm text-destructive">
          Não foi possível montar a pré-visualização desta edição.
        </p>
      ) : data ? (
        <PaginaEdicao pagina={data} previaInterna />
      ) : (
        <p className="p-10 text-center text-sm text-muted-foreground">
          Não existe nenhuma edição Revista com o número {numero}.
        </p>
      )}
    </div>
  );
}

/** A crónica precisa do id da edição; resolve-se pelo número, sem publicar nada. */
function ConteudoArtigoCronicaPorNumero({ numero }: { numero: number }) {
  const previsualizar = useServerFn(previsualizarEdicaoWebFn);
  const q = useQuery({
    queryKey: ["previa-edicao-web", numero],
    queryFn: () => previsualizar({ data: { numero } }),
    enabled: Number.isInteger(numero) && numero > 0,
  });
  const edicaoId = q.data?.estrutura.edicao.id ?? "";
  if (q.isLoading) return <p className="p-10 text-center text-sm text-muted-foreground">A montar a crónica…</p>;
  if (!edicaoId) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">
        Não existe nenhuma edição Revista com o número {numero}.
      </p>
    );
  }
  return <ConteudoArtigoCronica edicaoId={edicaoId} />;
}
