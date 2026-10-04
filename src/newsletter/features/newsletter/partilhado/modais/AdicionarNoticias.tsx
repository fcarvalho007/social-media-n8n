// Modal «Adicionar notícias» — extraído do Editor Clássico sem alterar
// comportamento. É montado pelos dois editores (Clássico e Revista).
//
// Mantém tudo o que existia: separador Colar/Manual, fila de blocos com até
// 3 chamadas de IA em paralelo, ecrã de revisão com avisos de duplicado,
// detalhe da extracção, ecrã final e entrada manual (com opção de admin
// «adicionar directamente à edição»).

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import { AlertTriangle, Check, ChevronDown, Loader2, Sparkles, X } from "lucide-react";
import { extrairNoticias, confirmarNoticias } from "@/newsletter/lib/processar-noticias.functions";
import {
  adicionarManual, registarAudit, verificarDuplicado, type CatId,
} from "../../data";
import { T, categorias, catDe } from "../ui";
import { ModalBase } from "./ModalBase";

type AvisoRepeticaoUI = { titulo: string; edicao_numero: number | null; score: number };
type ItemRever = {
  id: string; titulo: string; descricao: string; url: string; categoria: CatId;
  avisoRepeticao?: AvisoRepeticaoUI | null; lote?: number;
};
type MetaExtracao = {
  duplicadas: number; ignoradas: number; fallbacks?: number; aviso?: string | null; modo?: string;
  diagnostico?: Array<{ ordem: number; preview: string; estado: "extraida" | "duplicada" | "sem_url" | "ia_vazia" | "ia_erro" | "fallback" | "ruido"; motivo?: string; url?: string }>;
};
type LoteColar = {
  id: number; ordem: number; texto: string; urlManual?: string;
  estado: "espera" | "processando" | "pronto" | "erro" | "vazio"; erro?: string; total: number;
};

export interface AdicionarNoticiasProps {
  edicaoId: string | null;
  isAdmin: boolean;
  nomeExibicao: string;
  notify: (m: string, opts?: { tipo?: "ok" | "erro" }) => void;
  onFechar: () => void;
  /** Ids inseridos agora — o editor pode destacá-los na lista de pendentes. */
  onNovosPendentes?: (ids: string[]) => void;
  /** Levar o utilizador até à secção de pendentes depois de fechar. */
  onVerPendentes?: () => void;
}

