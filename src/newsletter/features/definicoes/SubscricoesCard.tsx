import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import { Loader2, UserMinus, PauseCircle, CalendarClock, RotateCcw, FlaskConical, Check, X, Copy, Webhook } from "lucide-react";
import { resumoSubscricoesFn, testarSubscricaoFn, urlWebhookEgoiFn } from "@/newsletter/lib/subscricao.functions";

const T = { card: "#FFFFFF", line: "#E4E7EC", ink: "#101828", muted: "#667085", faint: "#98A2B3" };
const COR = "#EC4899";

const ROTULO: Record<string, { texto: string; cor: string }> = {
  cancelado: { texto: "Cancelou", cor: "#EF4444" },
  pausado: { texto: "Pausa de um mês", cor: "#8B5CF6" },
  mensal: { texto: "Só uma vez por mês", cor: "#0EA5E9" },
  reactivado: { texto: "Regressou (automático)", cor: "#10B981" },
  revertido: { texto: "Mudou de ideias", cor: "#10B981" },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SubscricoesCard() {
  const carregar = useServerFn(resumoSubscricoesFn);
  const { data, isLoading } = useQuery({
    queryKey: ["subscricao-eventos"],
    queryFn: () => carregar(),
    staleTime: 60_000,
  });

  const testar = useServerFn(testarSubscricaoFn);
  const carregarWebhook = useServerFn(urlWebhookEgoiFn);
  const { data: webhook } = useQuery({
    queryKey: ["subscricao-webhook"],
    queryFn: () => carregarWebhook(),
    staleTime: Infinity,
  });
  const [emailTeste, setEmailTeste] = useState("");
  const [aTestar, setATestar] = useState(false);
  const [passos, setPassos] = useState<Array<{ passo: string; ok: boolean; detalhe: string }> | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function correrTeste() {
    setATestar(true);
    setPassos(null);
    try {
      const r = await testar({ data: { email: emailTeste } });
      setPassos(r.passos);
    } catch {
      setPassos([{ passo: "Teste", ok: false, detalhe: "Não foi possível correr o teste." }]);
    } finally {
      setATestar(false);
    }
  }

  const c = data?.contagens;
  const motivos = Object.entries(data?.motivos ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-[20px] p-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      <header className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${COR}18`, color: COR }}
        >
          <UserMinus size={16} />
        </span>
        <div>
          <h2 className="text-[17px] font-bold" style={{ color: T.ink }}>Subscrições · saídas e pausas</h2>
          <p className="text-[14px] mt-0.5" style={{ color: T.muted }}>
            O que os leitores escolheram na página de gestão de subscrição.
          </p>
        </div>
      </header>

      {isLoading && (
        <p className="mt-5 flex items-center gap-2 text-[14px]" style={{ color: T.muted }}>
          <Loader2 size={15} className="animate-spin" /> A carregar…
        </p>
      )}

      {c && (
        <>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Pilula icone={<UserMinus size={14} />} cor="#EF4444" rotulo="Cancelamentos" valor={c.cancelado ?? 0} />
            <Pilula icone={<PauseCircle size={14} />} cor="#8B5CF6" rotulo="Pausas" valor={c.pausado ?? 0} />
            <Pilula icone={<CalendarClock size={14} />} cor="#0EA5E9" rotulo="Mensais" valor={c.mensal ?? 0} />
            <Pilula icone={<RotateCcw size={14} />} cor="#10B981" rotulo="Regressos" valor={(c.reactivado ?? 0) + (c.revertido ?? 0)} />
          </div>

          {motivos.length > 0 && (
            <div className="mt-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: T.faint }}>
                Motivos indicados
              </p>
              <ul className="mt-2 space-y-1.5">
                {motivos.map(([m, n]) => (
                  <li key={m} className="flex items-center justify-between text-[14.5px]" style={{ color: T.ink }}>
                    <span>{m}</span>
                    <span className="font-bold" style={{ color: T.muted }}>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: T.faint }}>
              Últimos movimentos
            </p>
            {data.eventos.length === 0 ? (
              <p className="mt-2 text-[14.5px]" style={{ color: T.muted }}>Ainda não há movimentos registados.</p>
            ) : (
              <ul className="mt-2 divide-y" style={{ borderColor: T.line }}>
                {data.eventos.slice(0, 12).map((e) => {
                  const r = ROTULO[e.accao] ?? { texto: e.accao, cor: T.muted };
                  return (
                    <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14.5px] truncate" style={{ color: T.ink }}>{e.email}</p>
                        {e.motivo && <p className="text-[13px] truncate" style={{ color: T.faint }}>{e.motivo}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[13px] font-bold" style={{ color: r.cor }}>{r.texto}</span>
                        <p className="text-[12.5px]" style={{ color: T.faint }}>{fmt(e.criado_em)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${T.line}` }}>
        <p className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: T.faint }}>
          Teste controlado
        </p>
        <p className="mt-1.5 text-[14px]" style={{ color: T.muted }}>
          Corre o fluxo completo com um email teu: aplica a pausa, confirma na E-goi e repõe logo a seguir.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={emailTeste}
            onChange={(ev) => setEmailTeste(ev.target.value)}
            placeholder="o.teu.email@dominio.pt"
            className="flex-1 h-[44px] px-3.5 rounded-xl text-[15px] outline-none focus:ring-2"
            style={{ border: `1px solid ${T.line}`, color: T.ink, background: "#FFFFFF" }}
          />
          <button
            type="button"
            disabled={aTestar || !emailTeste.includes("@")}
            onClick={() => void correrTeste()}
            className="inline-flex items-center justify-center gap-2 h-[44px] px-4 rounded-xl text-[14.5px] font-bold disabled:opacity-50"
            style={{ background: `${COR}14`, color: COR, border: `1px solid ${COR}44` }}
          >
            {aTestar ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}
            {aTestar ? "A testar…" : "Correr teste"}
          </button>
        </div>

        {passos && (
          <ul className="mt-3 space-y-1.5">
            {passos.map((p) => (
              <li key={p.passo} className="flex items-start gap-2 text-[14px]">
                <span className="mt-0.5 shrink-0" style={{ color: p.ok ? "#10B981" : "#EF4444" }}>
                  {p.ok ? <Check size={15} /> : <X size={15} />}
                </span>
                <span style={{ color: T.ink }}>
                  <strong>{p.passo}</strong> — <span style={{ color: T.muted }}>{p.detalhe}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {webhook?.url && (
        <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${T.line}` }}>
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: T.faint }}>
            <Webhook size={13} /> Cancelamentos feitos na E-goi
          </p>
          <p className="mt-1.5 text-[14px]" style={{ color: T.muted }}>
            Configura este endereço na E-goi (webhook de cancelamento) para que as saídas feitas por lá também apareçam aqui.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code
              className="flex-1 min-w-0 truncate text-[12.5px] px-3 py-2.5 rounded-xl"
              style={{ background: "#F7F8FA", border: `1px solid ${T.line}`, color: T.ink }}
            >
              {webhook.url}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(webhook.url);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 h-[40px] px-3 rounded-xl text-[13.5px] font-bold shrink-0"
              style={{ border: `1px solid ${T.line}`, color: T.muted }}
            >
              {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Pilula({ icone, cor, rotulo, valor }: { icone: React.ReactNode; cor: string; rotulo: string; valor: number }) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: `${cor}0F`, border: `1px solid ${cor}33` }}>
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: cor }}>
        {icone} {rotulo}
      </span>
      <p className="text-[24px] font-bold leading-tight mt-1" style={{ color: T.ink }}>{valor}</p>
    </div>
  );
}
