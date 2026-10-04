// Pré-visualização autenticada do artigo da crónica para FredericoCarvalho.pt.
//
// Mostra exactamente o payload que o servidor enviaria — serve para confirmar
// que vai o texto integral da crónica e não o excerto da newsletter, e que não
// entram blocos da Revista. Não existe rota pública para esta vista.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";

import { ModalBase } from "@/newsletter/features/newsletter/partilhado/modais/ModalBase";
import { previewArtigoCronicaFn } from "@/newsletter/lib/destinos.functions";

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="border-b border-border/60 py-2">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 break-words text-[14px] text-foreground">{valor || "—"}</p>
    </div>
  );
}

/** Conteúdo do artigo da crónica, sem moldura — partilhado com o modal de pré-visualização. */
export function ConteudoArtigoCronica({ edicaoId }: { edicaoId: string }) {
  const pedir = useServerFn(previewArtigoCronicaFn);
  const q = useQuery({
    queryKey: ["revista-artigo-cronica", edicaoId],
    queryFn: () => pedir({ data: { edicao_id: edicaoId } }),
  });
  const d = q.data;

  return (
    <>
      {q.isLoading && <p className="text-[14px] text-muted-foreground">A construir o artigo…</p>}
      {q.error && <p className="text-[14px] text-destructive">{(q.error as Error).message}</p>}

      {d && (
        <div className="space-y-3">
          {d.problemas.length > 0 && (
            <ul className="rounded-xl bg-amber-500/10 p-3 text-[13px] text-amber-700 dark:text-amber-400">
              {d.problemas.map((p) => <li key={p}>• {p}</li>)}
            </ul>
          )}

          <Campo etiqueta="Título" valor={d.artigo.title} />
          <Campo etiqueta="Slug previsto" valor={d.artigo.slug} />
          <Campo etiqueta="Excerpt" valor={d.artigo.excerpt} />
          <Campo etiqueta="Ligação à edição (referência)" valor={d.artigo.canonical} />
          <Campo
            etiqueta="Estado e destino previstos"
            valor={`${d.artigo.status} · ${d.integracao.postType}${d.artigo.categoria ? ` · ${d.artigo.categoria}` : ""} · ${d.operacao === "criar" ? "cria artigo novo" : `actualiza o artigo ${d.externalId}`}`}
          />

          <div>
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Corpo do artigo (inclui a referência à edição)
            </p>
            <div
              className="prose-sm max-h-[46vh] overflow-y-auto rounded-xl border border-border bg-background p-4 text-[15px] leading-relaxed text-foreground [&_a]:underline [&_h2]:mt-4 [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3"
              // Conteúdo já sanitizado no servidor pela allowlist do publisher.
              dangerouslySetInnerHTML={{ __html: d.artigo.content }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function PreviewArtigoCronica({
  edicaoId, onClose,
}: {
  edicaoId: string;
  onClose: () => void;
}) {
  return (
    <ModalBase titulo="Artigo da crónica — FredericoCarvalho.pt" size="xl" onClose={onClose}>
      <ConteudoArtigoCronica edicaoId={edicaoId} />
    </ModalBase>
  );
}
