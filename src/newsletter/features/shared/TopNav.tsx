import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@/newsletter/shim/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, LogOut, Search, Send, Archive, Inbox, Settings2, ChevronDown, Mail, Globe, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import { useSessao } from "@/newsletter/features/newsletter/useSessao";
import { PesquisaGlobal } from "@/newsletter/features/shared/PesquisaGlobal";
import { listarAuditRecente } from "@/newsletter/features/newsletter/data";
import { useEnvioAccao } from "@/newsletter/features/newsletter/envioStore";
import { useValidador } from "@/newsletter/features/newsletter/validadorStore";
import type { ItemChecklist } from "@/newsletter/features/newsletter/checklist";
import { copyPilulaContagem } from "@/newsletter/features/newsletter/checklist";

// Paleta do novo cabeçalho — banda superior é o gradiente, banda inferior escura.
const GRAD_TOPO = "linear-gradient(115deg, #4F46E5 0%, #7C3AED 55%, #DB2777 100%)";
const COR_INFERIOR = "#150F3D";
const T = {
  shell: "#F7F8FA", card: "#FFFFFF", line: "#E4E7EC",
  ink: "#101828", muted: "#667085", faint: "#98A2B3", primary: "#4F46E5",
};

function iniciais(nome: string): string {
  return nome.split(" ").map((p) => p[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
}
function fmtHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const nivelCor = (n: ItemChecklist["nivel"]) => {
  switch (n) {
    case "verde": return "#4ADE80";
    case "ambar": return "#FDE68A";
    case "vermelho": return "#FCA5A5";
    default: return "rgba(255,255,255,0.35)";
  }
};

function BandaValidador({
  dias, itens, nEmail, nSite, nSoNoSite, nPendentes, onIrParaSeccao,
}: {
  dias: number; itens: ItemChecklist[];
  nEmail: number; nSite: number; nSoNoSite: number; nPendentes: number;
  onIrParaSeccao: (secId: string) => void;
}) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  return (
    <div style={{ background: COR_INFERIOR }} className="border-t border-white/5">
      <div className="max-w-[1460px] mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span
          className="hidden md:inline text-[10.5px] font-bold uppercase tracking-[0.16em] shrink-0"
          style={{ color: "rgba(255,255,255,0.55)" }}
          title={`Envio ${copyPilulaContagem(dias)}`}
        >
          Validador
        </span>

        <button
          type="button"
          onClick={() => onIrParaSeccao("categorias")}
          title={`No email: ${nEmail} · na página do site: ${nSite}${nSoNoSite > 0 ? ` (${nSoNoSite} só no site)` : ""}${nPendentes > 0 ? ` · ${nPendentes} por aprovar` : ""}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold leading-none rounded-full px-2.5 py-1 shrink-0 hover:bg-white/10 transition-colors"
          style={{ background: "rgba(255,255,255,0.10)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.16)" }}
        >
          <Mail size={11} strokeWidth={2.4} /> {nEmail}
          <span style={{ color: "rgba(255,255,255,0.35)" }}>·</span>
          <Globe size={11} strokeWidth={2.4} /> {nSite}
          {nSoNoSite > 0 && (
            <span className="hidden sm:inline font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>
              ({nSoNoSite} só no site)
            </span>
          )}
        </button>

        {nPendentes > 0 && (
          <button
            type="button"
            onClick={() => onIrParaSeccao("pendentes")}
            title={`${nPendentes} notícia(s) na fila, ainda por aprovar`}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-bold leading-none rounded-full px-2.5 py-1 shrink-0 hover:bg-white/10 transition-colors"
            style={{ background: "rgba(253,230,138,0.16)", color: "#FDE68A", border: "1px solid rgba(253,230,138,0.28)" }}
          >
            <Inbox size={11} strokeWidth={2.4} /> {nPendentes} por aprovar
          </button>
        )}

        <button
          type="button"
          onClick={() => setDetalhesAbertos((v) => !v)}
          aria-expanded={detalhesAbertos}
          className="md:hidden inline-flex items-center gap-1.5 text-[11.5px] font-bold leading-none rounded-full px-3 py-1 shrink-0"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)", border: "1px solid rgba(255,255,255,0.14)" }}
        >
          Checklist
          <ChevronDown size={13} style={{ transform: detalhesAbertos ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>

        <ul className={`${detalhesAbertos ? "flex" : "hidden"} md:flex flex-wrap items-center gap-x-5 gap-y-1 list-none m-0 p-0 w-full md:w-auto`}>
          {itens.map((it) => (
            <li key={it.chave}>
              <button
                type="button"
                onClick={() => onIrParaSeccao(it.destino)}
                title={it.chave === "noticiasEmail" ? "Só conta as notícias que vão no email (as restantes ficam na página do site)" : it.detalhe}
                className="inline-flex items-center gap-2 text-[11.5px] font-medium leading-none rounded-md py-1 -mx-1 px-1 hover:bg-white/5 transition-colors"
                style={{ color: "rgba(255,255,255,0.68)" }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block rounded-full shrink-0"
                  style={{ width: 5, height: 5, background: nivelCor(it.nivel) }}
                />
                <span>{it.rotulo}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


export function TopNav() {
  const { nomeExibicao, isAdmin, papel, perfilErro } = useSessao();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [registoAberto, setRegistoAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const papelDesconhecido = papel === null;
  const rota = useRouterState({ select: (s) => s.location.pathname });
  const envio = useEnvioAccao();
  const validador = useValidador();
  const noEditor = rota === "/";
  const mostrarEnviar = noEditor && envio !== null;

  const auditQ = useQuery({ queryKey: ["audit"], queryFn: () => listarAuditRecente(8), staleTime: 30_000 });
  const audit = auditQ.data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPesquisaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuAberto) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuAberto(false); };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onEsc); };
  }, [menuAberto]);

  // Cabeçalho compacto em mobile: encolhe assim que se faz scroll na página.
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompacto(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Contagem regressiva (só aparece se estivermos no editor com validador registado)
  const dias = validador?.dias ?? null;
  const urgente = dias !== null && dias <= 2;
  const pilulaStyle = urgente
    ? { background: "#FBBF24", color: "#78350F", border: "1px solid #FBBF24" }
    : { background: "rgba(255,255,255,0.14)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.18)" };

  const linkClass = "inline-flex items-center min-h-[42px] md:min-h-0 text-[13.5px] font-semibold px-3.5 md:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap";
  const inactiveStyle = { color: "rgba(255,255,255,0.68)" } as const;
  const activeStyle = { color: "#FFFFFF", background: "rgba(255,255,255,0.12)" } as const;

  const showValidador = noEditor && validador !== null;

  const itemMenu = "flex items-center gap-2 w-full text-left text-[13.5px] font-medium px-3 py-2.5 rounded-md hover:bg-slate-100 transition-colors";

  return (
    <header className="sticky top-0 z-40" style={{ background: T.shell }}>
      <div className={`max-w-[1460px] mx-auto px-3 md:px-6 md:pt-3 ${compacto ? "pt-1.5" : "pt-3"}`}>
        <div
          className="rounded-2xl"
          style={{
            boxShadow: "0 6px 20px -12px rgba(15,23,42,0.30)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          {/* ── BANDA SUPERIOR · Acção ── */}
          <div className="rounded-t-2xl" style={{ background: GRAD_TOPO }}>

            <div className={`px-3 md:px-5 md:py-2.5 flex flex-wrap items-center gap-2 md:gap-3 ${compacto ? "py-1.5" : "py-2.5"}`}>
              {/* Logótipo DS */}
              <Link to="/" className="shrink-0" aria-label="Ir para o editor">
                <span
                  className="inline-flex items-center justify-center font-display font-bold text-white text-[13px] rounded-lg"
                  style={{ width: 32, height: 32, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)" }}
                >
                  DS
                </span>
              </Link>

              {/* Nav principal — só Editor e Ferramentas */}
              <nav className={`ds-strip items-center gap-1 order-9 w-full md:order-none md:w-auto md:gap-0.5 -mx-1 px-1 md:mx-0 md:px-0 ${compacto ? "hidden md:flex" : "flex"}`}>
                <Link to="/" activeOptions={{ exact: true }} activeProps={{ style: activeStyle }} inactiveProps={{ style: inactiveStyle }} className={linkClass}>Editor</Link>
                <Link to="/edicoes-passadas" activeProps={{ style: activeStyle }} inactiveProps={{ style: inactiveStyle }} className={linkClass}>Edições passadas</Link>
                <Link to="/ferramentas" activeProps={{ style: activeStyle }} inactiveProps={{ style: inactiveStyle }} className={linkClass}>Ferramentas</Link>

                {isAdmin && (
                  <Link to="/emails" activeProps={{ style: activeStyle }} inactiveProps={{ style: inactiveStyle }} className={linkClass}>Emails</Link>
                )}
                {isAdmin && (
                  <Link to="/custos" activeProps={{ style: activeStyle }} inactiveProps={{ style: inactiveStyle }} className={linkClass}>Custos</Link>
                )}

              </nav>


              {/* Separador + pílula de contagem */}
              {dias !== null && (
                <>
                  <span aria-hidden="true" className="hidden sm:block h-5 w-px" style={{ background: "rgba(255,255,255,0.22)" }} />
                  <span
                    className="text-[11.5px] font-bold px-2.5 py-1 rounded-full leading-none whitespace-nowrap shrink-0"
                    style={pilulaStyle}
                    title="Contagem regressiva para o envio"
                  >
                    ⏰ {dias < 0 ? `${Math.abs(dias)}d em atraso` : dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `${dias} dias`}
                  </span>
                </>
              )}

              <div className="flex-1" />

              {/* Pesquisa compacta */}
              <button
                onClick={() => setPesquisaAberta(true)}
                className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md text-[11.5px] font-semibold shrink-0"
                style={{ color: "#FFFFFF", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }}
                aria-label="Pesquisar no arquivo"
                title="Pesquisar (⌘K)"
              >
                <Search size={13} />
                <span className="hidden sm:inline">Pesquisar</span>
                <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.18)", color: "#FFFFFF" }}>⌘K</span>
              </button>

              {/* Avatar + dropdown */}
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuAberto((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full p-0.5 pl-1 focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-haspopup="menu"
                  aria-expanded={menuAberto}
                  title={nomeExibicao}
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full text-[11.5px] font-bold text-white"
                    style={{ width: 30, height: 30, background: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.28)" }}
                  >
                    {iniciais(nomeExibicao)}
                  </span>
                  <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.75)" }} />
                </button>

                {menuAberto && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-[220px] rounded-xl overflow-hidden z-50"
                    style={{ background: T.card, border: `1px solid ${T.line}`, boxShadow: "0 12px 32px -12px rgba(15,23,42,0.28)" }}
                  >
                    <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: T.line }}>
                      <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>{nomeExibicao}</p>
                      <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: isAdmin ? T.primary : T.muted }}>
                        {papelDesconhecido ? "Sem papel" : isAdmin ? "Admin" : "Curador"}
                      </p>
                      {perfilErro && <p className="text-[10.5px] mt-1" style={{ color: "#B42318" }}>{perfilErro}</p>}
                    </div>
                    <div className="p-1.5">
                      <button className={itemMenu} onClick={() => { setMenuAberto(false); navigate({ to: "/edicoes-passadas" }); }} style={{ color: T.ink }}>
                        <History size={14} style={{ color: T.muted }} /> Edições passadas
                      </button>
                      <button className={itemMenu} onClick={() => { setMenuAberto(false); navigate({ to: "/arquivo" }); }} style={{ color: T.ink }}>
                        <Archive size={14} style={{ color: T.muted }} /> Arquivo
                      </button>

                      {isAdmin && (
                        <button className={itemMenu} onClick={() => { setMenuAberto(false); navigate({ to: "/emails" }); }} style={{ color: T.ink }}>
                          <Inbox size={14} style={{ color: T.muted }} /> Emails
                        </button>
                      )}
                      {isAdmin && (
                        <button className={itemMenu} onClick={() => { setMenuAberto(false); navigate({ to: "/custos" }); }} style={{ color: T.ink }}>
                          <DollarSign size={14} style={{ color: T.muted }} /> Custos
                        </button>
                      )}

                      <button className={itemMenu} onClick={() => { setMenuAberto(false); setRegistoAberto(true); }} style={{ color: T.ink }}>
                        <History size={14} style={{ color: T.muted }} />
                        <span>Registo de actividade</span>
                        {audit.length > 0 && (
                          <span className="ml-auto min-w-[18px] h-4 px-1.5 rounded-full text-[9.5px] font-bold flex items-center justify-center text-white" style={{ background: T.primary }}>
                            {audit.length}
                          </span>
                        )}
                      </button>
                      {isAdmin && (
                        <button className={itemMenu} onClick={() => { setMenuAberto(false); navigate({ to: "/definicoes" }); }} style={{ color: T.ink }}>
                          <Settings2 size={14} style={{ color: T.muted }} /> Definições
                        </button>
                      )}
                    </div>
                    <div className="p-1.5 border-t" style={{ borderColor: T.line }}>
                      <button className={itemMenu} onClick={() => { setMenuAberto(false); void sair(); }} style={{ color: "#B42318" }}>
                        <LogOut size={14} /> Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Enviar — só no editor com acção registada */}
              {mostrarEnviar && envio && (
                <div className={`relative group shrink-0 md:order-none md:w-auto ${compacto ? "w-auto order-none" : "w-full order-10"}`}>
                  <button
                    type="button"
                    onClick={() => { if (!envio.bloqueado && !envio.enviarPending && !envio.papelDesconhecido) envio.onEnviar(); }}
                    disabled={envio.bloqueado || envio.enviarPending || envio.papelDesconhecido}
                    className={`inline-flex items-center justify-center gap-1.5 text-[13px] font-bold px-4 rounded-full disabled:opacity-50 transition-transform hover:scale-[1.02] md:w-auto md:h-9 ${compacto ? "w-auto h-9" : "w-full h-11"}`}
                    style={{
                      background: "#FFFFFF",
                      color: "#4C1D95",
                      boxShadow: "0 6px 16px -6px rgba(15,23,42,0.35)",
                    }}
                    title={envio.isAdmin ? "Aprovar e enviar" : "Enviar teste"}
                  >
                    {envio.enviarPending
                      ? <><Loader2 size={13} className="animate-spin" /><span>Em envio…</span></>
                      : <>🚀 <span>Enviar</span></>}
                  </button>
                  {!envio.isAdmin && !envio.papelDesconhecido && (
                    <span className="absolute right-0 top-full mt-1 hidden group-hover:block text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap z-30" style={{ background: "#101828", color: "#FFFFFF" }}>
                      Curador só pode disparar listas de teste
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── BANDA INFERIOR · Validador ── */}
          {showValidador && validador && (
            <div className={`rounded-b-2xl overflow-hidden ${compacto ? "hidden md:block" : ""}`}>
              <BandaValidador
                dias={validador.dias}
                itens={validador.itens}
                nEmail={validador.nEmail}
                nSite={validador.nSite}
                nSoNoSite={validador.nSoNoSite}
                nPendentes={validador.nPendentes}
                onIrParaSeccao={validador.onIrParaSeccao}
              />

            </div>
          )}

        </div>
      </div>

      {/* Registo de actividade */}
      <Sheet open={registoAberto} onOpenChange={setRegistoAberto}>
        <SheetContent side="right" className="w-[90vw] sm:w-[420px]" style={{ background: T.shell }}>
          <SheetHeader>
            <SheetTitle style={{ color: T.ink }}>Registo de actividade</SheetTitle>
            <SheetDescription style={{ color: T.muted }}>Últimas acções nesta conta (em tempo real).</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 130px)" }}>
            {audit.length === 0 && <p className="text-xs" style={{ color: T.faint }}>Sem actividade ainda.</p>}
            {audit.map((a) => (
              <div key={a.id} className="rounded-md px-2.5 py-2 text-xs" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono shrink-0" style={{ color: T.faint }}>{fmtHora(a.criado_em)}</span>
                  <span className="font-semibold shrink-0" style={{ color: T.ink }}>{a.quem ?? "sistema"}</span>
                </div>
                <p className="mt-0.5" style={{ color: T.muted }}>{a.accao}</p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Pesquisa Sprint — painel de comando global */}
      <Dialog open={pesquisaAberta} onOpenChange={setPesquisaAberta}>
        <DialogContent
          className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl"
          style={{ background: "#14142B", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <VisuallyHidden>
            <DialogTitle>Pesquisa Sprint</DialogTitle>
            <DialogDescription>
              Procura notícias, crónicas e ferramentas na edição em curso, em edições enviadas, em pendentes e em rejeitadas.
            </DialogDescription>
          </VisuallyHidden>
          <PesquisaGlobal
            autoFocus
            onFechar={() => setPesquisaAberta(false)}
            onAbrirNoEditor={() => {
              setPesquisaAberta(false);
              navigate({ to: "/" });
            }}
            onAbrirEdicao={(r) => {
              setPesquisaAberta(false);
              navigate({
                to: "/arquivo",
                search: { tab: "edicoes", q: r.titulo.slice(0, 40) } as never,
                hash: `ed-${r.edicao_id}`,
              });
            }}
          />
        </DialogContent>
      </Dialog>

    </header>
  );
}
