import { createFileRoute } from "@/newsletter/shim/router";
import { useServerFn } from "@/newsletter/shim/start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@/newsletter/shim/zod-adapter";
import { z } from "zod";
import {
  Inbox, Loader2, Mail, RefreshCw, ShieldAlert, HelpCircle, ExternalLink,
  Search, X, Copy, Trash2, Filter, Wrench, ChevronDown, ChevronRight, Sparkles, AlertTriangle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  listarEmailsRecebidos, listarFontesEmail, apagarEmailRecebido, listarNoticiasDoEmail,
  reprocessarEmail, activarFonteEReprocessar,
  type EmailRecebido, type Janela, type FiltroClasse, type ClassificacaoDetalhe,
  type NoticiasDoEmail,
} from "@/newsletter/lib/emails-recebidos.functions";

import { listarFerramentasDoEmail, type FerramentaSugerida } from "@/newsletter/lib/ferramentas.functions";
import { useSessao } from "@/newsletter/features/newsletter/useSessao";
import { FilaEntrada } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";

const T = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  shell: "#F7F8FA",
  line: "#E4E7EC",
  lineStrong: "#D0D5DD",
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  primary: "#6366F1",
  ok: "#12B76A",
  warn: "#F79009",
  danger: "#B42318",
};

function fmtHora(iso: string) {
  try { return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function haQuanto(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

const searchSchema = z.object({
  janela: fallback(z.string(), "14d").default("14d"),
  classe: fallback(z.string(), "todas").default("todas"),
  fonte: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/emails")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Caixa de emails recebidos — Digital Sprint" },
      { name: "description", content: "Inspecciona os emails encaminhados para a newsletter, com retenção de 14 dias." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailsPage,
});

/** Inbox of forwarded emails; filters live in local state so it can be embedded outside the newsletter router. */
export function EmailsPage({ embutido = false }: { embutido?: boolean } = {}) {
  const inicial = Route.useSearch();
  const [search, setSearchState] = useState<{ janela: string; classe: string; fonte: string; q: string }>({
    janela: inicial.janela ?? "14d", classe: inicial.classe ?? "todas", fonte: inicial.fonte ?? "", q: inicial.q ?? "",
  });

  const janela = (["24h", "7d", "14d", "tudo"].includes(search.janela) ? search.janela : "14d") as Janela;
  const classe = (["todas", "newsletter", "confirmacao", "outro"].includes(search.classe) ? search.classe : "todas") as FiltroClasse;
  const fonte = search.fonte || "";
  const q = search.q || "";

  const listar = useServerFn(listarEmailsRecebidos);
  const listarFontes = useServerFn(listarFontesEmail);
  const apagar = useServerFn(apagarEmailRecebido);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["emails-recebidos", { janela, classe, fonte, q }],
    queryFn: () => listar({ data: { janela, classe, fonte: fonte || null, q: q || null } }),
    staleTime: 15_000,
  });
  const fontesQ = useQuery({
    queryKey: ["emails-fontes"],
    queryFn: () => listarFontes(),
    staleTime: 60_000,
  });

  const emails = useMemo(() => query.data?.emails ?? [], [query.data]);
  const contagens = query.data?.contagens ?? { total: 0, newsletter: 0, confirmacao: 0, outro: 0 };

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [qLocal, setQLocal] = useState(q);
  useEffect(() => setQLocal(q), [q]);

  // Auto-selecção do primeiro
  useEffect(() => {
    if (!seleccionadoId && emails.length > 0) setSeleccionadoId(emails[0].id);
    if (seleccionadoId && !emails.some((e) => e.id === seleccionadoId)) {
      setSeleccionadoId(emails[0]?.id ?? null);
    }
  }, [emails, seleccionadoId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("emails-recebidos-pagina")
      .on("postgres_changes", { event: "*", schema: "public", table: "nl_emails_recebidos" }, () => {
        qc.invalidateQueries({ queryKey: ["emails-recebidos"] });
        qc.invalidateQueries({ queryKey: ["emails-fontes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Debounce da pesquisa por assunto
  useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal !== q) {
        setSearchState((prev) => ({ ...prev, q: qLocal }));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qLocal, q]);

  const seleccionado = emails.find((e) => e.id === seleccionadoId) ?? null;

  const apagarM = useMutation({
    mutationFn: (id: string) => apagar({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails-recebidos"] });
      qc.invalidateQueries({ queryKey: ["emails-fontes"] });
    },
  });

  const filtrosActivos = janela !== "14d" || classe !== "todas" || fonte !== "" || q !== "";
  const ultimoIso = emails[0]?.recebido_em;

  const setSearch = (patch: Partial<{ janela: string; classe: string; fonte: string; q: string }>) => {
    setSearchState((prev) => ({ ...prev, ...patch }));
  };

  return (
    <main className={embutido ? "" : "max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-7"} style={{ background: embutido ? undefined : T.bg }}>
      {!embutido && <div className="mb-4"><FilaEntrada /></div>}
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">

        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight flex items-center gap-2" style={{ color: T.ink }}>
            <Inbox size={20} /> Caixa de emails recebidos
          </h1>
          <p className="text-[13px] mt-1" style={{ color: T.muted }}>
            {query.isLoading
              ? "A carregar…"
              : ultimoIso
                ? `${contagens.total} ${contagens.total === 1 ? "email" : "emails"} · última entrada ${haQuanto(ultimoIso)}`
                : "Sem emails na janela seleccionada."}
            {" · Retenção 14 dias."}
          </p>
          <p className="text-[12.5px] mt-1 font-semibold" style={{ color: atrasoEmails(query.data?.ultimo_recebido_em ?? ultimoIso ?? null) ? "#B42318" : T.muted }}>
            {(query.data?.ultimo_recebido_em ?? ultimoIso)
              ? `Último email recebido: ${dataHora(query.data?.ultimo_recebido_em ?? ultimoIso!)}`
              : "Ainda não chegou nenhum email."}
            {atrasoEmails(query.data?.ultimo_recebido_em ?? ultimoIso ?? null) && " · Nada chegou há mais de 2 dias: confirma o encaminhamento."}
          </p>
        </div>
        <button
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["emails-recebidos"] });
            qc.invalidateQueries({ queryKey: ["emails-fontes"] });
          }}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg"
          style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineStrong}` }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </header>

      {/* Barra de filtros */}
      <div className="rounded-[12px] p-3 mb-4 flex flex-wrap items-center gap-2"
        style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <Segment
          label="Janela"
          value={janela}
          onChange={(v) => setSearch({ janela: v })}
          options={[
            { value: "24h", label: "24 h" },
            { value: "7d", label: "7 dias" },
            { value: "14d", label: "14 dias" },
            { value: "tudo", label: "Tudo" },
          ]}
        />
        <span className="hidden md:block w-px h-6 mx-1" style={{ background: T.line }} />
        <Segment
          label="Classe"
          value={classe}
          onChange={(v) => setSearch({ classe: v })}
          options={[
            { value: "todas", label: `Todas (${contagens.total})` },
            { value: "newsletter", label: `📬 Newsletter (${contagens.newsletter})` },
            { value: "confirmacao", label: `⚠️ Confirmação (${contagens.confirmacao})` },
            { value: "outro", label: `❓ Outro (${contagens.outro})` },
          ]}
        />
        <span className="hidden md:block w-px h-6 mx-1" style={{ background: T.line }} />
        <div className="flex items-center gap-1.5">
          <Filter size={13} style={{ color: T.faint }} />
          <select
            value={fonte}
            onChange={(e) => setSearch({ fonte: e.target.value })}
            className="text-[12.5px] h-10 md:h-8 px-2 rounded-lg outline-none max-w-full"
            style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineStrong}` }}
          >
            <option value="">Todas as fontes</option>
            {(fontesQ.data ?? []).map((f) => (
              <option key={f.chave} value={f.chave}>
                {(f.nome || f.email || f.chave)} · {f.total}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 w-full md:w-auto md:ml-auto">
          <div className="relative flex-1 md:flex-none">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: T.faint }} />
            <input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Pesquisar por assunto…"
              className="text-[12.5px] h-10 md:h-8 pl-7 pr-2 rounded-lg outline-none w-full md:w-[220px]"
              style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineStrong}` }}
            />
          </div>
          {filtrosActivos && (
            <button
              onClick={() => { setQLocal(""); setSearchState({ janela: "14d", classe: "todas", fonte: "", q: "" }); }}
              className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-2 rounded-lg"
              style={{ color: T.danger, border: `1px solid ${T.line}` }}
              title="Limpar filtros"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {query.isLoading && (
        <div className="flex items-center gap-2 text-[13px] py-10 justify-center" style={{ color: T.muted }}>
          <Loader2 size={16} className="animate-spin" /> A carregar…
        </div>
      )}

      {query.isError && (
        <div className="rounded-[12px] p-4 text-[13px]" style={{ background: "#FEF3F2", color: T.danger, border: "1px solid #FDA29B" }}>
          Não foi possível carregar os emails. Tenta novamente daqui a pouco.
        </div>
      )}

      {!query.isLoading && !query.isError && emails.length === 0 && (
        <div className="text-[14px] py-16 text-center rounded-[14px]"
          style={{ background: T.card, border: `1px dashed ${T.lineStrong}`, color: T.muted }}>
          {filtrosActivos
            ? "Nenhum email corresponde aos filtros actuais."
            : "Ainda não chegou nenhum email. Assim que o CloudMailin encaminhar um, aparece aqui em segundos."}
        </div>
      )}

      {!query.isLoading && emails.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <aside className="rounded-[14px] overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <ul className="divide-y max-h-[72vh] overflow-auto" style={{ borderColor: T.line }}>
              {emails.map((e) => {
                const activo = e.id === seleccionadoId;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setSeleccionadoId(e.id)}
                      className="w-full text-left px-3 py-3 flex flex-col gap-1 transition-colors"
                      style={{ background: activo ? "#EEF2FF" : "transparent" }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-semibold truncate max-w-[220px]" style={{ color: T.ink }}>
                          {e.remetente_nome || e.remetente || "desconhecido"}
                        </span>
                        <span className="text-[11px] ml-auto shrink-0" style={{ color: T.faint }}>{fmtHora(e.recebido_em)}</span>
                      </div>
                      <div className="text-[12.5px] truncate" style={{ color: T.muted }}>
                        {e.assunto || "(sem assunto)"}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <BadgeClassificacao c={e.classificacao} n={e.notas_processadas} />
                        <BadgeProcessamento email={e} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="rounded-[14px] p-4 sm:p-5" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            {!seleccionado ? (
              <div className="text-[13px] py-10 text-center" style={{ color: T.muted }}>
                Selecciona um email à esquerda.
              </div>
            ) : (
              <>
                <header className="pb-3 mb-3 border-b" style={{ borderColor: T.line }}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[16px] font-semibold" style={{ color: T.ink }}>
                        {seleccionado.assunto || "(sem assunto)"}
                      </h2>
                      <div className="mt-1 text-[12.5px]" style={{ color: T.muted }}>
                        <span className="font-semibold" style={{ color: T.ink }}>
                          {seleccionado.remetente_nome || seleccionado.remetente || "desconhecido"}
                        </span>
                        {seleccionado.remetente_nome && seleccionado.remetente && (
                          <span style={{ color: T.faint }}> &lt;{seleccionado.remetente}&gt;</span>
                        )}
                        <span className="mx-2" style={{ color: T.faint }}>•</span>
                        <span>{fmtHora(seleccionado.recebido_em)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BotaoReprocessar emailId={seleccionado.id} />
                      <IconBtn title="Copiar assunto" onClick={() => navigator.clipboard.writeText(seleccionado.assunto ?? "")}>
                        <Copy size={13} />
                      </IconBtn>
                      {seleccionado.corpo_html && (
                        <IconBtn title="Abrir HTML original" onClick={() => {
                          const blob = new Blob([seleccionado.corpo_html ?? ""], { type: "text/html" });
                          window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
                        }}>
                          <ExternalLink size={13} />
                        </IconBtn>
                      )}
                      <IconBtn
                        title="Apagar email"
                        onClick={() => {
                          if (confirm("Apagar este email? Esta acção é irreversível.")) {
                            apagarM.mutate(seleccionado.id);
                          }
                        }}
                        danger
                      >
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <BadgeClassificacao c={seleccionado.classificacao} n={seleccionado.notas_processadas} />
                    <BadgeProcessamento email={seleccionado} />
                    <BreakdownExtraccao detalhe={seleccionado.classificacao_detalhe} />
                  </div>
                </header>

                <PainelNoticiasExtraidas email={seleccionado} />
                <PainelFerramentasExtraidas email={seleccionado} />


                {seleccionado.corpo_html ? (
                  <iframe
                    title={`Email ${seleccionado.id}`}
                    srcDoc={seleccionado.corpo_html}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="no-referrer"
                    className="w-full rounded-[12px]"
                    style={{ height: "70vh", background: "#fff", border: `1px solid ${T.line}` }}
                  />
                ) : seleccionado.corpo_texto ? (
                  <pre className="text-[12.5px] whitespace-pre-wrap rounded-[12px] p-3 max-h-[70vh] overflow-auto"
                    style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.ink, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {seleccionado.corpo_texto}
                  </pre>
                ) : (
                  <div className="text-[13px] py-8 text-center" style={{ color: T.faint }}>Este email não trouxe conteúdo.</div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Segment({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex max-w-full items-center gap-1" role="group" aria-label={label}>
      <span className="hidden md:inline text-[11px] uppercase tracking-wider mr-1 whitespace-nowrap" style={{ color: T.faint }}>{label}</span>
      <div className="ds-strip flex md:inline-flex max-w-full rounded-lg overflow-hidden" style={{ border: `1px solid ${T.lineStrong}` }}>
        {options.map((o) => {
          const activo = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className="text-[12px] font-semibold h-10 md:h-8 px-3 md:px-2.5 whitespace-nowrap transition-colors"
              style={{
                background: activo ? "#EEF2FF" : T.card,
                color: activo ? T.primary : T.muted,
                borderLeft: `1px solid ${T.line}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg"
      style={{ background: T.card, color: danger ? T.danger : T.muted, border: `1px solid ${T.lineStrong}` }}
    >
      {children}
    </button>
  );
}

