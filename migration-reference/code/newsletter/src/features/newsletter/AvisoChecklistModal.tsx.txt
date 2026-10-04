import { AlertTriangle, ArrowRight, X } from "lucide-react";
import type { ItemChecklist } from "./checklist";

interface Props {
  itensEmFalta: ItemChecklist[];
  onConfirmar: () => void;
  onCancelar: () => void;
}

const T = {
  ink: "#101828",
  muted: "#475467",
  faint: "#667085",
  line: "#E4E7EC",
  card: "#FFFFFF",
  amberSoft: "#FFFAEB",
  amber: "#B54708",
  amberBorder: "#FDE68A",
};

export function AvisoChecklistModal({ itensEmFalta, onConfirmar, onCancelar }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: T.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center justify-center rounded-full"
              style={{ width: 34, height: 34, background: T.amberSoft, color: T.amber, border: `1px solid ${T.amberBorder}` }}
            >
              <AlertTriangle size={17} />
            </span>
            <div>
              <p className="font-display font-bold text-[16px] leading-tight" style={{ color: T.ink }}>
                Ainda há itens por concluir
              </p>
              <p className="text-[12.5px] mt-0.5" style={{ color: T.muted }}>
                Podes enviar assim mesmo, mas confirma que é essa a intenção.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={16} style={{ color: T.faint }} />
          </button>
        </div>

        <ul className="mx-5 mt-4 mb-1 rounded-xl border overflow-hidden" style={{ borderColor: T.amberBorder, background: T.amberSoft }}>
          {itensEmFalta.map((it, i) => (
            <li
              key={it.chave}
              className="flex items-center gap-2 px-3.5 py-2.5 text-[13.5px]"
              style={{
                color: T.amber,
                borderTop: i === 0 ? "none" : `1px solid ${T.amberBorder}`,
              }}
            >
              <span
                className="inline-block rounded-full shrink-0"
                style={{ width: 8, height: 8, background: T.amber }}
                aria-hidden="true"
              />
              <span className="font-medium">{it.rotulo}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onCancelar}
            className="text-[13px] font-semibold h-9 px-3.5 rounded-lg"
            style={{ border: `1px solid ${T.line}`, color: T.ink, background: T.card }}
          >
            Rever primeiro
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="inline-flex items-center gap-1.5 text-[13px] font-bold h-9 px-3.5 rounded-lg text-white ds-gradient"
          >
            Enviar mesmo assim <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