export function AdicionarNoticias({
  edicaoId, isAdmin, nomeExibicao, notify, onFechar, onNovosPendentes, onVerPendentes,
}: AdicionarNoticiasProps) {
  const qc = useQueryClient();

  const [abaAdicionar, setAbaAdicionar] = useState<"colar" | "manual">("colar");
  const [directoNaEdicao, setDirectoNaEdicao] = useState(false);
  const [colarTexto, setColarTexto] = useState("");
  const [colarUrlManual, setColarUrlManual] = useState("");
  const [colarUrlOpen, setColarUrlOpen] = useState(false);
  const [colarErro, setColarErro] = useState<string | null>(null);
  const [colarFase, setColarFase] = useState<"colar" | "rever" | "concluido">("colar");
  const [itensRever, setItensRever] = useState<ItemRever[]>([]);
  const [metaExtracao, setMetaExtracao] = useState<MetaExtracao | null>(null);
  const [lotes, setLotes] = useState<LoteColar[]>([]);
  const loteSeqRef = useRef(0);
  const lotesArrancadosRef = useRef<Set<number>>(new Set());
  const [diagAberto, setDiagAberto] = useState(false);
  const [confirmarLoading, setConfirmarLoading] = useState(false);
  const [ultimaAdicao, setUltimaAdicao] = useState<{ quantidade: number; duplicadas: number; detalhe?: string[] } | null>(null);
  const [nova, setNova] = useState<{ titulo: string; descricao: string; url: string; categoria: CatId }>({ titulo: "", descricao: "", url: "", categoria: "ia" });

  const invalidateAudit = () => qc.invalidateQueries({ queryKey: ["audit"] });
  const invalidateNoticias = () => {
    qc.invalidateQueries({ queryKey: ["pendentes"] });
    qc.invalidateQueries({ queryKey: ["fontes-contagem-30d"] });
    if (edicaoId) {
      qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] });
      qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] });
    }
  };

  const extrairNoticiasFn = useServerFn(extrairNoticias);
  const confirmarNoticiasFn = useServerFn(confirmarNoticias);

  const adicionarM = useMutation({
    mutationFn: async () => {
      if (!edicaoId) throw new Error("Sem edição");
      const modo: "pendente" | "aprovada" = isAdmin && directoNaEdicao ? "aprovada" : "pendente";
      const dup = await verificarDuplicado({ url: nova.url, titulo: nova.titulo, categoria: nova.categoria });
      if (dup) {
        const avancar = window.confirm(`${dup.descricao}\n\nQueres adicionar mesmo assim?`);
        if (!avancar) throw new Error("__cancelado__");
      }
      await adicionarManual(
        edicaoId,
        { titulo: nova.titulo, descricao: nova.descricao, url: nova.url, categoria: nova.categoria },
        { modo },
      );
      await registarAudit(
        nomeExibicao,
        modo === "aprovada" ? "Adicionou manualmente à edição" : "Adicionou manualmente à fila",
      );
      return modo;
    },
    onError: (e) => {
      if ((e as Error)?.message === "__cancelado__") return;
      notify((e as Error)?.message || "Não foi possível adicionar a notícia.", { tipo: "erro" });
    },
    onSuccess: (modo) => {
      invalidateNoticias(); invalidateAudit();
      setNova({ titulo: "", descricao: "", url: "", categoria: "ia" });
      setDirectoNaEdicao(false);
      onFechar();
      notify(modo === "aprovada" ? "Notícia adicionada à edição" : "Notícia adicionada à fila de pendentes");
    },
  });

  // Agendador da fila de blocos colados: mantém até 3 chamadas de IA em paralelo.
  useEffect(() => {
    const emCurso = lotes.filter((l) => l.estado === "processando").length;
    const seguintes = lotes.filter((l) => l.estado === "espera" && !lotesArrancadosRef.current.has(l.id));
    const arrancar = seguintes.slice(0, Math.max(0, 3 - emCurso));
    if (arrancar.length === 0) return;

    for (const lote of arrancar) {
      lotesArrancadosRef.current.add(lote.id);
      setLotes((arr) => arr.map((x) => (x.id === lote.id ? { ...x, estado: "processando" as const, erro: undefined } : x)));

      void (async () => {
        try {
          const r = await extrairNoticiasFn({ data: { texto: lote.texto, url_manual: lote.urlManual } });
          if (!r || r.ok === false) {
            const msg = (r && r.mensagem) || "Não foi possível processar este bloco.";
            setLotes((arr) => arr.map((x) => (x.id === lote.id ? { ...x, estado: "erro" as const, erro: msg } : x)));
            return;
          }
          const brutos = Array.isArray(r.itens) ? r.itens : [];
          const meta: MetaExtracao = {
            duplicadas: r.duplicadas ?? 0,
            ignoradas: r.ignoradas ?? 0,
            fallbacks: r.fallbacks ?? 0,
            aviso: r.aviso ?? null,
            modo: typeof r.modo === "string" ? r.modo : undefined,
            diagnostico: Array.isArray(r.diagnostico) ? r.diagnostico : undefined,
          };
          setMetaExtracao((prev) => ({
            duplicadas: (prev?.duplicadas ?? 0) + meta.duplicadas,
            ignoradas: (prev?.ignoradas ?? 0) + meta.ignoradas,
            fallbacks: (prev?.fallbacks ?? 0) + (meta.fallbacks ?? 0),
            aviso: meta.aviso ?? prev?.aviso ?? null,
            modo: prev?.modo ?? meta.modo,
            diagnostico: [...(prev?.diagnostico ?? []), ...(meta.diagnostico ?? [])],
          }));

          if (brutos.length === 0) {
            setLotes((arr) => arr.map((x) => (x.id === lote.id
              ? { ...x, estado: "vazio" as const, total: 0, erro: meta.duplicadas > 0 ? `${meta.duplicadas} já existia(m) na base.` : "Nenhuma notícia detectada — verifica se há URL." }
              : x)));
            return;
          }

          const novos: ItemRever[] = (brutos as Array<{ titulo: string; descricao: string; url: string; categoria: string; avisoRepeticao?: AvisoRepeticaoUI | null }>)
            .map((i, idx) => ({
              id: `${lote.id}-${idx}-${Date.now()}`,
              titulo: i.titulo,
              descricao: i.descricao,
              url: i.url,
              categoria: (categorias.find((c) => c.id === i.categoria)?.id ?? "ia") as CatId,
              avisoRepeticao: i.avisoRepeticao ?? null,
              lote: lote.ordem,
            }));
          setItensRever((arr) => [...arr, ...novos]);
          setLotes((arr) => arr.map((x) => (x.id === lote.id ? { ...x, estado: "pronto" as const, total: novos.length } : x)));
        } catch (e) {
          const msg = (e as Error)?.message || "Erro inesperado ao contactar o servidor.";
          setLotes((arr) => arr.map((x) => (x.id === lote.id ? { ...x, estado: "erro" as const, erro: msg } : x)));
        }
      })();
    }
  }, [lotes, extrairNoticiasFn]);

  const haBlocosActivos = () => lotes.some((l) => l.estado === "processando" || l.estado === "espera");

  return (
    <ModalBase
      size="lg"
      onClose={() => {
        if (confirmarLoading) return;
        if (haBlocosActivos()
          && !window.confirm("Há blocos ainda a processar. Se fechares, esse trabalho é descartado. Fechar mesmo assim?")) return;
        onFechar();
      }}
      titulo="Adicionar notícias">

      {/* Pill switcher — só na fase colar */}
      {colarFase === "colar" && (
        <>
          <div className="flex items-center gap-1 p-1 mb-3 rounded-full" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            {([
              ["colar", "✨ Colar texto"],
              ["manual", "✍️ Manual"],
            ] as const).map(([id, label]) => {
              const activo = abaAdicionar === id;
              return (
                <button key={id} onClick={() => setAbaAdicionar(id)}
                  className="flex-1 text-xs font-semibold px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  style={activo
                    ? { background: T.primary, color: "#fff", boxShadow: "0 1px 2px rgba(16,24,40,0.08)" }
                    : { background: "transparent", color: T.muted }}>
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[12.5px] leading-relaxed mb-4" style={{ color: T.muted }}>
            As notícias entram na <strong style={{ color: T.ink }}>fila de aprovação</strong> — vais poder editar título, descrição ou link antes de as aprovares.
          </p>
        </>
      )}

      {/* Breadcrumb — fase rever */}
      {colarFase !== "colar" && abaAdicionar === "colar" && (
        <div className="flex items-center justify-between mb-4 text-xs font-semibold" style={{ color: T.muted }}>
          <div className="flex items-center gap-1.5">
            <span style={{ color: T.muted }}>Colar</span>
            <ChevronDown size={12} className="-rotate-90" />
            <span style={{ color: colarFase === "rever" ? T.ink : T.muted }}>Rever</span>
          </div>
          {colarFase === "rever" && (
            <button onClick={() => setColarFase("colar")}
              className="text-xs font-semibold px-2.5 py-1 rounded-md" style={{ color: T.primary }}>
              ← Colar mais um bloco
            </button>
          )}
        </div>
      )}

      <div key={`${abaAdicionar}-${colarFase}`} className="transition-opacity duration-200">

        {/* ─── COLAR · fase COLAR ─── */}
        {abaAdicionar === "colar" && colarFase === "colar" && (
          <>
            {lotes.length > 0 && (
              <div className="mb-3 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.shell }}>
                <ul className="divide-y" style={{ borderColor: T.line }}>
                  {lotes.map((l) => {
                    const cor =
                      l.estado === "pronto" ? { bg: "rgba(16,185,129,0.12)", ink: "#047857", label: `${l.total} ${l.total === 1 ? "notícia pronta" : "notícias prontas"}` }
                      : l.estado === "erro" ? { bg: "rgba(239,68,68,0.10)", ink: "#B91C1C", label: "Erro" }
                      : l.estado === "vazio" ? { bg: "rgba(107,114,128,0.14)", ink: "#374151", label: "Nada novo" }
                      : l.estado === "processando" ? { bg: "rgba(139,92,246,0.12)", ink: "#6D28D9", label: "A processar…" }
                      : { bg: "rgba(107,114,128,0.10)", ink: "#4B5563", label: "Em espera" };
                    return (
                      <li key={l.id} className="px-3 py-2 flex items-start gap-2.5">
                        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                          style={{ background: T.card, color: T.muted, border: `1px solid ${T.line}` }}>Bloco {l.ordem}</span>
                        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 inline-flex items-center gap-1"
                          style={{ background: cor.bg, color: cor.ink }}>
                          {l.estado === "processando" && <Loader2 size={10} className="animate-spin" />}
                          {cor.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] truncate" style={{ color: T.ink }}>{l.texto.replace(/\s+/g, " ").slice(0, 90)}</p>
                          {l.erro && <p className="text-[11px] mt-0.5" style={{ color: T.danger }}>{l.erro}</p>}
                        </div>
                        {l.estado === "erro" && (
                          <button
                            onClick={() => {
                              lotesArrancadosRef.current.delete(l.id);
                              setLotes((arr) => arr.map((x) => (x.id === l.id ? { ...x, estado: "espera", erro: undefined } : x)));
                            }}
                            className="text-[11.5px] font-semibold shrink-0" style={{ color: T.primary }}>
                            Tentar de novo
                          </button>
                        )}
                        {(l.estado === "erro" || l.estado === "vazio" || l.estado === "pronto") && (
                          <button onClick={() => setLotes((arr) => arr.filter((x) => x.id !== l.id))}
                            className="shrink-0" style={{ color: T.muted }} aria-label="Remover bloco da lista">
                            <X size={13} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <textarea
              autoFocus
              value={colarTexto}
              onChange={(e) => setColarTexto(e.target.value)}
              rows={10}
              placeholder="Cola uma notícia ou várias — do WhatsApp, de um site, de onde for. A IA identifica o título, a descrição, a categoria e o link de cada uma."
              className="w-full text-sm rounded-lg px-3.5 py-2.5 resize-y focus:outline-none"
              style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink, minHeight: 220 }}
            />
            <div className="flex items-center gap-1.5 mt-2.5 text-xs" style={{ color: T.muted }}>
              <Sparkles size={12} style={{ color: T.primary }} />
              <span>A IA processa em segundo plano — podes colar o bloco seguinte sem esperar</span>
            </div>

            <div className="mt-3">
              {!colarUrlOpen ? (
                <button onClick={() => setColarUrlOpen(true)}
                  className="text-xs font-semibold flex items-center gap-1" style={{ color: T.primary }}>
                  + Já tenho o link
                </button>
              ) : (
                <div className="anim-rise">
                  <label className="block text-xs font-semibold mb-1" style={{ color: T.muted }}>
                    URL da notícia (opcional)
                  </label>
                  <input
                    type="url"
                    value={colarUrlManual}
                    onChange={(e) => setColarUrlManual(e.target.value)}
                    placeholder="https://exemplo.com/artigo"
                    className="w-full text-sm rounded-lg px-3.5 py-2 focus:outline-none"
                    style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
                  />
                </div>
              )}
            </div>

            {colarErro && (
              <div className="mt-3 px-3.5 py-2.5 rounded-lg text-sm" style={{ background: T.dangerSoft, color: T.danger }}>
                ✕ {colarErro}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-5">
              <button
                onClick={() => {
                  if (haBlocosActivos()
                    && !window.confirm("Há blocos ainda a processar. Se fechares, esse trabalho é descartado. Fechar mesmo assim?")) return;
                  onFechar();
                }}
                className="text-sm font-medium px-4 py-2 rounded-lg"
                style={{ color: T.muted }}>
                Cancelar
              </button>
              {itensRever.length > 0 && (
                <button
                  onClick={() => setColarFase("rever")}
                  className="text-sm font-bold px-4 py-2 rounded-lg"
                  style={{ background: T.shell, color: T.ink, border: `1px solid ${T.lineStrong}` }}>
                  Rever {itensRever.length} {itensRever.length === 1 ? "notícia" : "notícias"}
                </button>
              )}
              <button
                onClick={() => {
                  const texto = colarTexto.trim();
                  if (texto.length < 3) return;
                  setColarErro(null);
                  loteSeqRef.current += 1;
                  const id = loteSeqRef.current;
                  setLotes((arr) => [...arr, {
                    id,
                    ordem: arr.length + 1,
                    texto,
                    urlManual: colarUrlManual.trim() || undefined,
                    estado: "espera",
                    total: 0,
                  }]);
                  setColarTexto("");
                  setColarUrlManual("");
                  setColarUrlOpen(false);
                }}
                disabled={colarTexto.trim().length < 3}
                className="text-sm font-bold px-4 py-2 rounded-lg text-white ds-gradient disabled:opacity-50 flex items-center justify-center gap-2">
                <Sparkles size={14} />
                Processar bloco
              </button>
            </div>
          </>
        )}

        {/* ─── COLAR · fase REVER ─── */}
        {abaAdicionar === "colar" && colarFase === "rever" && (
          <>
            <div className="mb-3">
              <p className="text-sm font-bold" style={{ color: T.ink }}>
                {itensRever.length} {itensRever.length === 1 ? "notícia detectada" : "notícias detectadas"}
              </p>
              {haBlocosActivos() && (
                <p className="text-xs mt-1 inline-flex items-center gap-1.5" style={{ color: T.primary }}>
                  <Loader2 size={11} className="animate-spin" />
                  Ainda há blocos a processar — as notícias aparecem aqui assim que ficarem prontas
                </p>
              )}
              {metaExtracao && (metaExtracao.duplicadas > 0 || metaExtracao.ignoradas > 0) && (
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                  {metaExtracao.duplicadas > 0 && <>{metaExtracao.duplicadas} duplicada(s) já existia(m) na base</>}
                  {metaExtracao.duplicadas > 0 && metaExtracao.ignoradas > 0 && " · "}
                  {metaExtracao.ignoradas > 0 && <>{metaExtracao.ignoradas} ignorada(s) — sem link válido</>}
                </p>
              )}
              {metaExtracao?.aviso && (
                <p className="text-xs mt-2 px-2.5 py-1.5 rounded-md inline-flex items-start gap-1.5"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#B45309", border: "1px solid rgba(245,158,11,0.35)" }}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  <span>{metaExtracao.aviso}</span>
                </p>
              )}
              {metaExtracao?.diagnostico && metaExtracao.diagnostico.length > 0 && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setDiagAberto((v) => !v)}
                    className="text-[11.5px] font-semibold inline-flex items-center gap-1"
                    style={{ color: T.primary }}>
                    <ChevronDown size={12} className={`transition-transform ${diagAberto ? "" : "-rotate-90"}`} />
                    {diagAberto ? "Ocultar" : "Ver"} detalhe da extracção ({metaExtracao.diagnostico.length} blocos{metaExtracao.modo ? ` · ${metaExtracao.modo === "whatsapp" ? "WhatsApp exportado" : metaExtracao.modo === "whatsapp_copiado" ? "WhatsApp copiado" : "texto genérico"}` : ""})
                  </button>
                  {diagAberto && (
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: `1px solid ${T.line}`, background: T.shell }}>
                      <ul className="divide-y" style={{ borderColor: T.line }}>
                        {metaExtracao.diagnostico.map((d) => {
                          const cor =
                            d.estado === "extraida" ? { bg: "rgba(16,185,129,0.12)", ink: "#047857", label: "Extraída" }
                            : d.estado === "fallback" ? { bg: "rgba(245,158,11,0.14)", ink: "#B45309", label: "Fallback" }
                            : d.estado === "duplicada" ? { bg: "rgba(107,114,128,0.14)", ink: "#374151", label: "Duplicada" }
                            : d.estado === "ruido" ? { bg: "rgba(107,114,128,0.14)", ink: "#374151", label: "Sem interesse" }
                            : d.estado === "sem_url" ? { bg: "rgba(239,68,68,0.10)", ink: "#B91C1C", label: "Sem URL" }
                            : d.estado === "ia_erro" ? { bg: "rgba(239,68,68,0.10)", ink: "#B91C1C", label: "Erro IA" }
                            : { bg: "rgba(239,68,68,0.10)", ink: "#B91C1C", label: "IA vazia" };
                          return (
                            <li key={d.ordem} className="px-2.5 py-2 flex items-start gap-2.5">
                              <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: T.card, color: T.muted, border: `1px solid ${T.line}` }}>#{d.ordem}</span>
                              <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: cor.bg, color: cor.ink }}>{cor.label}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] truncate" style={{ color: T.ink }}>{d.preview}</p>
                                {d.motivo && <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>{d.motivo}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
              {(() => {
                const AMBAR = "#F59E0B";
                const AMBAR_INK = "#B45309";
                const AMBAR_BG = "rgba(245,158,11,0.04)";
                const AMBAR_BORDER = "rgba(245,158,11,0.55)";
                const AMBAR_INPUT = "rgba(245,158,11,0.6)";
                const semDados = (v: string) => !v || !v.trim() || v.trim().toLowerCase() === "sem dados";
                const urlMa = (v: string) => !v || !/^https?:\/\//i.test(v.trim());
                const analisar = (it: ItemRever) => {
                  const faltas: string[] = [];
                  if (semDados(it.titulo)) faltas.push("Título em falta");
                  if (semDados(it.descricao)) faltas.push("Descrição em falta");
                  if (urlMa(it.url)) faltas.push("Sem URL");
                  return { faltas, tituloMa: semDados(it.titulo), descMa: semDados(it.descricao), urlMa: urlMa(it.url) };
                };
                const ordenados = itensRever
                  .map((it, idx) => ({ it, idx, meta: analisar(it) }))
                  .sort((a, b) => (b.meta.faltas.length > 0 ? 1 : 0) - (a.meta.faltas.length > 0 ? 1 : 0));
                return ordenados.map(({ it, idx, meta }) => {
                  const cat = catDe(it.categoria);
                  const upd = (patch: Partial<ItemRever>) =>
                    setItensRever((arr) => arr.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
                  const incompleto = meta.faltas.length > 0;
                  return (
                    <div key={it.id} className="rounded-lg p-3"
                      style={{
                        background: incompleto ? AMBAR_BG : T.card,
                        border: `${incompleto ? 1.5 : 1}px solid ${incompleto ? AMBAR_BORDER : T.line}`,
                      }}>
                      <div className="flex items-center gap-2 mb-2">
                        <select value={it.categoria}
                          onChange={(e) => upd({ categoria: e.target.value as CatId })}
                          className="text-[11px] font-bold uppercase tracking-wide rounded-md px-2 py-1 focus:outline-none"
                          style={{ background: `${cat.cor}15`, color: cat.cor, border: `1px solid ${cat.cor}30` }}>
                          {categorias.map((c) => <option key={c.id} value={c.id}>{c.curto}</option>)}
                        </select>
                        {typeof it.lote === "number" && (
                          <span className="text-[10.5px] font-bold px-1.5 py-1 rounded-md shrink-0"
                            style={{ background: T.shell, color: T.muted, border: `1px solid ${T.line}` }}>
                            Bloco {it.lote}
                          </span>
                        )}
                        {incompleto && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-md px-1.5 py-1"
                            style={{ background: "rgba(245,158,11,0.12)", color: AMBAR_INK, border: `1px solid ${AMBAR}55` }}>
                            <AlertTriangle size={11} />
                            {meta.faltas.join(" · ")}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button onClick={() => setItensRever((arr) => arr.filter((_, i) => i !== idx))}
                          className="p-1 rounded-md hover:bg-black/5" style={{ color: T.muted }} title="Remover">
                          <X size={14} />
                        </button>
                      </div>
                      {it.avisoRepeticao && (
                        <div className="mb-2 rounded-md px-2.5 py-1.5 flex items-start gap-1.5"
                          style={{ background: "rgba(245,158,11,0.12)", border: `1px solid ${AMBAR}55` }}>
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: AMBAR_INK }} />
                          <p className="text-[11.5px] leading-snug" style={{ color: AMBAR_INK }}>
                            Possível repetição de «{it.avisoRepeticao.titulo}»
                            {it.avisoRepeticao.edicao_numero ? ` — edição #${it.avisoRepeticao.edicao_numero}` : ""}. Confirma antes de aprovar.
                          </p>
                        </div>
                      )}
                      <input value={it.titulo}
                        onChange={(e) => upd({ titulo: e.target.value })}
                        className="w-full text-sm font-bold rounded-md px-2.5 py-1.5 mb-1.5 focus:outline-none"
                        style={{ border: `1px solid ${meta.tituloMa ? AMBAR_INPUT : T.lineStrong}`, background: T.shell, color: T.ink }} />
                      <textarea value={it.descricao}
                        onChange={(e) => upd({ descricao: e.target.value })}
                        rows={2}
                        className="w-full text-xs rounded-md px-2.5 py-1.5 resize-y focus:outline-none"
                        style={{ border: `1px solid ${meta.descMa ? AMBAR_INPUT : T.lineStrong}`, background: T.shell, color: T.ink }} />
                      {meta.urlMa ? (
                        <input value={it.url}
                          onChange={(e) => upd({ url: e.target.value })}
                          placeholder="https://…"
                          className="w-full mt-1.5 text-[11px] rounded-md px-2 py-1 focus:outline-none"
                          style={{ border: `1px solid ${AMBAR_INPUT}`, background: T.shell, color: T.ink }} />
                      ) : (
                        <a href={it.url} target="_blank" rel="noreferrer"
                          className="block mt-1.5 text-[11px] truncate hover:underline" style={{ color: T.muted }}>
                          {it.url}
                        </a>
                      )}
                    </div>
                  );
                });
              })()}
              {itensRever.length === 0 && (
                <div className="py-8 text-center text-sm" style={{ color: T.muted }}>
                  Removeste todos os itens. <button className="font-semibold underline" style={{ color: T.primary }}
                    onClick={() => { setColarFase("colar"); }}>Voltar a colar</button>.
                </div>
              )}
            </div>

            {colarErro && (
              <div className="mt-3 px-3.5 py-2.5 rounded-lg text-sm" style={{ background: T.dangerSoft, color: T.danger }}>
                ✕ {colarErro}
              </div>
            )}

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => { setColarFase("colar"); setColarErro(null); }}
                disabled={confirmarLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ color: T.muted }}>
                Colar mais um bloco
              </button>
              <button
                onClick={async () => {
                  if (itensRever.length === 0 || confirmarLoading) return;
                  setConfirmarLoading(true);
                  setColarErro(null);
                  try {
                    const r = await confirmarNoticiasFn({
                      data: {
                        itens: itensRever.map((i) => ({
                          titulo: i.titulo, descricao: i.descricao, url: i.url, categoria: i.categoria,
                        })),
                      },
                    });
                    if (!r || r.ok === false) {
                      setColarErro((r && r.mensagem) || "Não foi possível adicionar à fila.");
                    } else {
                      const q = Number(r.quantidade ?? 0);
                      const dup = Number(r.duplicadas ?? 0);
                      const ids: string[] = Array.isArray(r.ids)
                        ? r.ids.filter((v: unknown): v is string => typeof v === "string")
                        : [];
                      if (q > 0) {
                        setColarTexto("");
                        setColarUrlManual("");
                        setColarUrlOpen(false);
                        setItensRever([]);
                        setMetaExtracao(null);
                        setLotes((arr) => arr.filter((l) => l.estado === "processando" || l.estado === "espera"));
                        setUltimaAdicao({
                          quantidade: q,
                          duplicadas: dup,
                          detalhe: Array.isArray(r.duplicadas_detalhe)
                            ? r.duplicadas_detalhe.filter((v: unknown): v is string => typeof v === "string")
                            : [],
                        });
                        if (ids.length > 0) onNovosPendentes?.(ids);
                        setColarFase("concluido");
                        await qc.invalidateQueries({ queryKey: ["pendentes"] });
                        invalidateAudit();
                      } else {
                        await qc.invalidateQueries({ queryKey: ["pendentes"] });
                        invalidateAudit();
                        notify(dup > 0 ? `${dup} duplicada(s) — nada novo adicionado.` : "Nada adicionado.");
                      }
                    }
                  } catch (e) {
                    setColarErro((e as Error)?.message || "Erro inesperado ao contactar o servidor.");
                  } finally {
                    setConfirmarLoading(false);
                  }
                }}
                disabled={confirmarLoading || itensRever.length === 0}
                className="text-sm font-bold px-4 py-2 rounded-lg text-white ds-gradient disabled:opacity-50 flex items-center gap-2">
                {confirmarLoading && <Loader2 size={14} className="animate-spin" />}
                {confirmarLoading ? "A adicionar…" : `Enviar ${itensRever.length} para aprovação`}
              </button>
            </div>
          </>
        )}

        {/* ─── COLAR · fase CONCLUIDO ─── */}
        {abaAdicionar === "colar" && colarFase === "concluido" && ultimaAdicao && (
          <div className="py-8 sm:py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: "#ECFDF5", border: "2px solid #10B981" }}>
              <Check size={30} strokeWidth={3} style={{ color: "#059669" }} />
            </div>
            <p className="text-[18px] font-display font-bold mb-1" style={{ color: T.ink }}>
              {ultimaAdicao.quantidade} {ultimaAdicao.quantidade === 1 ? "notícia enviada" : "notícias enviadas"} para aprovação
            </p>
            <p className="text-[13px] mb-1 max-w-[380px]" style={{ color: T.muted }}>
              Aparecem na secção <strong style={{ color: T.ink }}>«Pendentes de aprovação»</strong>. Podes editar título, descrição, link ou categoria antes de as aprovares.
            </p>
            {ultimaAdicao.duplicadas > 0 && (
              <div className="mt-2 w-full max-w-[420px] text-left rounded-lg px-3 py-2"
                style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)" }}>
                <p className="text-[12px] font-bold" style={{ color: "#B45309" }}>
                  {ultimaAdicao.duplicadas} duplicada{ultimaAdicao.duplicadas === 1 ? "" : "s"} ignorada{ultimaAdicao.duplicadas === 1 ? "" : "s"}
                </p>
                {(ultimaAdicao.detalhe ?? []).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {(ultimaAdicao.detalhe ?? []).map((d, i) => (
                      <li key={i} className="text-[11.5px]" style={{ color: T.muted }}>· {d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6 w-full max-w-[380px]">
              <button
                onClick={() => { setColarFase("colar"); setUltimaAdicao(null); }}
                className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg"
                style={{ background: T.shell, color: T.ink, border: `1px solid ${T.line}` }}>
                Adicionar mais
              </button>
              <button
                onClick={() => { onFechar(); onVerPendentes?.(); }}
                className="flex-1 text-sm font-bold px-4 py-2.5 rounded-lg text-white ds-gradient flex items-center justify-center gap-2">
                Ver pendentes <ChevronDown size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}

        {/* ─── MANUAL ─── */}
        {abaAdicionar === "manual" && (
          <>
            {isAdmin && (
              <div className="mb-3 rounded-lg px-3 py-2.5" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
                <label className="flex items-start gap-2.5 cursor-pointer"
                  title="Só recomendado quando já sabes exactamente o que queres publicar.">
                  <input type="checkbox" checked={directoNaEdicao}
                    onChange={(e) => setDirectoNaEdicao(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-current"
                    style={{ accentColor: T.primary }} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold" style={{ color: T.ink }}>
                      Adicionar directamente à edição (sem passar por pendentes)
                    </span>
                    <span className="block text-[11px] mt-0.5" style={{ color: T.faint }}>
                      Só recomendado quando já sabes exactamente o que queres publicar. Notícias vindas da IA passam sempre por pendentes.
                    </span>
                  </span>
                </label>
              </div>
            )}
            <p className="text-sm mb-3" style={{ color: T.muted }}>
              {isAdmin && directoNaEdicao
                ? "A notícia entra directamente na edição actual."
                : "A notícia entra na fila de pendentes para revisão."}
            </p>
            <div className="space-y-3">
              <input placeholder="Título" value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })}
                className="w-full text-sm rounded-lg px-3.5 py-2.5 focus:outline-none" style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
              <textarea placeholder="Descrição" rows={3} value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })}
                className="w-full text-sm rounded-lg px-3.5 py-2.5 resize-y focus:outline-none" style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
              <input placeholder="URL da notícia" value={nova.url} onChange={(e) => setNova({ ...nova, url: e.target.value })}
                className="w-full text-sm rounded-lg px-3.5 py-2.5 focus:outline-none" style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
              <select value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value as CatId })}
                className="w-full text-sm rounded-lg px-3.5 py-2.5 focus:outline-none" style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onFechar} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: T.muted }}>Cancelar</button>
              <button onClick={() => adicionarM.mutate()} disabled={!nova.titulo.trim() || adicionarM.isPending}
                className="text-sm font-bold px-4 py-2 rounded-lg text-white ds-gradient disabled:opacity-50">
                {isAdmin && directoNaEdicao ? "Adicionar à edição" : "Adicionar à fila"}
              </button>
            </div>
          </>
        )}

      </div>
    </ModalBase>
  );
}
