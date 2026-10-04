import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ExternalLink, Loader2, Mail, Globe } from "lucide-react";
import { previewEdicaoFn } from "@/newsletter/lib/envio.functions";

// Preview do email / página WordPress — iframe do resultado real de `preview-edicao`.
// A mesma função que a E-goi / o WordPress consomem, garantindo alinhamento byte a byte
// entre pré-visualização e envio (sem reimplementação React paralela).

export type PreviewDestino = "email" | "wordpress";

export interface PreviewProps {
  edicaoId: string | null;
  /** Número da edição Revista, usado para abrir a página interna antes da publicação. */
  numero?: number;
  /** Contador que bump com cada alteração relevante para forçar refetch debounced. */
  refreshKey: number;
  destino: PreviewDestino;
  onDestinoChange: (d: PreviewDestino) => void;
}

export function Preview({ edicaoId, numero, refreshKey, destino, onDestinoChange }: PreviewProps) {
  // Debounce do refreshKey — evita chamar preview-edicao a cada tecla.
  const [debouncedKey, setDebouncedKey] = useState(refreshKey);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedKey(refreshKey), 500);
    return () => window.clearTimeout(t);
  }, [refreshKey]);

  const q = useQuery({
    queryKey: ["preview-edicao", edicaoId, destino, debouncedKey],
    enabled: !!edicaoId,
    staleTime: 60_000,
    queryFn: async () => {
      const payload = await previewEdicaoFn({ data: { edicao_id: edicaoId!, destino } });
      if (!payload?.ok || !payload.html) throw new Error("Resposta inválida da pré-visualização");
      return payload.html;

    },
  });

  // Mantém o HTML anterior visível enquanto refetch corre (evita flicker).
  const htmlAnterior = useRef<string | null>(null);
  const htmlActual = q.data ?? htmlAnterior.current;
  if (q.data) htmlAnterior.current = q.data;

  const [altura, setAltura] = useState(1200);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ajustarAltura = () => {
    // Em WordPress, mantemos altura fixa para o iframe ter scroll interno —
    // requisito para `position:sticky` da barra de navegação funcionar.
    if (destino === "wordpress") return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const h = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight ?? 0);
    if (h && Math.abs(h - altura) > 4) setAltura(h + 8);
  };

  const prepararIframe = () => {
    ajustarAltura();
    const doc = iframeRef.current?.contentDocument;
    if (!doc || destino !== "email" || !numero) return;
    doc.addEventListener("click", (evento) => {
      const alvo = evento.target;
      const ElementoDoIframe = doc.defaultView?.Element;
      if (!ElementoDoIframe || !(alvo instanceof ElementoDoIframe)) return;
      const ligacao = alvo.closest("a");
      const href = ligacao?.href;
      if (!href || !deveAbrirPreviaInterna(href, numero)) return;
      evento.preventDefault();
      window.open(`/pre-visualizar/${numero}?vista=edicao`, "_blank", "noopener");
    });
  };

  const abrirEmNovaAba = useMemo(() => () => {
    if (!htmlActual) return;
    const blob = new Blob([htmlActual], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, [htmlActual]);

  const opcoes: Array<{ id: PreviewDestino; label: string; icon: typeof Mail }> = [
    { id: "email", label: "Email", icon: Mail },
    { id: "wordpress", label: "Página WordPress", icon: Globe },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E4E7EC" }}>
      {/* Barra de acções */}
      <div className="px-4 py-2.5 flex items-center gap-2 text-xs font-semibold flex-wrap" style={{ background: "#F9FAFB", color: "#475467", borderBottom: "1px solid #E4E7EC" }}>
        <Eye size={13} strokeWidth={1.5} style={{ color: "#6366F1" }} />
        <div role="tablist" aria-label="Fonte da pré-visualização" className="inline-flex rounded-lg p-0.5" style={{ background: "#EEF1F5", border: "1px solid #E4E7EC" }}>
          {opcoes.map((o) => {
            const activo = destino === o.id;
            const Ico = o.icon;
            return (
              <button
                key={o.id}
                role="tab"
                aria-selected={activo}
                type="button"
                onClick={() => onDestinoChange(o.id)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-semibold transition-colors"
                style={{
                  background: activo ? "#FFFFFF" : "transparent",
                  color: activo ? "#0F172A" : "#667085",
                  boxShadow: activo ? "0 1px 2px rgba(16,24,40,0.06)" : undefined,
                }}
              >
                <Ico size={12} strokeWidth={2} />
                {o.label}
              </button>
            );
          })}
        </div>
        {q.isFetching && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: "#94A3B8" }}>
            <Loader2 size={11} className="animate-spin" /> A actualizar…
          </span>
        )}
        <button type="button" onClick={abrirEmNovaAba} disabled={!htmlActual}
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40 hover:shadow-sm"
          style={{ background: "#FFFFFF", color: "#0F172A", border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <ExternalLink size={13} strokeWidth={2} /> Abrir em nova aba
        </button>
      </div>

      <div style={{ position: "relative", background: "#EEF1F5", minHeight: 400 }}>
        {!htmlActual && q.isLoading && (
          <div className="flex items-center justify-center py-16" style={{ color: "#94A3B8" }}>
            <Loader2 size={20} className="animate-spin mr-2" /> A carregar pré-visualização…
          </div>
        )}
        {q.isError && !htmlActual && (
          <div className="p-6 text-sm" style={{ color: "#B42318" }}>
            Falha a gerar pré-visualização: {(q.error as Error).message}
          </div>
        )}
        {htmlActual && (
          <iframe
            ref={iframeRef}
            title="Pré-visualização da newsletter"
            srcDoc={htmlActual}
            onLoad={prepararIframe}
            sandbox={destino === "wordpress" ? "allow-same-origin allow-scripts allow-popups" : "allow-same-origin allow-popups"}
            style={{ width: "100%", height: destino === "wordpress" ? 820 : altura, border: 0, display: "block", background: "#EEF1F5" }}
          />
        )}
      </div>
    </div>
  );
}

/** Reconhece apenas o endereço canónico da edição; fontes externas ficam intactas. */
export function deveAbrirPreviaInterna(href: string, numero: number): boolean {
  try {
    return new URL(href).pathname.replace(/\/$/, "") === `/edicoes/${numero}`;
  } catch {
    return false;
  }
}
