import { createFileRoute, useNavigate } from "@/newsletter/shim/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Inbox, Eye, Copy, Check, X, Mail, FileText, Newspaper, Loader2, RotateCcw, ExternalLink, Search, CalendarDays,
} from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { previewEdicaoFn } from "@/newsletter/lib/envio.functions";

import {
  listarEnviadas,
  listarCronicasEnviadas,
  listarNoticiasArquivo,
  recuperarNoticiaRejeitada,
  registarAudit,
  stripLeadingEmoji,
  type EdicaoEnviadaRow,
  type CronicaArquivo,
  type NoticiaArquivo,
} from "@/newsletter/features/newsletter/data";
import { PesquisaGlobal } from "@/newsletter/features/shared/PesquisaGlobal";

const TITLE = "Arquivo · DIGITAL SPRINT";
const DESCRIPTION = "Histórico de edições enviadas, crónicas publicadas e notícias arquivadas.";

const searchSchema = z.object({
  tab: fallback(z.string(), "edicoes").default("edicoes"),
  sub: z.enum(["utilizadas", "rejeitadas"]).optional(),
  q: z.string().optional(),
});

type Tab = "edicoes" | "cronicas" | "noticias";
type SubNoticias = "utilizadas" | "rejeitadas";
type Periodo = "tudo" | "30d" | "90d" | "180d" | "ano" | "anoAnt";

const PERIODOS: Array<{ id: Periodo; label: string }> = [
  { id: "tudo", label: "Todo o tempo" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "180d", label: "Últimos 6 meses" },
  { id: "ano", label: "Este ano" },
  { id: "anoAnt", label: "Ano anterior" },
];

export const Route = createFileRoute("/_authenticated/arquivo")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArquivoPage,
});

/* ─── Utilitários ─── */

