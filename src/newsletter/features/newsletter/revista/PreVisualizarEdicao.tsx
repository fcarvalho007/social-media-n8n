// Lugar único de pré-visualização do formato Revista.
//
// Duas vistas: a edição completa (página web com todas as notícias) e apenas
// a crónica (o artigo autónomo). Abre por cima de tudo — inclusive do modal de
// envio — porque é montado num portal para o `body`, sem depender de
// separadores novos, que não abrem dentro do editor encaixado.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import { ExternalLink, FileText, Globe, X } from "lucide-react";

import { previsualizarEdicaoWebFn } from "@/newsletter/lib/revista-preview.functions";
import { PaginaEdicao } from "@/newsletter/features/revista-web/PaginaEdicao";
import { ConteudoArtigoCronica } from "./PreviewArtigoCronica";

export type VistaPrevia = "edicao" | "cronica";

export function PreVisualizarEdicao({
  edicaoId, numero, vistaInicial = "edicao", urlPublica, urlCronica, cronicaRascunho, onClose,
}: {
  edicaoId: string;
  numero: number;
  vistaInicial?: VistaPrevia;
  /** Página web já publicada, quando existe. */
  urlPublica?: string;
  /** Artigo da crónica em FredericoCarvalho.pt, quando existe. */
  urlCronica?: string;
  /** O artigo existe mas ainda é rascunho — não está visível no site. */
  cronicaRascunho?: boolean;
  onClose: () => void;
}) {
  const [vista, setVista] = useState<VistaPrevia>(vistaInicial);
  const previsualizar = useServerFn(previsualizarEdicaoWebFn);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [onClose]);

  const q = useQuery({
    queryKey: ["previa-edicao-web", numero, edicaoId],
    queryFn: () => previsualizar({ data: { edicaoId } }),
    enabled: vista === "edicao" && !!edicaoId,
  });

  const separador = (v: VistaPrevia, rotulo: string, Icone: typeof Globe) => (
    <button
      type="button" onClick={() => setVista(v)}
      aria-current={vista === v}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-semibold transition ${
        vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icone size={14} /> {rotulo}
    </button>
  );

  const externa = vista === "edicao"
    ? (urlPublica || `/pre-visualizar/${numero}?vista=edicao`)
    : (urlCronica && !cronicaRascunho ? urlCronica : `/pre-visualizar/${numero}?vista=cronica`);

  const conteudo = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Pré-visualizar #{numero}
        </span>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
          {separador("edicao", "Edição completa", Globe)}
          {separador("cronica", "Só a crónica", FileText)}
        </div>
        <a
          href={externa} target="_blank" rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ExternalLink size={13} /> Abrir noutro separador
        </a>
        <button
          type="button" onClick={onClose} aria-label="Fechar a pré-visualização"
          className="rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X size={15} />
        </button>
      </header>

      {vista === "cronica" && cronicaRascunho && (
        <p className="border-b border-amber-500/40 bg-amber-50 px-4 py-2 text-[13px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          O artigo já existe em FredericoCarvalho.pt, mas ainda é rascunho — não está visível para quem visita o site.
        </p>
      )}

      <div className="flex-1 overflow-y-auto">
        {vista === "edicao" ? (
          q.isLoading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">A montar a página da edição…</p>
          ) : q.isError ? (
            <p className="p-10 text-center text-sm text-destructive">
              Não foi possível montar a pré-visualização: {(q.error as Error).message}
            </p>
          ) : q.data ? (
            <PaginaEdicao pagina={q.data} previaInterna />
          ) : (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Ainda não há conteúdo suficiente nesta edição para montar a página.
            </p>
          )
        ) : (
          <div className="mx-auto max-w-4xl p-5">
            <ConteudoArtigoCronica edicaoId={edicaoId} />
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(conteudo, document.body);
}

export default PreVisualizarEdicao;
