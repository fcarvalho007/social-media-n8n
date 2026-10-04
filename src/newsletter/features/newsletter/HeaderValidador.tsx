import { useEffect, useState } from "react";
import { Check, ChevronDown, Globe, Link2, Loader2, Mail, X } from "lucide-react";
import type { ItemChecklist, NivelChecklist } from "./checklist";
import { copyPilulaContagem } from "./checklist";

interface Props {
  diasAteEnvio: number;
  itens: ItemChecklist[];
  bloqueado: boolean;
  papelDesconhecido: boolean;
  testePending: boolean;
  verificarLinksPending: boolean;
  /** Notícias aprovadas com destino='site' — só aparecem na página WordPress. */
  nSoNoSite: number;
  /** Total que vai no email (destaques + corpo). */
  nEmailTotal?: number;
  /** Total que vai no site (todas as aprovadas). */
  nSiteTotal?: number;
  onTestar: () => void;
  onVerificarLinks: () => void;
  onIrParaSeccao: (secId: string) => void;
}

const T = {
  bg: "#0F172A",
  bgAlt: "#1E293B",
  ink: "#F8FAFC",
  muted: "#CBD5E1",
  faint: "#94A3B8",
  border: "rgba(255,255,255,0.10)",
  amberBg: "#FEF0C7",
  amberInk: "#B54708",
  amberSoft: "rgba(253, 200, 108, 0.18)",
  amberSoftInk: "#FDE68A",
  okBg: "#D1FADF",
  okInk: "#027A48",
  okSoft: "rgba(52, 211, 153, 0.18)",
  okSoftInk: "#A7F3D0",
  redSoft: "rgba(248, 113, 113, 0.20)",
  redSoftInk: "#FCA5A5",
  neutralSoft: "rgba(148,163,184,0.18)",
  neutralSoftInk: "#CBD5E1",
  neutralPill: "rgba(255,255,255,0.10)",
};

function coresNivel(n: NivelChecklist) {
  switch (n) {
    case "verde":    return { bg: T.okSoft,      ink: T.okSoftInk };
    case "ambar":    return { bg: T.amberSoft,   ink: T.amberSoftInk };
    case "vermelho": return { bg: T.redSoft,     ink: T.redSoftInk };
    default:         return { bg: T.neutralSoft, ink: T.neutralSoftInk };
  }
}

const LS_KEY = "ds:header-collapsed";