function fmtData(iso: string | null | undefined, comHora = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizar(v: string | null | undefined): string {
  if (!v) return "";
  return v.toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function periodoInclui(iso: string | null | undefined, p: Periodo): boolean {
  if (p === "tudo") return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const agora = new Date();
  if (p === "30d" || p === "90d" || p === "180d") {
    const dias = p === "30d" ? 30 : p === "90d" ? 90 : 180;
    const diff = (agora.getTime() - d.getTime()) / 86_400_000;
    return diff >= 0 && diff <= dias;
  }
  if (p === "ano") return d.getFullYear() === agora.getFullYear();
  if (p === "anoAnt") return d.getFullYear() === agora.getFullYear() - 1;
  return true;
}

interface Snap { destaques?: unknown[]; newsletter?: unknown[]; site?: unknown[]; listas?: Array<{ nome?: string }> }

/* ─── Página ─── */

function ArquivoPage() {
  const { tab: tabRaw, sub: subRaw, q: qInicial } = Route.useSearch();
  const navigate = useNavigate();
  const tab: Tab = (["edicoes", "cronicas", "noticias"].includes(tabRaw) ? tabRaw : "edicoes") as Tab;

  const qEdicoes = useQuery({ queryKey: ["arquivo", "edicoes"], queryFn: listarEnviadas });
  const qCronicas = useQuery({ queryKey: ["arquivo", "cronicas"], queryFn: listarCronicasEnviadas });
  const qUtilizadas = useQuery({
    queryKey: ["arquivo", "noticias", "utilizadas"],
    queryFn: () => listarNoticiasArquivo("enviada"),
  });
  const qRejeitadas = useQuery({
    queryKey: ["arquivo", "noticias", "rejeitadas"],
    queryFn: () => listarNoticiasArquivo("rejeitada"),
  });

  const nUtilizadas = qUtilizadas.data?.length ?? 0;
  const nRejeitadas = qRejeitadas.data?.length ?? 0;

  // Sub-separador efectivo: respeita o URL; se ausente, escolhe automaticamente
  // «Rejeitadas» quando não há utilizadas mas existem rejeitadas.
  const sub: SubNoticias = subRaw
    ?? (qUtilizadas.isSuccess && qRejeitadas.isSuccess && nUtilizadas === 0 && nRejeitadas > 0
      ? "rejeitadas"
      : "utilizadas");

  const qNoticias = sub === "utilizadas" ? qUtilizadas : qRejeitadas;

  const setTab = (t: Tab) => navigate({ to: "/arquivo", search: { tab: t, sub: subRaw, q: qInicial } as never, replace: true });
  const setSub = (s: SubNoticias) => navigate({ to: "/arquivo", search: { tab: "noticias", sub: s, q: qInicial } as never, replace: true });

  const totalNoticias = qUtilizadas.isSuccess && qRejeitadas.isSuccess ? nUtilizadas + nRejeitadas : undefined;
  const tabs: Array<{ id: Tab; label: string; icon: typeof Mail; n: number | undefined }> = [
    { id: "edicoes", label: "Edições enviadas", icon: Mail, n: qEdicoes.data?.length },
    { id: "cronicas", label: "Crónicas", icon: FileText, n: qCronicas.data?.length },
    { id: "noticias", label: "Notícias", icon: Newspaper, n: totalNoticias },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: "#F7F8FA", color: "#101828" }}>
      <main className="px-4 md:px-8 py-6 max-w-[1200px] mx-auto">
        {tab === "edicoes" && (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: "#14142B", border: "1px solid rgba(255,255,255,0.08)" }}>
            <PesquisaGlobal
              ambitoInicial="enviadas"
              queryInicial={qInicial ?? ""}
              onAbrirEdicao={(r) => {
                const el = r.edicao_id ? document.getElementById(`ed-${r.edicao_id}`) : null;
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.animate(
                    [{ boxShadow: "0 0 0 3px rgba(79,70,229,0.55)" }, { boxShadow: "0 0 0 0 rgba(79,70,229,0)" }],
                    { duration: 1800, easing: "ease-out" },
                  );
                }
                navigate({ to: "/arquivo", search: { tab: "edicoes", sub } as never, replace: true });
              }}
              onAbrirNoEditor={() => navigate({ to: "/" })}
            />
          </div>
        )}


        {/* Separadores principais */}
        <div role="tablist" className="ds-strip flex md:inline-flex rounded-xl p-1 mb-5 max-w-full" style={{ background: "#FFFFFF", border: "1px solid #E4E7EC" }}>
          {tabs.map((t) => {
            const activo = tab === t.id;
            const Ico = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={activo}
                type="button"
                onClick={() => setTab(t.id)}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-all"
                style={{
                  background: activo ? "linear-gradient(135deg,#6366F1,#8B5CF6)" : "transparent",
                  color: activo ? "#FFFFFF" : "#475467",
                  boxShadow: activo ? "0 1px 3px rgba(99,102,241,0.35)" : undefined,
                }}
              >
                <Ico size={14} strokeWidth={2} />
                {t.label}
                {typeof t.n === "number" && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: activo ? "rgba(255,255,255,0.22)" : "#F2F4F7", color: activo ? "#FFFFFF" : "#667085" }}>
                    {t.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === "edicoes" && <PainelEdicoes q={qEdicoes} />}
        {tab === "cronicas" && <PainelCronicas q={qCronicas} />}
        {tab === "noticias" && <PainelNoticias q={qNoticias} sub={sub} setSub={setSub} nUtilizadas={nUtilizadas} nRejeitadas={nRejeitadas} />}
      </main>
    </div>
  );
}

/* ─── Barra de filtros comum ─── */

