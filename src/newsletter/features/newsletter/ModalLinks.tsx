import { Loader2, RefreshCw, Pencil, X, Link2, AlertTriangle, XCircle } from "lucide-react";
import type { ItemLink, ResumoLinks } from "@/newsletter/lib/verificar-links.functions";

interface Props {
  items: ItemLink[] | null;
  resumo: ResumoLinks | null;
  verificadoEm: string | null;
  pending: boolean;
  onClose: () => void;
  onReverificar: () => void;
  onEditar: (contexto: ItemLink["contexto"]) => void;
}

const T = {
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  line: "#E4E7EC",
  shell: "#F7F8FA",
  card: "#FFFFFF",
  ambar: "#B54708",
  ambarBg: "#FEF0C7",
  vermelho: "#B42318",
  vermelhoBg: "#FEE4E2",
  verde: "#027A48",
  verdeBg: "#D1FADF",
};

function fmtHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function badgeEstado(e: ItemLink["estado"]) {
  switch (e) {
    case "quebrado":       return { txt: "Quebrado",       bg: T.vermelhoBg, fg: T.vermelho, Icon: XCircle };
    case "suspeito":       return { txt: "Suspeito",       bg: T.ambarBg,    fg: T.ambar,    Icon: AlertTriangle };
    case "redireccionado": return { txt: "Redireccionado", bg: T.verdeBg,    fg: T.verde,    Icon: RefreshCw };
    default:               return { txt: "OK",             bg: T.verdeBg,    fg: T.verde,    Icon: Link2 };
  }
}

export function ModalLinks({ items, resumo, verificadoEm, pending, onClose, onReverificar, onEditar }: Props) {
  const problemas = (items ?? []).filter((i) => i.estado === "quebrado" || i.estado === "suspeito");
  const outros = (items ?? []).filter((i) => i.estado === "redireccionado");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15, 23, 42, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: T.card, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${T.line}` }}>
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold flex items-center gap-2" style={{ color: T.ink }}>
              <Link2 size={17} /> Verificação de links
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: T.faint }}>
              {verificadoEm ? `Última verificação às ${fmtHora(verificadoEm)}` : "Ainda não verificado"}
              {resumo && (
                <>
                  {" · "}
                  <span style={{ color: T.verde }}>{resumo.ok} ok</span>
                  {resumo.redireccionado > 0 && <> · <span style={{ color: T.muted }}>{resumo.redireccionado} 3xx</span></>}
                  {resumo.suspeito > 0 && <> · <span style={{ color: T.ambar }}>{resumo.suspeito} suspeito{resumo.suspeito === 1 ? "" : "s"}</span></>}
                  {resumo.quebrado > 0 && <> · <span style={{ color: T.vermelho }}>{resumo.quebrado} quebrado{resumo.quebrado === 1 ? "" : "s"}</span></>}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg shrink-0"
            style={{ color: T.muted }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {pending && (items ?? []).length === 0 && (
            <div className="flex items-center gap-2 text-[13px] py-8 justify-center" style={{ color: T.muted }}>
              <Loader2 size={14} className="animate-spin" /> A verificar links…
            </div>
          )}

          {!pending && problemas.length === 0 && (items ?? []).length > 0 && (
            <div className="text-center py-6">
              <p className="text-[15px] font-semibold" style={{ color: T.verde }}>Tudo em ordem</p>
              <p className="text-[13px] mt-1" style={{ color: T.muted }}>
                Nenhum link quebrado ou suspeito nesta edição.
              </p>
            </div>
          )}

          {problemas.length > 0 && (() => {
            const rotuloTipo = (t: ItemLink["contexto"]["tipo"]) =>
              t === "ferramenta" ? "Ferramenta"
                : t === "cronica" ? "Crónica"
                : t === "promocao" ? "Promoção"
                : t === "recomendacao" ? "Recomendação"
                : t === "podcast" ? "Podcast"
                : t === "brief" ? "Brief"
                : "Notícia";

            const cartao = (it: ItemLink, i: number) => {
              const b = badgeEstado(it.estado);
              return (
                <li key={i} className="rounded-xl p-3.5" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: b.bg, color: b.fg }}
                    >
                      <b.Icon size={11} />
                      {b.txt}
                    </span>
                    {it.status > 0 && (
                      <span className="text-[11px] font-mono" style={{ color: T.faint }}>HTTP {it.status}</span>
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.faint }}>
                      · {rotuloTipo(it.contexto.tipo)}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: T.ink }}>{it.contexto.titulo}</p>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block text-[12.5px] mt-1 truncate hover:underline"
                    style={{ color: T.muted }}
                    title={it.url}
                  >
                    {it.url}
                  </a>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => onEditar(it.contexto)}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-8 px-3 rounded-lg"
                      style={{ background: T.card, border: `1px solid ${T.line}`, color: T.ink }}
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                </li>
              );
            };

            const doEmail = problemas.filter((i) => i.contexto.canal !== "web");
            const daWeb = problemas.filter((i) => i.contexto.canal === "web");

            // Sem canal (Clássico) é tudo email: mostra-se uma lista simples.
            if (daWeb.length === 0) {
              return <ul className="space-y-2 list-none p-0 m-0">{problemas.map(cartao)}</ul>;
            }

            return (
              <div className="space-y-4">
                {doEmail.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: T.vermelho }}>
                      No email · {doEmail.length}
                    </p>
                    <ul className="space-y-2 list-none p-0 m-0">{doEmail.map(cartao)}</ul>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: T.faint }}>
                    Só na edição web · {daWeb.length}
                  </p>
                  <p className="text-[12.5px] mb-2" style={{ color: T.muted }}>
                    Não bloqueiam o envio, mas vale a pena corrigir antes de publicar.
                  </p>
                  <ul className="space-y-2 list-none p-0 m-0">{daWeb.map(cartao)}</ul>
                </div>
              </div>
            );
          })()}


          {problemas.length === 0 && outros.length > 0 && (
            <details className="mt-2 rounded-xl" style={{ border: `1px solid ${T.line}` }}>
              <summary className="cursor-pointer text-[12.5px] font-semibold px-3 py-2" style={{ color: T.muted }}>
                Ver {outros.length} link{outros.length === 1 ? "" : "s"} redireccionado{outros.length === 1 ? "" : "s"}
              </summary>
              <ul className="px-3 pb-3 space-y-1.5 list-none m-0">
                {outros.map((it, i) => (
                  <li key={i} className="text-[12px]" style={{ color: T.muted }}>
                    <span className="font-mono" style={{ color: T.faint }}>{it.status}</span> · {it.contexto.titulo}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.line}`, background: T.shell }}>
          <button
            onClick={onReverificar}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold h-9 px-3 rounded-lg disabled:opacity-40"
            style={{ background: T.card, border: `1px solid ${T.line}`, color: T.ink }}
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Verificar novamente
          </button>
          <button
            onClick={onClose}
            className="text-[13px] font-semibold h-9 px-3.5 rounded-lg"
            style={{ background: T.ink, color: "#fff" }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
