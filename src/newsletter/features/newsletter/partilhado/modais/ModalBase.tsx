// Moldura de modal partilhada pelos modais extraídos do editor Clássico.
// Cópia fiel da moldura usada no monólito, para não alterar aspecto nem
// comportamento (fecho por clique fora, altura máxima, animação de entrada).

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { T } from "../ui";

export function ModalBase({
  titulo, children, onClose, wide, size, chromeless,
}: {
  titulo?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  size?: "md" | "lg" | "xl" | "cinema";
  chromeless?: boolean;
}) {
  const s = size ?? (wide ? "xl" : "md");
  const widthCls = s === "xl" ? "max-w-5xl" : s === "cinema" ? "max-w-2xl" : s === "lg" ? "max-w-lg" : "max-w-md";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(11,21,35,0.62)", backdropFilter: "blur(6px)" }}
      onClick={onClose} role="dialog" aria-modal="true">
      <div className={`w-full ${widthCls} rounded-2xl ${chromeless ? "" : "p-6"} max-h-[92vh] overflow-hidden anim-rise flex flex-col`}
        style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.ink, boxShadow: T.shadowLg }} onClick={(e) => e.stopPropagation()}>
        {!chromeless && (
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-display font-bold text-lg">{titulo}</h3>
            <button type="button" onClick={onClose} className="p-1 rounded-md" style={{ color: T.muted }} aria-label="Fechar"><X size={18} /></button>
          </div>
        )}
        {chromeless ? children : <div className="overflow-y-auto">{children}</div>}
      </div>
    </div>
  );
}
