// Pré-visualização interna de um Brief.
//
// Substitui o antigo atalho `?briefs=1` na página pública: só quem tem sessão
// vê peças ainda não publicadas, e sempre fora dos motores de busca.

import { createFileRoute, Link } from "@/newsletter/shim/router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import { ArrowLeft, Eye } from "lucide-react";

import { previsualizarBriefFn } from "@/newsletter/lib/brief-publico.functions";
import { PaginaBrief, type BriefConteudo } from "@/newsletter/features/brief/PaginaBrief";
import { fmtDataPublica } from "@/newsletter/features/revista-web/ui";

const AUTOR = "Frederico Carvalho";

export const Route = createFileRoute("/_authenticated/pre-visualizar/brief/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Pré-visualizar o Brief ${params.slug} · Digital Sprint` },
      { name: "description", content: "Pré-visualização interna de um Brief ainda não publicado." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreVisualizarBrief,
});

function PreVisualizarBrief() {
  const { slug } = Route.useParams();
  const previsualizar = useServerFn(previsualizarBriefFn);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["previa-brief", slug],
    queryFn: () => previsualizar({ data: { slug } }),
    enabled: slug.length > 0,
  });

  const conteudo: BriefConteudo | null = data
    ? {
        variante: data.tipo === "destaque" ? "brief" : "quick",
        categoria: data.categoria,
        titulo: data.titulo,
        data: fmtDataPublica(data.dataISO),
        dataISO: data.dataISO,
        tempo: data.tempo,
        fonte: data.fonte,
        fonteUrl: data.fonteUrl,
        resumo: data.resumo,
        implicacoes: data.implicacoes,
        leitura: data.leitura ? { texto: data.leitura, autor: AUTOR } : undefined,
        relacionados: data.relacionados.map((r) => ({
          categoria: r.categoria,
          titulo: r.titulo,
          tempo: r.tempo,
          slug: r.slug,
        })),
        edicaoNumero: data.edicaoNumero,
        slug: data.slug,
        origem: "edicao",
        contar: false,
        qa: true,
        aviso: "Pré-visualização interna · esta página ainda não é pública",
      }
    : null;

  return (
    <div className="min-h-dvh bg-muted/40">
      <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-50 dark:bg-amber-950/40">
        <div className="mx-auto flex max-w-[60rem] flex-wrap items-center gap-3 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-amber-700 dark:text-amber-300">
            <Eye size={15} /> Pré-visualização do Brief — ainda não publicada
          </span>
          <Link
            to="/briefs"
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted"
          >
            <ArrowLeft size={14} /> Voltar aos Briefs
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="p-10 text-center text-sm text-muted-foreground">A montar a página do Brief…</p>
      ) : isError ? (
        <p className="p-10 text-center text-sm text-destructive">
          Não foi possível montar a pré-visualização deste Brief.
        </p>
      ) : conteudo ? (
        <PaginaBrief conteudo={conteudo} />
      ) : (
        <p className="p-10 text-center text-sm text-muted-foreground">
          Não existe nenhum Brief associado a uma edição com este endereço.
        </p>
      )}
    </div>
  );
}
