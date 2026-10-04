import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, PauseCircle, CalendarClock, LogOut, Check, ArrowLeft, Undo2, Mail, ShieldCheck,
} from "lucide-react";
import { accaoSubscricao, estadoSubscricao, type EstadoPublico } from "@/services/nlPublico";

const TITLE = "Gerir subscrição · Digital Sprint";
const DESCRIPTION = "Pausa, reduz a frequência ou cancela a newsletter Digital Sprint em poucos segundos.";


type Passo = "carregar" | "email" | "opcoes" | "confirmar" | "feito";

const MOTIVOS = [
  "Recebo emails a mais",
  "O conteúdo já não é relevante para mim",
  "Não me lembro de ter subscrito",
  "Mudei de área profissional",
  "Outro motivo",
];

function mascarar(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 2)}${"•".repeat(Math.max(2, u.length - 2))}@${d}`;
}

function fmtData(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

export default function SubscricaoPage() {
  const [sp] = useSearchParams();
  // Only the signed token identifies the subscriber; an e-mail in the URL is ignored.
  const e: string | undefined = undefined;
  const t = sp.get("t") ?? undefined;
  const a = sp.get("a") ?? undefined;
  useEffect(() => { document.title = TITLE; }, []);

  const [passo, setPasso] = useState<Passo>(e || t ? "carregar" : "email");
  const [estado, setEstado] = useState<EstadoPublico | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [aProcessar, setAProcessar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ mensagem: string; estado: string; retomaEm: string | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const identidade = useMemo(() => ({ token: t ?? null, email: estado?.email ?? e ?? null }), [t, e, estado]);

  useEffect(() => {
    if (!e && !t) return;
    let vivo = true;
    void estadoSubscricao(t ?? "")
      .then((r) => {
        if (!vivo) return;
        setEstado(r);
        // Quem clica em «cancelar já» no email vai directo ao passo de
        // confirmação, mas continua a ver as alternativas à saída.
        setPasso(r.ok && r.email ? (a === "cancelar" ? "confirmar" : "opcoes") : "email");
      })
      .catch(() => vivo && setPasso("email"));
    return () => { vivo = false; };
  }, [e, t, a]);

  async function executar(accao: "cancelar" | "pausar" | "mensal" | "reverter") {
    setErro(null);
    setAProcessar(accao);
    try {
      const r = await accaoSubscricao(identidade.token ?? "", accao, accao === "cancelar" ? motivo : null);
      if (!r.ok) { setErro(r.mensagem); return; }
      setResultado({ mensagem: r.mensagem, estado: r.estado, retomaEm: r.retomaEm });
      setPasso("feito");
    } catch {
      setErro("Não foi possível concluir. Tenta outra vez dentro de instantes.");
    } finally {
      setAProcessar(null);
    }
  }

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center px-5 py-14"
      style={{ background: "#0D0D1F" }}
    >
      {/* Halo de marca */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 50% -10%, rgba(139,92,246,0.22), transparent 70%), radial-gradient(700px 420px at 90% 110%, rgba(236,72,153,0.14), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[560px]">
        <header className="text-center mb-8">
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-[0.24em] px-3 py-1.5 rounded-full"
            style={{ color: "#C4B5FD", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.28)" }}
          >
            Digital Sprint
          </span>
          <h1
            className="mt-5 font-display font-bold text-[30px] sm:text-[38px] leading-[1.05]"
            style={{ color: "#F8FAFC", letterSpacing: "-0.02em" }}
          >
            {passo === "feito" ? "Está tratado." : "Antes de saíres…"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#9CA0B8" }}>
            {passo === "feito"
              ? "Obrigado pelo tempo que deste à Digital Sprint."
              : "Não precisas de cancelar para receber menos. Escolhe o que te serve melhor."}
          </p>
        </header>

        <section
          className="rounded-3xl p-7 sm:p-9"
          style={{
            background: "rgba(20,20,43,0.78)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 40px 120px -25px rgba(99,102,241,0.28)",
            backdropFilter: "blur(18px) saturate(140%)",
          }}
        >
          {passo === "carregar" && (
            <div className="flex items-center gap-3 justify-center py-10" style={{ color: "#9CA0B8" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[15px]">A carregar a tua subscrição…</span>
            </div>
          )}

          {passo === "email" && (
            <div className="space-y-4 text-center">
              <Mail size={22} className="mx-auto" style={{ color: "#6B7090" }} />
              <p className="text-[15px] leading-relaxed" style={{ color: "#C7CAD9" }}>
                Esta ligação está incompleta ou já não é válida. Para gerir a subscrição, abre a ligação «Gerir a subscrição» no fim de um email recente da Digital Sprint.
              </p>
            </div>
          )}

          {passo === "opcoes" && estado?.email && (
            <div className="space-y-4">
              <p className="text-[13.5px]" style={{ color: "#7A7F9E" }}>
                Subscrição de <strong style={{ color: "#E2E8F0" }}>{mascarar(estado.email)}</strong>
                {estado.estado !== "activa" && (
                  <> · estado actual: <strong style={{ color: "#C4B5FD" }}>{
                    estado.estado === "cancelada" ? "cancelada" : estado.estado === "pausada" ? "em pausa" : "mensal"
                  }</strong></>
                )}
              </p>

              <Opcao
                icone={<PauseCircle size={20} />}
                cor="#8B5CF6"
                destaque
                titulo="Pausar durante um mês"
                texto="Silêncio total durante 30 dias. Voltas sozinho, sem teres de fazer nada."
                aCarregar={aProcessar === "pausar"}
                onClick={() => void executar("pausar")}
              />
              <Opcao
                icone={<CalendarClock size={20} />}
                cor="#0EA5E9"
                titulo="Receber só uma vez por mês"
                texto="Ficas com a primeira edição de cada mês — o essencial, sem o ritmo semanal."
                aCarregar={aProcessar === "mensal"}
                onClick={() => void executar("mensal")}
              />
              <Opcao
                icone={<LogOut size={20} />}
                cor="#EF4444"
                titulo="Cancelar a subscrição"
                texto="Sais definitivamente da lista. Podes voltar quando quiseres."
                onClick={() => setPasso("confirmar")}
              />

              <NotaSeguranca />
            </div>
          )}

          {passo === "confirmar" && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setPasso("opcoes")}
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold min-h-[44px]"
                style={{ color: "#9CA0B8" }}
              >
                <ArrowLeft size={15} /> Voltar às opções
              </button>
              <div>
                <h2 className="font-display font-bold text-[22px]" style={{ color: "#F8FAFC" }}>
                  Ajuda-nos a melhorar
                </h2>
                <p className="mt-2 text-[14.5px]" style={{ color: "#9CA0B8" }}>
                  Se quiseres, diz porque sais. É opcional e leva dois segundos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {MOTIVOS.map((m) => {
                  const activo = motivo === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotivo(activo ? null : m)}
                      className="text-[14px] font-semibold px-4 min-h-[44px] rounded-xl transition-colors"
                      style={{
                        color: activo ? "#F8FAFC" : "#B4B8CC",
                        background: activo ? "rgba(139,92,246,0.22)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${activo ? "rgba(139,92,246,0.55)" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={aProcessar === "cancelar"}
                onClick={() => void executar("cancelar")}
                className="w-full min-h-[52px] rounded-xl text-[15.5px] font-bold transition-transform hover:translate-y-[-1px] disabled:opacity-60"
                style={{ background: "rgba(239,68,68,0.14)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.4)" }}
              >
                {aProcessar === "cancelar" ? "A cancelar…" : "Confirmar cancelamento"}
              </button>
              <p className="text-center text-[13px]" style={{ color: "#6B7090" }}>
                Preferes só uma pausa?{" "}
                <button type="button" onClick={() => void executar("pausar")} className="underline underline-offset-2 font-semibold" style={{ color: "#C4B5FD" }}>
                  Pausar um mês
                </button>
              </p>
            </div>
          )}

          {passo === "feito" && resultado && (
            <div className="text-center space-y-5">
              <div
                className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.14)", border: "1px solid rgba(16,185,129,0.35)" }}
              >
                <Check size={28} style={{ color: "#34D399" }} />
              </div>
              <p className="text-[17px] font-semibold" style={{ color: "#F1F2F8" }}>{resultado.mensagem}</p>
              {resultado.retomaEm && (
                <p className="text-[14.5px]" style={{ color: "#9CA0B8" }}>
                  Regressas a {fmtData(resultado.retomaEm)}.
                </p>
              )}
              {resultado.estado !== "activa" && (
                <button
                  type="button"
                  disabled={aProcessar === "reverter"}
                  onClick={() => void executar("reverter")}
                  className="inline-flex items-center gap-2 text-[14.5px] font-bold min-h-[48px] px-5 rounded-xl"
                  style={{ color: "#C4B5FD", background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.32)" }}
                >
                  <Undo2 size={16} /> {aProcessar === "reverter" ? "A repor…" : "Mudei de ideias, quero voltar"}
                </button>
              )}
              <p className="text-[13.5px] leading-relaxed pt-2" style={{ color: "#6B7090" }}>
                Continuamos por perto no{" "}
                <a href="https://fredericocarvalho.pt/podcast" className="underline underline-offset-2" style={{ color: "#9CA0B8" }}>podcast</a>{" "}
                e no{" "}
                <a href="https://www.linkedin.com/in/fredericocarvalho/" className="underline underline-offset-2" style={{ color: "#9CA0B8" }}>LinkedIn</a>.
              </p>
            </div>
          )}

          {erro && (
            <p
              className="mt-5 text-[13.5px] font-semibold px-3.5 py-2.5 rounded-xl"
              style={{ background: "rgba(239,68,68,0.10)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              {erro}
            </p>
          )}
        </section>

        <p className="text-center text-[12px] mt-6" style={{ color: "#5B6080" }}>
          Digital Sprint · Frederico Carvalho · Digital FC — Portugal
        </p>
      </div>
    </main>
  );
}

function NotaSeguranca() {
  return (
    <p className="flex items-start gap-2 text-[12.5px] leading-relaxed pt-1" style={{ color: "#6B7090" }}>
      <ShieldCheck size={14} className="mt-[2px] shrink-0" />
      A alteração é imediata e aplica-se a todas as listas onde estás inscrito.
    </p>
  );
}

function Opcao({ icone, cor, titulo, texto, onClick, aCarregar, destaque }: {
  icone: React.ReactNode;
  cor: string;
  titulo: string;
  texto: string;
  onClick: () => void;
  aCarregar?: boolean;
  destaque?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={aCarregar}
      className="w-full text-left rounded-2xl p-4 sm:p-5 flex gap-4 items-start transition-all hover:translate-y-[-1px] disabled:opacity-60"
      style={{
        background: destaque ? "rgba(139,92,246,0.10)" : "rgba(255,255,255,0.035)",
        border: `1px solid ${destaque ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <span
        className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}44` }}
      >
        {aCarregar ? <Loader2 size={18} className="animate-spin" /> : icone}
      </span>
      <span className="flex-1">
        <span className="block text-[16.5px] font-bold" style={{ color: "#F1F2F8" }}>{titulo}</span>
        <span className="block mt-1 text-[14px] leading-relaxed" style={{ color: "#9CA0B8" }}>{texto}</span>
      </span>
    </button>
  );
}

function BotaoPrincipal({ aCarregar, rotulo }: { aCarregar: boolean; rotulo: string }) {
  return (
    <button
      type="submit"
      disabled={aCarregar}
      className="w-full min-h-[52px] rounded-xl text-white text-[15.5px] font-bold ds-gradient disabled:opacity-50 transition-transform hover:translate-y-[-1px]"
    >
      {aCarregar ? <Loader2 size={18} className="animate-spin mx-auto" /> : rotulo}
    </button>
  );
}