/** Estado da leitura automática — torna visível o que antes falhava em silêncio. */
function BadgeProcessamento({ email }: { email: EmailRecebido }) {
  const estado = email.processamento_estado ?? "processado";
  if (estado === "processado") return null;
  const cfg = estado === "falhou"
    ? { cor: T.danger, texto: "Leitura falhou" }
    : estado === "a_processar"
      ? { cor: T.warn, texto: "A processar…" }
      : { cor: T.warn, texto: "Por processar" };
  const tentativas = email.processamento_tentativas ?? 0;
  return (
    <span
      title={email.processamento_erro ?? undefined}
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded w-fit"
      style={{ background: `${cfg.cor}18`, color: cfg.cor }}
    >
      <AlertTriangle size={11} /> {cfg.texto}{tentativas > 1 ? ` · ${tentativas} tentativas` : ""}
    </span>
  );
}

function BadgeClassificacao({ c, n }: { c: EmailRecebido["classificacao"]; n: number }) {
  if (c === "newsletter") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded w-fit"
        style={{ background: `${T.ok}18`, color: T.ok }}>
        <Mail size={11} /> Processado · {n} {n === 1 ? "notícia" : "notícias"}
      </span>
    );
  }
  if (c === "confirmacao") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded w-fit"
        style={{ background: `${T.warn}18`, color: T.warn }}>
        <ShieldAlert size={11} /> Ignorado — confirmação
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded w-fit"
      style={{ background: `${T.faint}22`, color: T.muted }}>
      <HelpCircle size={11} /> Não classificado
    </span>
  );
}