function FiltroBarra({
  placeholder, valor, onValor, periodo, onPeriodo, total, totalFiltrado, sufixoUnidade, extra,
}: {
  placeholder: string;
  valor: string;
  onValor: (v: string) => void;
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  total: number;
  totalFiltrado: number;
  sufixoUnidade: [string, string];
  extra?: React.ReactNode;
}) {
  const filtrando = valor.trim().length > 0 || periodo !== "tudo";
  return (
    <div
      className="rounded-xl p-2 mb-4 flex flex-wrap items-center gap-2"
      style={{ background: "#FFFFFF", border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}
    >
      <div className="relative flex-1 min-w-[220px]">
        <Search size={14} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#98A2B3" }} />
        <input
          type="text"
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") onValor(""); }}
          placeholder={placeholder}
          className="w-full h-9 pl-8 pr-8 rounded-lg text-[13px] outline-none"
          style={{ background: "#F9FAFB", border: "1px solid #EAECF0", color: "#101828" }}
        />
        {valor && (
          <button
            type="button"
            onClick={() => onValor("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-[#F2F4F7]"
            style={{ color: "#667085" }}
            aria-label="Limpar pesquisa"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg" style={{ background: "#F9FAFB", border: "1px solid #EAECF0" }}>
        <CalendarDays size={13} strokeWidth={2} style={{ color: "#667085" }} />
        <select
          value={periodo}
          onChange={(e) => onPeriodo(e.target.value as Periodo)}
          className="bg-transparent text-[12px] font-medium outline-none"
          style={{ color: "#475467" }}
        >
          {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {extra}

      <span className="ml-auto text-[11px] font-medium px-2" style={{ color: "#98A2B3" }}>
        {filtrando
          ? `${totalFiltrado} de ${total} ${totalFiltrado === 1 ? sufixoUnidade[0] : sufixoUnidade[1]}`
          : `${total} ${total === 1 ? sufixoUnidade[0] : sufixoUnidade[1]}`}
      </span>
    </div>
  );
}

/* ─── Painel: Edições ─── */

function PainelEdicoes({ q }: { q: ReturnType<typeof useQuery<EdicaoEnviadaRow[]>> }) {
  const [preview, setPreview] = useState<{ id: string; numero: number } | null>(null);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const linhas = q.data ?? [];

  const filtradas = useMemo(() => {
    const t = normalizar(busca);
    return linhas.filter((r) => {
      if (!periodoInclui(r.enviada_em, periodo)) return false;
      if (!t) return true;
      const alvo = `#${r.numero} ${normalizar(r.assunto)}`;
      return alvo.includes(t);
    });
  }, [linhas, busca, periodo]);

  if (q.isLoading) return <Estado texto="A carregar…" />;
  if (q.error) return <Estado texto="Não foi possível carregar as edições." erro />;

  return (
    <>
      <FiltroBarra
        placeholder="Pesquisar por número ou assunto…"
        valor={busca}
        onValor={setBusca}
        periodo={periodo}
        onPeriodo={setPeriodo}
        total={linhas.length}
        totalFiltrado={filtradas.length}
        sufixoUnidade={["edição", "edições"]}
      />

      {linhas.length === 0 && <Vazio icon={Mail} texto="Ainda não enviaste nenhuma edição." />}
      {linhas.length > 0 && filtradas.length === 0 && (
        <Vazio icon={Search} texto="Nenhuma edição corresponde aos filtros actuais." />
      )}

      {filtradas.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}>
          <ul>
            {filtradas.map((row, idx) => {
              const snap = (row.snapshot_envio ?? null) as Snap | null;
              const d = snap?.destaques?.length ?? null;
              const n = snap?.newsletter?.length ?? null;
              const s = snap?.site?.length ?? null;
              const listas = (snap?.listas ?? []).map((l) => l?.nome).filter(Boolean) as string[];
              return (
                <li key={row.id} id={`ed-${row.id}`} className="px-5 py-4 flex flex-wrap items-center gap-3 transition-colors hover:bg-[#FAFBFC]" style={idx > 0 ? { borderTop: "1px solid #F2F4F7" } : undefined}>
                  <span className="font-display font-bold text-base tabular-nums" style={{ color: "#4F46E5", minWidth: 60 }}>#{row.numero}</span>
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[14px] font-semibold truncate" title={row.assunto ?? ""}>{row.assunto || "—"}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#667085" }}>
                      Enviada em {fmtData(row.enviada_em)}
                      {listas.length > 0 && <> · {listas.join(" · ")}</>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip label={`⭐ ${d ?? "—"}`} bg="#FFFAEB" fg="#B54708" />
                    <Chip label={`News ${n ?? "—"}`} bg="#EEF2FF" fg="#4F46E5" />
                    <Chip label={`Site ${s ?? "—"}`} bg="#F2F4F7" fg="#667085" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BotaoCopiar texto={row.assunto ?? ""} titulo="Copiar assunto" />
                    <button
                      type="button"
                      onClick={() => setPreview({ id: row.id, numero: row.numero })}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all hover:shadow-sm"
                      style={{ background: "#FFFFFF", color: "#0F172A", border: "1px solid #E4E7EC" }}
                    >
                      <Eye size={13} strokeWidth={2} /> Pré-visualizar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {preview && (
        <ModalPreviewEdicao edicaoId={preview.id} numero={preview.numero} onClose={() => setPreview(null)} />
      )}
    </>
  );
}

/* ─── Painel: Crónicas ─── */

function PainelCronicas({ q }: { q: ReturnType<typeof useQuery<CronicaArquivo[]>> }) {
  const [aberta, setAberta] = useState<CronicaArquivo | null>(null);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const linhas = q.data ?? [];

  const filtradas = useMemo(() => {
    const t = normalizar(busca);
    return linhas.filter((c) => {
      if (!periodoInclui(c.edicao?.enviada_em, periodo)) return false;
      if (!t) return true;
      const alvo = `${normalizar(c.titulo)} ${normalizar(stripHtml(c.conteudo_html || c.conteudo))}`;
      return alvo.includes(t);
    });
  }, [linhas, busca, periodo]);

  if (q.isLoading) return <Estado texto="A carregar…" />;
  if (q.error) return <Estado texto="Não foi possível carregar as crónicas." erro />;

  return (
    <>
      <FiltroBarra
        placeholder="Pesquisar em títulos e texto das crónicas…"
        valor={busca}
        onValor={setBusca}
        periodo={periodo}
        onPeriodo={setPeriodo}
        total={linhas.length}
        totalFiltrado={filtradas.length}
        sufixoUnidade={["crónica", "crónicas"]}
      />

      {linhas.length === 0 && <Vazio icon={FileText} texto="Ainda não há crónicas publicadas." />}
      {linhas.length > 0 && filtradas.length === 0 && (
        <Vazio icon={Search} texto="Nenhuma crónica corresponde aos filtros actuais." />
      )}

      {filtradas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtradas.map((c) => {
            const excerto = stripHtml(c.conteudo_html || c.conteudo).slice(0, 220);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setAberta(c)}
                className="text-left rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
                style={{ background: "#FFFFFF", border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,0.04)" }}
              >
                <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#4F46E5" }}>
                  <FileText size={12} strokeWidth={2} />
                  Edição #{c.edicao?.numero ?? "—"} · {fmtData(c.edicao?.enviada_em, false)}
                </div>
                <h3 className="font-display text-[17px] font-bold leading-snug mb-1.5" style={{ color: "#101828" }}>
                  {c.titulo || "Crónica sem título"}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#667085" }}>
                  {excerto}{excerto.length >= 220 ? "…" : ""}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {aberta && <ModalCronica cronica={aberta} onClose={() => setAberta(null)} />}
    </>
  );
}

/* ─── Painel: Notícias ─── */

function PainelNoticias({ q, sub, setSub, nUtilizadas, nRejeitadas }: { q: ReturnType<typeof useQuery<NoticiaArquivo[]>>; sub: SubNoticias; setSub: (s: SubNoticias) => void; nUtilizadas: number; nRejeitadas: number }) {
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const qc = useQueryClient();
  const linhas = q.data ?? [];

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const n of linhas) if (n.categoria) set.add(n.categoria);
    return Array.from(set).sort();
  }, [linhas]);

  const filtradas = useMemo(() => {
    const t = normalizar(busca);
    return linhas.filter((n) => {
      if (filtroCat !== "todas" && n.categoria !== filtroCat) return false;
      const dataRef = sub === "utilizadas" ? n.edicao?.enviada_em : n.updated_at;
      if (!periodoInclui(dataRef, periodo)) return false;
      if (!t) return true;
      const alvo = `${normalizar(n.titulo)} ${normalizar(n.descricao)} ${normalizar(n.url)}`;
      return alvo.includes(t);
    });
  }, [linhas, filtroCat, busca, periodo, sub]);

  const recuperar = async (n: NoticiaArquivo) => {
    if (sub === "utilizadas") {
      const numero = n.edicao?.numero;
      const msg = numero != null
        ? `Recuperar esta notícia envia-a de volta para Pendentes e desassocia-a da edição #${numero} já enviada.\n\nConfirmar?`
        : "Recuperar esta notícia envia-a de volta para Pendentes.\n\nConfirmar?";
      if (!window.confirm(msg)) return;
    }
    await recuperarNoticiaRejeitada(n.id);
    await registarAudit("sistema", "noticia_recuperada", { id: n.id, origem: sub, edicao_numero: n.edicao?.numero ?? null });
    await qc.invalidateQueries({ queryKey: ["arquivo", "noticias", sub] });
  };

  const catExtra = categorias.length > 0 ? (
    <div className="inline-flex items-center h-9 px-2.5 rounded-lg" style={{ background: "#F9FAFB", border: "1px solid #EAECF0" }}>
      <select
        value={filtroCat}
        onChange={(e) => setFiltroCat(e.target.value)}
        className="bg-transparent text-[12px] font-medium outline-none"
        style={{ color: "#475467" }}
      >
        <option value="todas">Todas as categorias</option>
        {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  ) : null;

  return (
    <div>
      {/* Sub-separadores */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div role="tablist" className="inline-flex rounded-lg p-0.5" style={{ background: "#FFFFFF", border: "1px solid #E4E7EC" }}>
          {(["utilizadas", "rejeitadas"] as const).map((s) => {
            const activo = sub === s;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={activo}
                type="button"
                onClick={() => setSub(s)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition-colors"
                style={{
                  background: activo ? (s === "utilizadas" ? "#ECFDF3" : "#FEF3F2") : "transparent",
                  color: activo ? (s === "utilizadas" ? "#067647" : "#B42318") : "#667085",
                }}
              >
                {s === "utilizadas" ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                {s === "utilizadas" ? "Utilizadas" : "Rejeitadas"}
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{
                  background: activo ? "rgba(255,255,255,0.6)" : "#F2F4F7",
                  color: activo ? (s === "utilizadas" ? "#067647" : "#B42318") : "#667085",
                }}>
                  {s === "utilizadas" ? nUtilizadas : nRejeitadas}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <FiltroBarra
        placeholder="Pesquisar em títulos, descrições e URLs…"
        valor={busca}
        onValor={setBusca}
        periodo={periodo}
        onPeriodo={setPeriodo}
        total={linhas.length}
        totalFiltrado={filtradas.length}
        sufixoUnidade={["notícia", "notícias"]}
        extra={catExtra}
      />

      {q.isLoading && <Estado texto="A carregar…" />}
      {q.error && <Estado texto="Não foi possível carregar as notícias." erro />}
      {!q.isLoading && linhas.length === 0 && (
        <Vazio
          icon={sub === "utilizadas" ? Check : X}
          texto={sub === "utilizadas" ? "Ainda não há notícias utilizadas em edições enviadas." : "Nenhuma notícia rejeitada."}
        />
      )}
      {!q.isLoading && linhas.length > 0 && filtradas.length === 0 && (
        <Vazio icon={Search} texto="Nenhuma notícia corresponde aos filtros actuais." />
      )}

      {filtradas.length > 0 && (
        <ul className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((n) => {
            const utilizada = sub === "utilizadas";
            const dataIso = utilizada ? n.edicao?.enviada_em : n.updated_at;
            const hostname = (() => {
              if (!n.url) return null;
              try { return new URL(n.url).hostname.replace(/^www\./, ""); } catch { return n.url; }
            })();
            return (
              <li
                key={n.id}
                className="rounded-2xl p-5 flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "#FFFFFF", border: "1px solid #E4E7EC", boxShadow: "0 1px 2px rgba(16,24,40,0.03)" }}
              >
                {/* Cabeçalho: categoria + estado */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <ChipCategoria label={n.categoria} />
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                    style={{
                      background: utilizada ? "#ECFDF3" : "#FEF3F2",
                      color: utilizada ? "#067647" : "#B42318",
                    }}
                  >
                    {utilizada
                      ? <><Check size={11} strokeWidth={2.5} />Edição #{n.edicao?.numero ?? "—"}</>
                      : <><X size={11} strokeWidth={2.5} />Rejeitada</>}
                  </span>
                </div>

                {/* Data */}
                <div className="flex items-center gap-1.5 text-[11.5px] mb-3" style={{ color: "#98A2B3" }}>
                  <CalendarDays size={12} strokeWidth={2} />
                  <span>{utilizada ? "Enviada a" : "Rejeitada a"} {fmtData(dataIso, false)}</span>
                </div>

                {/* Título */}
                <p
                  className="text-[15px] font-semibold leading-snug mb-1.5"
                  style={{ color: "#101828", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {stripLeadingEmoji(n.titulo)}
                </p>

                {/* Descrição */}
                {n.descricao && (
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "#667085", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  >
                    {n.descricao}
                  </p>
                )}

                {/* URL (rodapé antes das acções) */}
                {hostname && (
                  <a
                    href={n.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={n.url ?? undefined}
                    className="inline-flex items-center gap-1 mt-3 text-[11.5px] font-medium truncate max-w-full"
                    style={{ color: "#4F46E5" }}
                  >
                    <ExternalLink size={11} strokeWidth={2} />
                    <span className="truncate">{hostname}</span>
                  </a>
                )}

                {/* Acções sempre visíveis */}
                <div className="mt-auto pt-3 flex items-center gap-1.5" style={{ borderTop: "1px solid #F2F4F7", marginTop: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => recuperar(n)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-semibold transition-all hover:shadow-sm"
                    style={{ background: "#EEF4FF", color: "#3538CD", border: "1px solid #C7D7FE" }}
                    title={utilizada ? "Voltar a colocar em Pendentes (desassocia da edição enviada)" : "Voltar a colocar em Pendentes"}
                  >
                    <RotateCcw size={13} strokeWidth={2} /> Recuperar
                  </button>
                  {n.url && <BotaoCopiar texto={n.url} titulo="Copiar URL" />}
                  {n.url && (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir link original"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all hover:shadow-sm"
                      style={{ background: "#FFFFFF", color: "#475467", border: "1px solid #E4E7EC" }}
                    >
                      <ExternalLink size={13} strokeWidth={2} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

    </div>
  );
}

/* ─── Componentes auxiliares ─── */

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap" style={{ background: bg, color: fg }}>{label}</span>;
}

const CORES_CATEGORIA: Record<string, { bg: string; fg: string }> = {
  IA: { bg: "#EEF2FF", fg: "#4F46E5" },
  Tecnologia: { bg: "#ECFDF3", fg: "#067647" },
  Negócio: { bg: "#FEF3F2", fg: "#B42318" },
  Ferramentas: { bg: "#FFFAEB", fg: "#B54708" },
  Ciência: { bg: "#F0F9FF", fg: "#026AA2" },
  Cultura: { bg: "#FDF4FF", fg: "#9F1AB1" },
};

function ChipCategoria({ label }: { label: string }) {
  const cores = CORES_CATEGORIA[label] ?? { bg: "#F2F4F7", fg: "#475467" };
  return (
    <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: cores.bg, color: cores.fg }}>
      {label}
    </span>
  );
}

function Estado({ texto, erro = false }: { texto: string; erro?: boolean }) {
  return <p className="text-sm text-center py-10" style={{ color: erro ? "#B42318" : "#98A2B3" }}>{texto}</p>;
}

function Vazio({ texto, icon: Icon = Inbox }: { texto: string; icon?: typeof Inbox }) {
  return (
    <div className="rounded-2xl p-10 text-center" style={{ background: "#FFFFFF", border: "1px solid #E4E7EC" }}>
      <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: "#F9FAFB", color: "#98A2B3", border: "1px solid #E4E7EC" }}>
        <Icon size={20} />
      </div>
      <p className="text-sm" style={{ color: "#667085" }}>{texto}</p>
    </div>
  );
}

function BotaoCopiar({ texto, titulo }: { texto: string; titulo: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title={titulo}
      onClick={async () => {
        if (!texto) return;
        try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1400); } catch { /* noop */ }
      }}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all hover:shadow-sm"
      style={{ background: "#FFFFFF", color: ok ? "#067647" : "#475467", border: "1px solid #E4E7EC" }}
    >
      {ok ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
    </button>
  );
}

/* ─── Modais ─── */

function ModalBase({ titulo, onClose, children, larguraMax = 960 }: { titulo: string; onClose: () => void; children: React.ReactNode; larguraMax?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div
        className="rounded-2xl w-full flex flex-col overflow-hidden"
        style={{ background: "#FFFFFF", maxWidth: larguraMax, maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid #E4E7EC" }}>
          <h3 className="font-display font-bold text-[15px] flex-1 truncate">{titulo}</h3>
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-[#F2F4F7]" style={{ color: "#475467" }} aria-label="Fechar">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

function ModalPreviewEdicao({ edicaoId, numero, onClose }: { edicaoId: string; numero: number; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["arquivo", "preview-edicao", edicaoId],
    queryFn: async () => {
      const p = await previewEdicaoFn({ data: { edicao_id: edicaoId, destino: "email" } });
      if (!p?.ok || !p.html) throw new Error("Resposta inválida da pré-visualização");
      return p.html;

    },
    staleTime: 5 * 60_000,
  });

  return (
    <ModalBase titulo={`Pré-visualização · Edição #${numero}`} onClose={onClose}>
      <div style={{ background: "#EEF1F5", minHeight: 300 }}>
        {q.isLoading && (
          <div className="flex items-center justify-center py-16" style={{ color: "#94A3B8" }}>
            <Loader2 size={20} className="animate-spin mr-2" /> A gerar pré-visualização…
          </div>
        )}
        {q.error && (
          <div className="p-6 text-sm" style={{ color: "#B42318" }}>Erro: {(q.error as Error).message}</div>
        )}
        {q.data && (
          <iframe
            title={`Edição #${numero}`}
            srcDoc={q.data}
            sandbox="allow-same-origin allow-popups"
            style={{ width: "100%", height: "70vh", border: 0, display: "block", background: "#EEF1F5" }}
          />
        )}
      </div>
    </ModalBase>
  );
}

function ModalCronica({ cronica, onClose }: { cronica: CronicaArquivo; onClose: () => void }) {
  const html = cronica.conteudo_html || (cronica.conteudo ? `<p>${cronica.conteudo.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>")}</p>` : "");
  return (
    <ModalBase titulo={cronica.titulo || "Crónica"} onClose={onClose} larguraMax={760}>
      <div className="px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-4" style={{ color: "#4F46E5" }}>
          Edição #{cronica.edicao?.numero ?? "—"} · {fmtData(cronica.edicao?.enviada_em, false)}
        </p>
        <div
          className="prose prose-slate max-w-none text-[16px] leading-[1.7]"
          style={{ color: "#101828" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {cronica.leituras_recomendadas && (
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid #E4E7EC" }}>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#667085" }}>Leituras recomendadas</p>
            <div className="text-[14px] space-y-1.5" style={{ color: "#4F46E5", lineHeight: 1.7 }}>
              {cronica.leituras_recomendadas.split("\n").map((l) => l.trim()).filter(Boolean).map((l, i) => {
                const md = l.match(/^\[(.+?)\]\((https?:\/\/\S+?)\)\s*$/);
                if (md) return (
                  <div key={i}>
                    <a href={md[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-semibold hover:opacity-80">{md[1]}</a>
                  </div>
                );
                const misto = l.match(/^(.+?)\s*[\-—–:|]\s*(https?:\/\/\S+)\s*$/);
                if (misto) return (
                  <div key={i}>
                    <a href={misto[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-semibold hover:opacity-80">{misto[1].trim()}</a>
                  </div>
                );
                const u = l.match(/^(https?:\/\/\S+)\s*$/);
                if (u) return (
                  <div key={i}>
                    <a href={u[1]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-semibold hover:opacity-80 break-all">{u[1]}</a>
                  </div>
                );
                return <div key={i} style={{ color: "#475467" }}>{l}</div>;
              })}
            </div>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