export function HeaderValidador({
  diasAteEnvio, itens,
  bloqueado, papelDesconhecido, testePending, verificarLinksPending,
  nSoNoSite, nEmailTotal, nSiteTotal, onTestar, onVerificarLinks, onIrParaSeccao,
}: Props) {
  const urgente = diasAteEnvio <= 1;
  const pilulaStyle = urgente
    ? { background: T.amberBg, color: T.amberInk, border: `1px solid ${T.amberBg}` }
    : { background: "transparent", color: T.muted, border: `1px solid ${T.border}` };

  // Estado de colapso (persistido) — só afecta mobile.
  const [colapsado, setColapsado] = useState<boolean>(true);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(LS_KEY);
      if (v !== null) setColapsado(v === "1");
    } catch { /* ignore */ }
  }, []);
  function toggleColapsado() {
    setColapsado((c) => {
      const next = !c;
      try { window.localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }


  // Resumo agregado para o estado colapsado.
  const totalCheck = itens.length;
  const verdes = itens.filter((i) => i.nivel === "verde").length;
  const temBloqueio = itens.some((i) => i.nivel === "vermelho");
  const temAmbar = itens.some((i) => i.nivel === "ambar");
  const nivelResumo: NivelChecklist = temBloqueio ? "vermelho" : (verdes === totalCheck ? "verde" : (temAmbar ? "ambar" : "neutro"));
  const coresResumo = coresNivel(nivelResumo);

  // Ao clicar num item quando colapsado, expande e navega.
  function irParaItem(destino: string) {
    if (colapsado) {
      setColapsado(false);
      try { window.localStorage.setItem(LS_KEY, "0"); } catch { /* ignore */ }
    }
    onIrParaSeccao(destino);
  }

  return (
    <div className="w-full" style={{ background: T.bg, color: T.ink }}>
      <div className="px-4 md:px-8 py-2 max-w-[1460px] mx-auto">
        {/* Linha 1: contagem + chips + acções secundárias */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className="hidden sm:inline-flex text-[11px] font-bold px-2 py-1 rounded-full leading-none whitespace-nowrap shrink-0"
            style={pilulaStyle}
            title="Contagem regressiva para o envio"
          >
            {copyPilulaContagem(diasAteEnvio)}
          </span>

          {(nEmailTotal !== undefined || nSiteTotal !== undefined) && (
            <span
              className="text-[11px] font-bold px-2 py-1 rounded-full leading-none whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              style={{ background: T.neutralPill, color: T.ink, border: `1px solid ${T.border}` }}
              title={`Email: ${nEmailTotal ?? 0} · Site: ${nSiteTotal ?? 0}${nSoNoSite > 0 ? ` (${nSoNoSite} só no site)` : ""}`}
            >
              <Mail size={11} strokeWidth={2.2} /> {nEmailTotal ?? 0}
              <span style={{ color: T.faint }}>·</span>
              <Globe size={11} strokeWidth={2.2} /> {nSiteTotal ?? 0}
            </span>
          )}

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 ml-auto">
            <button
              onClick={onVerificarLinks}
              disabled={verificarLinksPending}
              title="Verifica todos os URLs da edição"
              className="hidden md:flex items-center justify-center gap-1.5 text-[12px] font-semibold h-9 px-3 rounded-lg disabled:opacity-40"
              style={{ border: `1px solid ${T.border}`, color: T.ink, background: "rgba(255,255,255,0.06)" }}
            >
              {verificarLinksPending ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              <span>Verificar links</span>
            </button>

            <button
              onClick={onTestar}
              disabled={bloqueado || testePending || papelDesconhecido}
              className="hidden sm:flex items-center justify-center gap-1.5 text-[12px] font-semibold h-9 px-3 rounded-lg disabled:opacity-40"
              style={{ border: `1px solid ${T.border}`, color: T.ink, background: "rgba(255,255,255,0.06)" }}
            >
              {testePending ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              <span>Testar</span>
            </button>
          </div>
        </div>


        {/* MOBILE: resumo colapsável — só o essencial (edição + contagem + resumo) */}
        <button
          type="button"
          onClick={toggleColapsado}
          aria-expanded={!colapsado}
          aria-controls="header-detalhes"
          className="mt-2 sm:hidden w-full flex items-center gap-2 text-left rounded-md py-1.5 px-1 -mx-1 hover:bg-white/5 transition-colors"
        >
          <span
            className="text-[11px] font-bold px-2 py-1 rounded-full leading-none whitespace-nowrap"
            style={pilulaStyle}
          >
            {copyPilulaContagem(diasAteEnvio)}
          </span>
          <span
            className="text-[11px] font-bold px-2 py-1 rounded-full leading-none whitespace-nowrap inline-flex items-center gap-1.5"
            style={{ background: coresResumo.bg, color: coresResumo.ink }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 7, height: 7, background: coresResumo.ink,
                animation: temBloqueio ? "ds-pulse 1.6s ease-in-out infinite" : undefined,
              }}
              aria-hidden="true"
            />
            {verdes}/{totalCheck}
          </span>
          <ChevronDown
            size={16}
            className="ml-auto transition-transform"
            style={{ color: T.faint, transform: colapsado ? "rotate(0deg)" : "rotate(180deg)" }}
          />
        </button>


        {/* Detalhes: checklist completa. Em sm+ sempre visível; em mobile controlado por `colapsado`. */}
        <div
          id="header-detalhes"
          className={`${colapsado ? "hidden" : "block"} sm:block overflow-hidden transition-all`}
        >
          <ul className="mt-2.5 grid grid-cols-2 md:flex md:flex-wrap gap-x-5 gap-y-2 list-none p-0 m-0">
            {itens.map((it) => {
              const c = coresNivel(it.nivel);
              const isX = it.nivel === "vermelho";
              return (
                <li key={it.chave}>
                  <button
                    type="button"
                    onClick={() => irParaItem(it.destino)}
                    className="flex items-center gap-2 text-[12.5px] font-medium leading-none rounded-md py-1 -mx-1 px-1 hover:bg-white/5 transition-colors"
                    style={{ color: c.ink }}
                    title={
                      it.nivel === "verde" ? "Concluído — clica para rever" :
                      it.nivel === "vermelho" ? "Bloqueios detectados — clica para ver" :
                      it.nivel === "neutro" ? "Ainda não verificado — clica" :
                      "Por fazer — clica para ir à secção"
                    }
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: 16, height: 16,
                        background: c.bg,
                        border: `1.5px solid ${c.ink}`,
                      }}
                      aria-hidden="true"
                    >
                      {it.nivel === "verde" && <Check size={10} strokeWidth={3} />}
                      {isX && <X size={10} strokeWidth={3} />}
                    </span>
                    <span>{it.rotulo}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <style>{`@keyframes ds-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }`}</style>
    </div>
  );
}