const ROTULO_MOTIVO: Record<string, string> = {
  fonte_inactiva: "fonte desactivada",
  sem_html: "sem corpo",
  sem_blocos: "sem blocos",
  tudo_duplicado: "tudo duplicado",
  ia_sem_resultado: "IA sem resultado",
};

function BreakdownExtraccao({ detalhe }: { detalhe: ClassificacaoDetalhe | null }) {
  if (!detalhe) return null;
  const items: { label: string; n: number; cor: string }[] = [
    { label: "blocos", n: detalhe.blocos_total ?? 0, cor: T.faint },
    { label: "destaques", n: detalhe.destaques ?? 0, cor: T.primary },
    { label: "breves", n: detalhe.breves ?? 0, cor: T.ink },
    { label: "ferramentas", n: detalhe.ferramentas ?? 0, cor: "#7C3AED" },
    { label: "links", n: detalhe.links ?? 0, cor: T.muted },
    { label: "duplicados", n: detalhe.duplicados ?? 0, cor: T.warn },
    { label: "repetições bloqueadas", n: detalhe.bloqueadas_repeticao ?? 0, cor: T.warn },
    { label: "patrocínios ignorados", n: detalhe.patrocinios_ignorados ?? 0, cor: T.warn },
    { label: "tutoriais ignorados", n: detalhe.tutoriais_ignorados ?? 0, cor: T.faint },
  ].filter((i) => i.n > 0);

  const chamadas = detalhe.chamadas_ia ?? 0;
  const motivo = detalhe.motivo_sem_resultado
    ? ROTULO_MOTIVO[detalhe.motivo_sem_resultado] ?? detalhe.motivo_sem_resultado
    : null;

  if (items.length === 0 && chamadas === 0 && !motivo) return null;

  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {items.map((i) => (
        <span key={i.label}
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${i.cor}15`, color: i.cor }}
          title={`${i.n} ${i.label}`}
        >
          {i.n} <span className="font-normal opacity-80">{i.label}</span>
        </span>
      ))}
      {chamadas > 0 && (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${T.primary}12`, color: T.primary }}
          title="Chamadas de IA usadas neste email"
        >
          {chamadas}/{detalhe.budget_ia ?? 0} <span className="font-normal opacity-80">IA</span>
        </span>
      )}
      {motivo && (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${T.danger}12`, color: T.danger }}
          title="Motivo de não terem entrado itens"
        >
          {motivo}
        </span>
      )}
      {(detalhe.descartados?.length ?? 0) > 0 && (
        <span
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: `${T.faint}18`, color: T.muted }}
          title={detalhe.descartados!
            .map((d) => `${ROTULO_DESCARTE[d.motivo] ?? d.motivo}: ${d.titulo}`)
            .join("\n")}
        >
          {detalhe.descartados!.length} <span className="font-normal opacity-80">descartados</span>
        </span>
      )}
    </div>
  );
}

const ROTULO_DESCARTE: Record<string, string> = {
  ruido: "Rodapé ou patrocínio",
  repetido_no_email: "Repetido neste email",
  assunto_repetido_no_email: "Mesmo assunto já apanhado",
};



function explicarSemResultado(d: NoticiasDoEmail, email: EmailRecebido): string {
  if (d.motivo_ignorado?.accao === "email_ignorado_confirmacao") {
    return "Este email foi ignorado por parecer uma confirmação ou opt-in.";
  }
  if (d.motivo_ignorado?.accao === "email_ignorado_duplicado") {
    return "Este email foi ignorado por já ter sido processado anteriormente.";
  }
  const nome = d.fonte?.nome ? `«${d.fonte.nome}»` : "deste remetente";
  switch (d.motivo_sem_resultado) {
    case "fonte_inactiva":
      return `A fonte ${nome} está desactivada — as notícias deste email não foram recolhidas.`;
    case "sem_html":
      return "Este email não trouxe corpo utilizável (sem HTML nem texto).";
    case "sem_blocos":
      return "A segmentação não encontrou blocos de conteúdo neste email.";
    case "tudo_duplicado":
      return "Todos os itens encontrados já existiam na base de dados.";
    case "ia_sem_resultado":
      return "Houve blocos de conteúdo, mas a IA não devolveu itens utilizáveis.";
    default:
      break;
  }
  if (d.fonte && !d.fonte.activa) {
    return `A fonte ${nome} está desactivada — as notícias deste email não foram recolhidas.`;
  }
  if (email.classificacao === "newsletter") {
    return "A IA não encontrou notícias com valor útil neste envio.";
  }
  return "Este email não foi tratado como newsletter. Podes tentar «Reprocessar» com o motor melhorado.";
}

function BotaoActivarFonte({ emailId, fonteId, nome }: { emailId: string; fonteId: string; nome: string }) {
  const { isAdmin } = useSessao();
  const activar = useServerFn(activarFonteEReprocessar);
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: () => activar({ data: { emailId, fonteId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["noticias-do-email", emailId] });
      qc.invalidateQueries({ queryKey: ["ferramentas-do-email", emailId] });
      qc.invalidateQueries({ queryKey: ["emails-recebidos"] });
    },
  });

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col gap-1 items-start">
      <button
        type="button"
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="inline-flex items-center gap-1 text-[11.5px] font-semibold h-8 px-2.5 rounded-lg"
        style={{ background: T.card, color: T.primary, border: `1px solid ${T.lineStrong}` }}
        title={`Activar a fonte «${nome}» e voltar a extrair`}
      >
        {m.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {m.isPending ? "A activar e reprocessar…" : "Activar fonte e reprocessar"}
      </button>
      {m.isError && (
        <span className="text-[11.5px]" style={{ color: T.danger }}>
          {(m.error as Error).message}
        </span>
      )}
    </div>
  );
}

function PainelNoticiasExtraidas({ email }: { email: EmailRecebido }) {

  const listar = useServerFn(listarNoticiasDoEmail);
  const q = useQuery({
    queryKey: ["noticias-do-email", email.id],
    queryFn: () => listar({ data: { emailId: email.id } }),
    staleTime: 15_000,
  });

  const [aberto, setAberto] = useState(false);

  const rotuloEstado: Record<string, { label: string; cor: string; bg: string }> = {
    pendente: { label: "Pendente", cor: T.warn, bg: `${T.warn}18` },
    aprovada: { label: "Aprovada", cor: T.ok, bg: `${T.ok}18` },
    rejeitada: { label: "Rejeitada", cor: T.danger, bg: `${T.danger}14` },
    enviada: { label: "Enviada", cor: T.primary, bg: `${T.primary}18` },
  };

  const total = q.data?.noticias.length ?? 0;

  return (
    <section
      className="mb-3 rounded-[12px]"
      style={{ background: T.shell, border: `1px solid ${T.line}` }}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
      >
        <span className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: T.ink }}>
          {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Mail size={13} /> Notícias extraídas
          <span className="text-[11.5px] font-normal ml-1" style={{ color: T.faint }}>
            · {q.isLoading ? "…" : `${total} ${total === 1 ? "item" : "itens"}`}
          </span>
        </span>
        {q.isLoading && <Loader2 size={12} className="animate-spin" style={{ color: T.faint }} />}
      </button>

      {aberto && (
        <div className="px-3 pb-3">
          {q.data && total === 0 && (
            <div className="text-[12.5px] flex flex-col gap-2" style={{ color: T.muted }}>
              <div>{explicarSemResultado(q.data, email)}</div>
              {q.data.fonte && !q.data.fonte.activa && (
                <BotaoActivarFonte emailId={email.id} fonteId={q.data.fonte.id} nome={q.data.fonte.nome} />
              )}
            </div>
          )}


          {q.data && total > 0 && (
            <ul className="flex flex-col gap-1.5">
              {q.data.noticias.map((n) => {
                const est = n.estado ? rotuloEstado[n.estado] : null;
                const destino = `/?destacar=${n.id}`;
                return (
                  <li
                    key={n.id}
                    className="rounded-[10px] p-2.5 flex items-start gap-2"
                    style={{ background: T.card, border: `1px solid ${T.line}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold leading-snug" style={{ color: T.ink }}>
                        {n.titulo || "(sem título)"}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]" style={{ color: T.faint }}>
                        {est && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: est.bg, color: est.cor }}>
                            {est.label}
                          </span>
                        )}
                        {n.categoria && <span>· {n.categoria}</span>}
                        {n.edicao_numero != null && <span>· Ed. {n.edicao_numero}</span>}
                        {n.destaque && <span style={{ color: T.warn }}>· ★ destaque</span>}
                      </div>
                    </div>
                    <a
                      href={destino}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold h-7 px-2 rounded shrink-0"
                      style={{ color: T.primary, border: `1px solid ${T.line}` }}
                      title="Abrir no editor"
                    >
                      <ExternalLink size={11} /> Abrir
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function PainelFerramentasExtraidas({ email }: { email: EmailRecebido }) {
  const listar = useServerFn(listarFerramentasDoEmail);
  const q = useQuery({
    queryKey: ["ferramentas-do-email", email.id],
    queryFn: () => listar({ data: { emailId: email.id } }),
    staleTime: 15_000,
  });
  const [aberto, setAberto] = useState(false);
  const ferramentas: FerramentaSugerida[] = q.data ?? [];
  const total = ferramentas.length;
  if (!q.isLoading && total === 0) return null;

  return (
    <section
      className="mb-3 rounded-[12px]"
      style={{ background: T.shell, border: `1px solid ${T.line}` }}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 text-left"
      >
        <span className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: T.ink }}>
          {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Wrench size={13} /> Ferramentas sugeridas
          <span className="text-[11.5px] font-normal ml-1" style={{ color: T.faint }}>
            · {q.isLoading ? "…" : `${total} ${total === 1 ? "item" : "itens"}`}
          </span>
        </span>
        <a
          href="/ferramentas"
          className="text-[11.5px] font-semibold hover:underline"
          style={{ color: T.primary }}
          onClick={(e) => e.stopPropagation()}
        >
          Ver diretório →
        </a>
      </button>
      {aberto && total > 0 && (
        <ul className="flex flex-col gap-1.5 px-3 pb-3">
          {ferramentas.map((f) => (
            <li key={f.id} className="rounded-[10px] p-2.5 flex items-start gap-2"
              style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: T.ink }}>{f.nome}</div>
                {f.descricao && (
                  <div className="text-[12px] mt-0.5" style={{ color: T.muted }}>{f.descricao}</div>
                )}
                <div className="mt-1 text-[11px]" style={{ color: T.faint }}>
                  {f.categoria && <span>{f.categoria} · </span>}
                  <span className="uppercase font-semibold">{f.estado}</span>
                </div>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold h-7 px-2 rounded shrink-0"
                style={{ color: T.primary, border: `1px solid ${T.line}` }}>
                <ExternalLink size={11} /> Abrir
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BotaoReprocessar({ emailId }: { emailId: string }) {
  const { isAdmin } = useSessao();
  const reprocessar = useServerFn(reprocessarEmail);
  const qc = useQueryClient();
  const [resultado, setResultado] = useState<{ n: number; f: number; formato: string } | null>(null);

  const m = useMutation({
    mutationFn: () => reprocessar({ data: { id: emailId } }),
    onSuccess: (r) => {
      setResultado({ n: r.noticias_inseridas, f: r.ferramentas_inseridas, formato: r.formato });
      qc.invalidateQueries({ queryKey: ["noticias-do-email", emailId] });
      qc.invalidateQueries({ queryKey: ["ferramentas-do-email", emailId] });
      qc.invalidateQueries({ queryKey: ["emails-recebidos"] });
      setTimeout(() => setResultado(null), 4000);
    },
  });

  if (!isAdmin) return null;

  if (resultado) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold h-8 px-2 rounded-lg"
        style={{ background: `${T.ok}18`, color: T.ok }}>
        <Sparkles size={11} /> +{resultado.n} notícias · +{resultado.f} ferramentas ({resultado.formato})
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => m.mutate()}
      disabled={m.isPending}
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold h-8 px-2.5 rounded-lg"
      style={{ background: T.card, color: T.primary, border: `1px solid ${T.lineStrong}` }}
      title="Voltar a extrair conteúdo com o motor melhorado"
    >
      {m.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
      {m.isPending ? "A reprocessar…" : "Reprocessar"}
    </button>
  );
}


/** True when no email arrived for more than two days (or never). */
export function atrasoEmails(ultimo: string | null, agora: number = Date.now()): boolean {
  if (!ultimo) return true;
  return agora - Date.parse(ultimo) > 2 * 24 * 60 * 60 * 1000;
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
}
