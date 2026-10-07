// Modal «Fontes de curadoria IA» — extraído do Editor Clássico sem alterar
// comportamento. Montado pelos dois editores; a curadoria é comum aos dois
// formatos (mesma tabela, mesmas queries, mesmas acções).

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import {
  AlertTriangle, Check, Globe, Loader2, Lock, Mail, Pencil, Play, Plus, Power, RefreshCw, Rss, Search, TestTube2, Trash2, X,
} from "lucide-react";
import {
  listarFontes, criarFonte, alternarFonteActiva, apagarFonte, actualizarFonte, actualizarFocaFerramentas,
  listarEstatisticasFontes, getCuradoriaConfig, setCuradoriaMax, setCuradoriaTecto, getUltimaCorridaCuradoria,
  contarNoticiasPorFonte30d, registarAudit,
} from "../../data";
import { testarFeed, correrCuradoriaAgora, descobrirFeed, correrFonteAgora, alternarFontesEmLote } from "@/newsletter/lib/curadoria.functions";
import { EmptyState, T } from "../ui";
import { ModalBase } from "./ModalBase";

export interface FontesProps {
  isAdmin: boolean;
  nomeExibicao: string;
  notify: (m: string, opts?: { tipo?: "ok" | "erro" }) => void;
  onFechar: () => void;
  embutido?: boolean;
}

export function Fontes({ isAdmin, nomeExibicao, notify, onFechar, embutido = false }: FontesProps) {
  const qc = useQueryClient();
  const invalidateAudit = () => qc.invalidateQueries({ queryKey: ["audit"] });

  const fontesQ = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  const fontesContagemQ = useQuery({ queryKey: ["fontes-contagem-30d"], queryFn: contarNoticiasPorFonte30d });
  const fontesStatsQ = useQuery({ queryKey: ["fontes-stats-30d"], queryFn: listarEstatisticasFontes });
  const curadoriaConfigQ = useQuery({ queryKey: ["curadoria-config"], queryFn: getCuradoriaConfig });
  const ultimaCorridaQ = useQuery({ queryKey: ["curadoria-ultima-corrida"], queryFn: getUltimaCorridaCuradoria });

  const fontes = fontesQ.data ?? [];
  const contagemFontes30d = fontesContagemQ.data ?? {};
  const statsFontes = fontesStatsQ.data ?? {};
  const curadoriaConfig = curadoriaConfigQ.data;

  const [novaFonte, setNovaFonte] = useState({ nome: "", url_feed: "" });
  const [testeNovaFonte, setTesteNovaFonte] = useState<null | { ok: boolean; total: number; ultimos: Array<{ titulo: string; url: string; publicado: number }>; erro?: string }>(null);
  const [testeFontes, setTesteFontes] = useState<Record<string, { ok: boolean; total: number; ultimos: Array<{ titulo: string; url: string; publicado: number }>; erro?: string }>>({});
  const [editandoFonte, setEditandoFonte] = useState<Record<string, { nome: string; url_feed: string }>>({});
  const [urlSite, setUrlSite] = useState("");
  const [descoberta, setDescoberta] = useState<null | { ok: boolean; erro?: string; nomeSugerido: string; candidatos: Array<{ url: string; titulo: string; total: number; tipo?: "rss" | "html" }> }>(null);
  const [mostrarAdd, setMostrarAdd] = useState(false);
  const [modoAdd, setModoAdd] = useState<"rss_html" | "newsletter">("rss_html");
  const [novoEmailFonte, setNovoEmailFonte] = useState("");
  const [novoNomeFonte, setNovoNomeFonte] = useState("");
  const [filtroTipoFonte, setFiltroTipoFonte] = useState<"todas" | "rss" | "html" | "newsletter" | "directorio_ferramentas">("todas");
  const [fonteMax, setFonteMax] = useState<number | null>(null);
  const [maxSaved, setMaxSaved] = useState(false);
  const [confirmarLote, setConfirmarLote] = useState(false);
  type ResFonte =
    | { tipo: "sucesso"; inseridas: number; candidatos: number; ms: number }
    | { tipo: "erro"; msg: string };
  const [resultadosFontes, setResultadosFontes] = useState<Record<string, ResFonte>>({});

  useEffect(() => {
    if (curadoriaConfig && fonteMax === null) setFonteMax(curadoriaConfig.max_insercoes_por_corrida);
  }, [curadoriaConfig, fonteMax]);

  const criarFonteM = useMutation({
    mutationFn: async (args?: { nome?: string; url_feed?: string; tipo?: "rss" | "html" | "newsletter"; url_listagem?: string; remetente_email?: string }) => {
      const nome = (args?.nome ?? novaFonte.nome).trim();
      const url_feed = (args?.url_feed ?? novaFonte.url_feed).trim();
      if (!nome) return;
      await criarFonte(nome, url_feed, { tipo: args?.tipo, url_listagem: args?.url_listagem, remetente_email: args?.remetente_email });
      const rotulo = args?.tipo === "html" ? " (extracção HTML)" : args?.tipo === "newsletter" ? " (newsletter por email)" : "";
      await registarAudit(nomeExibicao, `Adicionou fonte «${nome}»${rotulo}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fontes"] }); invalidateAudit(); setNovaFonte({ nome: "", url_feed: "" }); setTesteNovaFonte(null); notify("Fonte adicionada à curadoria IA"); },
  });
  const toggleFonte = useMutation({
    mutationFn: (args: { id: string; activa: boolean }) => alternarFonteActiva(args.id, args.activa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fontes"] }),
  });
  const toggleFocaFerramentas = useMutation({
    mutationFn: (args: { id: string; foca: boolean }) => actualizarFocaFerramentas(args.id, args.foca),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fontes"] }),
  });
  const removerFonte = useMutation({
    mutationFn: (id: string) => apagarFonte(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fontes"] }),
  });
  const actualizarFonteM = useMutation({
    mutationFn: (args: { id: string; nome: string; url_feed: string }) =>
      actualizarFonte(args.id, { nome: args.nome, url_feed: args.url_feed }),
    onSuccess: (_d, args) => {
      qc.invalidateQueries({ queryKey: ["fontes"] });
      setEditandoFonte((s) => { const c = { ...s }; delete c[args.id]; return c; });
      notify("Fonte actualizada");
    },
  });
  const testarFeedFn = useServerFn(testarFeed);
  const testarFonteM = useMutation({
    mutationFn: async (args: { id: string | "nova"; url: string }) => {
      const r = await testarFeedFn({ data: { url: args.url } });
      return { id: args.id, r };
    },
    onSuccess: ({ id, r }) => {
      if (id === "nova") setTesteNovaFonte(r);
      else setTesteFontes((s) => ({ ...s, [id]: r }));
    },
    onError: (e: unknown, args) => {
      const erro = { ok: false, total: 0, ultimos: [], erro: (e as Error).message };
      if (args.id === "nova") setTesteNovaFonte(erro);
      else setTesteFontes((s) => ({ ...s, [args.id]: erro }));
    },
  });
  const descobrirFeedFn = useServerFn(descobrirFeed);
  const descobrirM = useMutation({
    mutationFn: async (url: string) => await descobrirFeedFn({ data: { url } }),
    onSuccess: (r) => setDescoberta(r),
    onError: (e: unknown) => setDescoberta({ ok: false, erro: (e as Error).message, nomeSugerido: "", candidatos: [] }),
  });
  const correrCuradoriaFn = useServerFn(correrCuradoriaAgora);
  const correrCuradoriaM = useMutation({
    mutationFn: () => correrCuradoriaFn(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["fontes"] });
      qc.invalidateQueries({ queryKey: ["fontes-contagem-30d"] });
      qc.invalidateQueries({ queryKey: ["fontes-stats-30d"] });
      qc.invalidateQueries({ queryKey: ["pendentes"] });
      invalidateAudit();
      notify(`Curadoria: ${r.inseridas} sugestões novas de ${r.fontes_activas} fonte(s)`);
    },
    onError: (e: unknown) => notify(`Curadoria falhou: ${(e as Error).message}`, { tipo: "erro" }),
  });
  const setMaxM = useMutation({
    mutationFn: (n: number) => setCuradoriaMax(n),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curadoria-config"] });
      setMaxSaved(true);
      window.setTimeout(() => setMaxSaved(false), 1600);
    },
  });
  const setTectoM = useMutation({
    mutationFn: (v: { campo: "max_por_email" | "max_por_dia" | "max_por_dia_email"; valor: number }) =>
      setCuradoriaTecto(v.campo, v.valor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curadoria-config"] });
      setMaxSaved(true);
      window.setTimeout(() => setMaxSaved(false), 1600);
    },
  });
  const correrFonteFn = useServerFn(correrFonteAgora);
  const correrFonteM = useMutation({
    mutationFn: async (id: string) => {
      const t0 = Date.now();
      const r = await correrFonteFn({ data: { id } });
      return { id, r: { ...r, ms: Date.now() - t0 } };
    },
    onSuccess: ({ id, r }) => {
      setResultadosFontes((s) => ({
        ...s,
        [id]: { tipo: "sucesso", inseridas: r.inseridas ?? 0, candidatos: (r as { candidatos?: number }).candidatos ?? 0, ms: (r as { ms: number }).ms },
      }));
      qc.invalidateQueries({ queryKey: ["fontes"] });
      qc.invalidateQueries({ queryKey: ["fontes-contagem-30d"] });
      qc.invalidateQueries({ queryKey: ["fontes-stats-30d"] });
      qc.invalidateQueries({ queryKey: ["pendentes"] });
      invalidateAudit();
    },
    onError: (e: unknown, id) => {
      setResultadosFontes((s) => ({ ...s, [id]: { tipo: "erro", msg: (e as Error).message.slice(0, 140) } }));
    },
  });
  const alternarLoteFn = useServerFn(alternarFontesEmLote);
  const alternarLoteM = useMutation({
    mutationFn: async (vars: { ids: string[]; activa: boolean }) => alternarLoteFn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fontes"] });
      invalidateAudit();
      setConfirmarLote(false);
    },
    onError: (e: unknown) => notify(`Falhou: ${(e as Error).message}`, { tipo: "erro" }),
  });

        // Próxima corrida: 07:30 UTC diário
        const agora = new Date();
        const proxima = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 7, 30, 0));
        if (proxima.getTime() <= agora.getTime()) proxima.setUTCDate(proxima.getUTCDate() + 1);
        const proximaTxt = proxima.toLocaleString("pt-PT", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });

        // Última recolha global
        const ultimas = fontes.map((f) => f.ultima_recolha ? Date.parse(f.ultima_recolha) : 0).filter((n) => n > 0);
        const ultimaGlobalMs = ultimas.length ? Math.max(...ultimas) : 0;
        const fmtRelativo = (ms: number) => {
          if (!ms) return "ainda não correu";
          const dif = Date.now() - ms;
          const h = Math.floor(dif / 3600_000);
          if (h < 1) return "há minutos";
          if (h < 24) return `há ${h} h`;
          const d = Math.floor(h / 24);
          return `há ${d} dia${d === 1 ? "" : "s"}`;
        };




        const ToggleSwitch = ({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: () => void; label: string }) => (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={onChange}
            className="relative inline-flex items-center shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              width: 40, height: 22,
              background: on ? T.ok : "#D0D5DD",
              boxShadow: on ? "0 0 0 3px rgba(16,185,129,0.12)" : "none",
            }}
          >
            <span
              className="absolute top-[2px] rounded-full bg-white shadow transition-all"
              style={{
                width: 18, height: 18,
                left: on ? 20 : 2,
              }}
            />
          </button>
        );

        if (fontesQ.isLoading || curadoriaConfigQ.isLoading) return <p role="status" className="p-6">A carregar fontes e limites…</p>;
        if (fontesQ.isError || curadoriaConfigQ.isError) return <div role="alert" className="p-6 space-y-3"><p>Não foi possível carregar as fontes e os limites. As configurações existentes foram preservadas.</p><button className="underline" onClick={() => { void fontesQ.refetch(); void curadoriaConfigQ.refetch(); }}>Tentar novamente</button><button className="ml-4 underline" onClick={onFechar}>Voltar</button></div>;
        const conteudo = (
          <div
            className="p-5 md:p-6 space-y-5 relative flex-1 min-h-0 overflow-y-auto"
            style={{ background: "radial-gradient(1200px 300px at 50% -120px, rgba(99,102,241,0.09), transparent)" }}
          >
            {/* Cabeçalho */}
            <header className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center ds-gradient shrink-0" style={{ boxShadow: "0 8px 22px -8px rgba(99,102,241,0.55)" }}>
                  <Rss size={16} color="#fff" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold" style={{ color: T.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Fontes de curadoria IA</h2>
                  <p className="text-[13px] mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: T.muted }}>
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: T.ok }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.ok, boxShadow: `0 0 0 3px ${T.okSoft}` }} />
                      Recolha de fontes
                    </span>
                    <span aria-hidden style={{ color: T.faint }}>·</span>
                    <span>Última <strong style={{ color: T.ink }}>{fmtRelativo(ultimaGlobalMs)}</strong></span>

                  </p>
                </div>
              </div>
              {!embutido && <button onClick={() => onFechar()} className="p-2 rounded-lg hover:bg-black/5 shrink-0" aria-label="Fechar">
                <X size={18} style={{ color: T.muted }} />
              </button>}
            </header>

            {/* Controlo do motor — faixa única (máximo + correr agora) */}
            {isAdmin && (
              <section className="rounded-xl p-3.5 relative overflow-hidden" style={{ background: "#FFFFFF", border: `1px solid ${T.line}` }}>
                <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center sm:flex-wrap">
                  <div className="flex flex-col items-stretch gap-3 flex-1 min-w-0 sm:min-w-[240px] sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: T.ink }}>Máximo por corrida</p>
                      <p className="text-[11px]" style={{ color: T.muted }}>
                        Tecto total por recolha, repartido pelas publicações: no máximo {curadoriaConfig?.max_por_fonte ?? 2} notícias
                        por publicação e {curadoriaConfig?.max_por_categoria ?? 3} por categoria enquanto houver material variado.
                      </p>

                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <input
                        type="range" min={5} max={50} step={1}
                        aria-label="Máximo por corrida" value={fonteMax ?? 15}
                        onChange={(e) => setFonteMax(Number(e.target.value))}
                        onMouseUp={() => fonteMax !== null && setMaxM.mutate(fonteMax)}
                        onTouchEnd={() => fonteMax !== null && setMaxM.mutate(fonteMax)}
                        className="w-32 md:w-40 accent-indigo-500"
                      />
                      <input
                        type="number" min={5} max={50} aria-label="Máximo por corrida" value={fonteMax ?? 15}
                        onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) setFonteMax(n); }}
                        onBlur={() => fonteMax !== null && setMaxM.mutate(fonteMax)}
                        className="w-14 text-sm font-bold rounded-md px-2 py-1 text-center"
                        style={{ border: `1px solid ${T.lineStrong}`, color: T.ink }}
                      />
                      {maxSaved && <span className="text-[11px] font-semibold" style={{ color: T.ok }}>✓</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => correrCuradoriaM.mutate()}
                    disabled={correrCuradoriaM.isPending}
                    className="inline-flex items-center gap-2 text-[13px] font-bold px-4 rounded-lg text-white ds-gradient disabled:opacity-60 transition-transform hover:-translate-y-px h-10"
                    style={{ boxShadow: "0 6px 18px -6px rgba(99,102,241,0.55)" }}
                  >
                    {correrCuradoriaM.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {correrCuradoriaM.isPending ? "A recolher…" : "Correr agora"}
                  </button>
                </div>

                {/* Tectos que se aplicam também às newsletters recebidas por email */}
                <div className="mt-3 pt-3 flex items-center gap-5 flex-wrap" style={{ borderTop: `1px solid ${T.line}` }}>
                  {([
                    { campo: "max_por_email" as const, rotulo: "Máximo por email", ajuda: "Notícias que cada newsletter recebida pode inserir.", min: 1, max: 20, valor: curadoriaConfig?.max_por_email ?? 4 },
                    { campo: "max_por_dia_email" as const, rotulo: "Máximo por dia (email)", ajuda: "Tecto diário só para newsletters — não gasta as vagas da recolha automática.", min: 1, max: 200, valor: curadoriaConfig?.max_por_dia_email ?? 15 },
                    { campo: "max_por_dia" as const, rotulo: "Máximo por dia", ajuda: "Tecto total de entradas automáticas em 24 horas.", min: 1, max: 200, valor: curadoriaConfig?.max_por_dia ?? 25 },
                  ]).map((c) => (
                    <div key={c.campo} className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold" style={{ color: T.ink }}>{c.rotulo}</p>
                        <p className="text-[11px]" style={{ color: T.muted }}>{c.ajuda}</p>
                      </div>
                      <input
                        aria-label={c.rotulo} type="number" min={c.min} max={c.max} defaultValue={c.valor}
                        key={`${c.campo}-${c.valor}`}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n) && n !== c.valor) setTectoM.mutate({ campo: c.campo, valor: n });
                        }}
                        className="w-14 text-sm font-bold rounded-md px-2 py-1 text-center"
                        style={{ border: `1px solid ${T.lineStrong}`, color: T.ink }}
                      />
                    </div>
                  ))}
                </div>

                {/* Resumo real da última corrida automática */}
                {ultimaCorridaQ.data ? (
                  <p className="mt-2 text-[11px]" style={{ color: T.muted }}>
                    Última corrida:{" "}
                    <strong style={{ color: T.ink }}>
                      {new Date(ultimaCorridaQ.data.quando).toLocaleString("pt-PT", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </strong>{" "}
                    · {ultimaCorridaQ.data.inseridas} inseridas (tecto {ultimaCorridaQ.data.tecto})
                    {Object.keys(ultimaCorridaQ.data.por_fonte).length > 0 && (
                      <> — {Object.entries(ultimaCorridaQ.data.por_fonte).map(([f, n]) => `${f} ${n}`).join(", ")}</>
                    )}
                    {ultimaCorridaQ.data.vagas_dia !== null && <> · vagas no dia: {ultimaCorridaQ.data.vagas_dia}</>}
                    {ultimaCorridaQ.data.inseridas === 0 && (
                      <> · <span style={{ color: T.warn ?? T.ink }}>correu mas não inseriu: {ultimaCorridaQ.data.motivo_zero ?? "sem material novo"}</span></>
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px]" style={{ color: T.muted }}>
                    Ainda sem registo de nenhuma corrida automática.
                  </p>
                )}

                {correrCuradoriaM.isPending && (
                  <div className="absolute left-0 right-0 bottom-0 h-[2px] overflow-hidden">
                    <div className="h-full w-1/3 ds-gradient" style={{ animation: "ds-slide 1.2s ease-in-out infinite" }} />
                  </div>
                )}
              </section>
            )}

            {/* Cabeçalho da lista + filtro por tipo + botão "Adicionar fonte" */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: T.faint }}>Fontes</p>
                {(() => {
                  const cont = {
                    todas: fontes.length,
                    rss: fontes.filter((x) => (x as { tipo?: string }).tipo === "rss" || !(x as { tipo?: string }).tipo).length,
                    html: fontes.filter((x) => (x as { tipo?: string }).tipo === "html").length,
                    newsletter: fontes.filter((x) => (x as { tipo?: string }).tipo === "newsletter").length,
                    directorios: fontes.filter((x) => (x as { tipo?: string }).tipo === "directorio_ferramentas").length,
                  };
                  const chips: Array<{ id: typeof filtroTipoFonte; rotulo: string; n: number }> = [
                    { id: "todas", rotulo: "Todas", n: cont.todas },
                    { id: "rss", rotulo: "RSS", n: cont.rss },
                    { id: "html", rotulo: "HTML", n: cont.html },
                    { id: "newsletter", rotulo: "Newsletter", n: cont.newsletter },
                    { id: "directorio_ferramentas", rotulo: "Diretórios", n: cont.directorios },
                  ];
                  return chips.map((c) => {
                    const on = filtroTipoFonte === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFiltroTipoFonte(c.id)}
                        className="text-[11.5px] font-bold px-2.5 py-1 rounded-full transition-colors"
                        style={on
                          ? { background: T.ink, color: "#fff" }
                          : { background: "#F2F4F7", color: T.muted, border: `1px solid ${T.line}` }}
                      >
                        {c.rotulo} <span style={{ opacity: 0.7, marginLeft: 4 }}>{c.n}</span>
                      </button>
                    );
                  });
                })()}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const alvos = fontes.filter((x) => ((x as { tipo?: string }).tipo ?? "rss") !== "newsletter");
                    const todasOn = alvos.length > 0 && alvos.every((x) => x.activa);
                    if (alvos.length === 0) return null;
                    if (!confirmarLote) {
                      return (
                        <button
                          type="button"
                          onClick={() => setConfirmarLote(true)}
                          disabled={alternarLoteM.isPending}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold transition-colors"
                          style={{
                            background: todasOn ? "#FEF3F2" : "#EEF4FF",
                            color: todasOn ? T.danger : T.primary,
                            border: `1px solid ${todasOn ? "#FECDCA" : "#C7D7FE"}`,
                          }}
                          title={todasOn ? "Desactivar todas as fontes RSS/HTML" : "Activar todas as fontes RSS/HTML"}
                        >
                          <Power size={13} /> {todasOn ? "Desactivar todas" : "Activar todas"}
                        </button>
                      );
                    }
                    return (
                      <div className="inline-flex items-center gap-1 h-9 px-2 rounded-lg" style={{ background: "#F9FAFB", border: `1px solid ${T.lineStrong}` }}>
                        <span className="text-[11.5px]" style={{ color: T.muted }}>Confirmar {alvos.length}?</span>
                        <button
                          onClick={() => alternarLoteM.mutate({ ids: alvos.map((x) => x.id), activa: !todasOn })}
                          disabled={alternarLoteM.isPending}
                          className="text-[12px] font-bold h-7 px-2.5 rounded-md text-white"
                          style={{ background: T.primary }}
                        >
                          {alternarLoteM.isPending ? "…" : "Sim"}
                        </button>
                        <button onClick={() => setConfirmarLote(false)} className="text-[12px] h-7 px-2 rounded-md" style={{ color: T.muted }}>Não</button>
                      </div>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setMostrarAdd((v) => !v)}
                    aria-expanded={mostrarAdd}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-bold transition-colors"
                    style={mostrarAdd
                      ? { background: "#F2F4F7", color: T.ink, border: `1px solid ${T.lineStrong}` }
                      : { background: T.primary, color: "#FFFFFF", boxShadow: "0 6px 18px -6px rgba(99,102,241,0.55)" }}
                  >
                    {mostrarAdd ? <X size={14} /> : <Plus size={14} />}
                    {mostrarAdd ? "Fechar" : "Adicionar fonte"}
                  </button>
                </div>
              )}
            </div>


            {/* Painel colapsável de adicionar */}
            {isAdmin && mostrarAdd && (
              <section className="rounded-2xl p-4 anim-rise" style={{ background: "#F9FAFB", border: `1px dashed ${T.lineStrong}` }}>
                {/* Tabs de modo */}
                <div className="flex items-center gap-1 mb-3 p-1 rounded-lg" style={{ background: "#FFFFFF", border: `1px solid ${T.line}`, width: "fit-content" }}>
                  {([
                    { id: "rss_html" as const, rotulo: "RSS / HTML", icon: Rss },
                    { id: "newsletter" as const, rotulo: "Newsletter", icon: Mail },
                  ]).map((t) => {
                    const on = modoAdd === t.id;
                    const Ico = t.icon;
                    return (
                      <button key={t.id} type="button" onClick={() => setModoAdd(t.id)}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-1.5 rounded-md transition-colors"
                        style={on ? { background: T.ink, color: "#fff" } : { color: T.muted }}>
                        <Ico size={13} /> {t.rotulo}
                      </button>
                    );
                  })}
                </div>

                {modoAdd === "rss_html" ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      placeholder="Cola o site ou o feed RSS/Atom (https://…)"
                      value={urlSite}
                      onChange={(e) => { setUrlSite(e.target.value); setDescoberta(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && urlSite.trim() && !descobrirM.isPending) descobrirM.mutate(urlSite.trim()); }}
                      className="flex-1 min-w-0 text-sm rounded-lg px-3 py-2 font-mono"
                      style={{ border: `1px solid ${T.lineStrong}`, background: "#FFFFFF", color: T.ink }}
                    />
                    <button
                      onClick={() => descobrirM.mutate(urlSite.trim())}
                      disabled={!urlSite.trim() || descobrirM.isPending}
                      className="text-sm font-bold px-3 py-2 rounded-lg text-white ds-gradient disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                    >
                      {descobrirM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      Descobrir
                    </button>
                  </div>
                  <p className="text-[11px]" style={{ color: T.muted }}>
                    Detectamos automaticamente se é URL de site (procuramos o RSS) ou já um feed válido.
                  </p>

                  {descoberta && !descoberta.ok && (
                    <div className="rounded-md p-2.5 text-[12px]" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      ⚠ {descoberta.erro || "Nenhum feed encontrado neste URL."}
                    </div>
                  )}

                  {descoberta && descoberta.ok && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: T.faint }}>
                        {descoberta.candidatos.length} feed(s) encontrado(s) — clica para adicionar
                      </p>
                      {descoberta.candidatos.map((c) => {
                        const isHtml = c.tipo === "html";
                        return (
                        <div key={c.url} className="flex items-stretch gap-2 rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: `1px solid ${T.line}` }}>
                          <div className="flex-1 min-w-0 p-2.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate" style={{ color: T.ink }}>{c.titulo || (isHtml ? "Página de listagem" : "Feed sem título")}</p>
                              <span
                                className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                style={
                                  isHtml
                                    ? { background: "rgba(139,92,246,0.12)", color: "#6D28D9" }
                                    : { background: "rgba(16,185,129,0.12)", color: "#047857" }
                                }
                                title={isHtml ? "Site sem RSS — extracção HTML" : "Feed RSS/Atom"}
                              >
                                {isHtml ? "HTML" : "RSS"}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono truncate" style={{ color: T.faint }}>{c.url}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: T.muted }}>
                              {c.total} {isHtml ? "artigos detectados" : "itens"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              let hostname = ""; try { hostname = new URL(c.url).hostname; } catch { /* ignore */ }
                              const nome = descoberta.nomeSugerido || c.titulo || hostname;
                              await criarFonteM.mutateAsync({
                                nome,
                                url_feed: c.url,
                                tipo: c.tipo ?? "rss",
                                url_listagem: isHtml ? c.url : undefined,
                              });
                              setUrlSite("");
                              setDescoberta(null);
                              setMostrarAdd(false);
                            }}
                            disabled={criarFonteM.isPending}
                            className="px-3.5 text-[13px] font-bold text-white ds-gradient disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                          >
                            {criarFonteM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Adicionar
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                ) : (
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      placeholder="Nome (ex: Stratechery)"
                      value={novoNomeFonte}
                      onChange={(e) => setNovoNomeFonte(e.target.value)}
                      className="text-sm rounded-lg px-3 py-2"
                      style={{ border: `1px solid ${T.lineStrong}`, background: "#FFFFFF", color: T.ink }}
                    />
                    <input
                      placeholder="Email do remetente (ex: news@stratechery.com)"
                      value={novoEmailFonte}
                      onChange={(e) => setNovoEmailFonte(e.target.value)}
                      className="text-sm rounded-lg px-3 py-2 font-mono"
                      style={{ border: `1px solid ${T.lineStrong}`, background: "#FFFFFF", color: T.ink }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const email = novoEmailFonte.trim().toLowerCase();
                        if (!email || !email.includes("@")) { notify("Email inválido"); return; }
                        const nome = (novoNomeFonte.trim() || email.split("@")[0]);
                        await criarFonteM.mutateAsync({
                          nome,
                          url_feed: `mailto:${email}`,
                          tipo: "newsletter",
                          remetente_email: email,
                        });
                        setNovoEmailFonte("");
                        setNovoNomeFonte("");
                        setMostrarAdd(false);
                      }}
                      disabled={criarFonteM.isPending || !novoEmailFonte.trim()}
                      className="text-sm font-bold px-3 py-2 rounded-lg text-white ds-gradient disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {criarFonteM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Adicionar
                    </button>
                  </div>
                  <p className="text-[11px]" style={{ color: T.muted }}>
                    As newsletters aparecem aqui automaticamente à medida que os emails chegam. Podes pré-adicionar um remetente para o ligar/desligar antes do primeiro email.
                  </p>
                </div>
                )}
              </section>
            )}


            {/* Lista de fontes */}
            <section className="space-y-2">
              {fontes.length === 0 && <EmptyState icon={Rss} texto="Sem fontes — clica em «Adicionar fonte» para começar." />}
              {fontes
                .filter((f) => {
                  if (filtroTipoFonte === "todas") return true;
                  const t = (f as { tipo?: string }).tipo ?? "rss";
                  return t === filtroTipoFonte;
                })
                .map((f) => {
                const stats = statsFontes[f.id];
                const n30 = stats?.sugeridas ?? contagemFontes30d[f.id] ?? 0;
                const aprov30 = stats?.aprovadas ?? 0;
                const ultima = f.ultima_recolha
                  ? new Date(f.ultima_recolha).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "nunca";
                const criadaHa = f.criada_em ? (Date.now() - Date.parse(f.criada_em)) / 3600_000 : 0;
                const avisoSemRecolha = !f.ultima_recolha && criadaHa > 24;
                const dominio = (() => { try { return new URL(f.url_feed || "").hostname; } catch { return ""; } })();
                const favicon = dominio ? `https://www.google.com/s2/favicons?domain=${dominio}&sz=32` : null;
                const emEdicao = editandoFonte[f.id];

                return (
                  <div
                    key={f.id}
                    className="rounded-2xl overflow-hidden transition-all"
                    style={{
                      background: T.card,
                      border: `1px solid ${f.activa ? "rgba(99,102,241,0.22)" : T.line}`,
                      boxShadow: f.activa ? "0 1px 0 rgba(99,102,241,0.05), 0 8px 20px -14px rgba(99,102,241,0.35)" : "none",
                    }}
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F2F4F7" }}>
                        {((f as { tipo?: string }).tipo === "newsletter")
                          ? <Mail size={16} style={{ color: "#1D4ED8" }} />
                          : favicon ? <img src={favicon} alt="" style={{ width: 18, height: 18 }} /> : <Globe size={16} style={{ color: T.muted }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {emEdicao ? (
                          <div className="space-y-1.5">
                            <input value={emEdicao.nome} onChange={(e) => setEditandoFonte((s) => ({ ...s, [f.id]: { ...s[f.id], nome: e.target.value } }))}
                              className="w-full text-sm font-semibold rounded-md px-2.5 py-2" style={{ border: `1px solid ${T.lineStrong}`, color: T.ink }} />
                            <input value={emEdicao.url_feed} onChange={(e) => setEditandoFonte((s) => ({ ...s, [f.id]: { ...s[f.id], url_feed: e.target.value } }))}
                              className="w-full text-[12px] rounded-md px-2.5 py-2 font-mono" style={{ border: `1px solid ${T.lineStrong}`, color: T.ink }} />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-[15px] font-semibold truncate leading-tight" style={{ color: T.ink }}>{f.nome}</p>
                              {(() => {
                                const t = (f as { tipo?: string }).tipo ?? "rss";
                                if (t === "directorio_ferramentas") return <span className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: T.shell, color: T.muted }}>Diretório</span>;
                                if (t === "html") return (
                                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(139,92,246,0.12)", color: "#6D28D9" }}
                                    title="Site sem RSS — extracção por HTML">HTML</span>
                                );
                                if (t === "newsletter") return (
                                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(29,78,216,0.12)", color: "#1D4ED8" }}
                                    title="Newsletter recebida por email">NEWSLETTER</span>
                                );
                                return (
                                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                    style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}
                                    title="Feed RSS/Atom">RSS</span>
                                );
                               })()}
                               {(() => {
                                 const foca = !!(f as { foca_ferramentas?: boolean }).foca_ferramentas;
                                 if (!isAdmin) {
                                   if (!foca) return null;
                                   return (
                                     <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                       style={{ background: "rgba(236,72,153,0.12)", color: "#BE185D" }}
                                       title="Fonte focada em ferramentas AI">🧰 FERRAMENTAS</span>
                                   );
                                 }
                                 return (
                                   <button
                                     type="button"
                                     onClick={() => toggleFocaFerramentas.mutate({ id: f.id, foca: !foca })}
                                     disabled={toggleFocaFerramentas.isPending}
                                     className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded transition-opacity hover:opacity-80 disabled:opacity-50"
                                     style={foca
                                       ? { background: "rgba(236,72,153,0.14)", color: "#BE185D" }
                                       : { background: "#F2F4F7", color: T.faint }}
                                     title={foca ? "Focada em ferramentas — clica para desactivar" : "Marcar como focada em ferramentas AI"}
                                   >
                                     🧰 {foca ? "Ferramentas" : "Focar ferram."}
                                   </button>
                                 );
                               })()}
                             </div>
                            <p className="text-[12px] truncate font-mono mt-0.5" style={{ color: T.faint }}>
                              {(f as { tipo?: string }).tipo === "newsletter"
                                ? ((f as { remetente_email?: string }).remetente_email ?? f.url_feed)
                                : f.url_feed}
                            </p>
                          </>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]" style={{ color: T.muted }}>
                          <span>Sugeridas 30 d <strong style={{ color: T.ink }}>{n30}</strong></span>
                          <span aria-hidden style={{ color: T.faint }}>·</span>
                          <span>Aprovadas 30 d <strong style={{ color: T.ok }}>{aprov30}</strong></span>
                          <span aria-hidden style={{ color: T.faint }}>·</span>
                          <span>
                            {((f as { tipo?: string }).tipo === "newsletter" ? "Último email" : "Última recolha")}{" "}
                            <strong style={{ color: T.ink }}>{ultima}</strong>
                          </span>
                          {avisoSemRecolha && (
                            <span className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded" style={{ color: "#92400E", background: "#FEF3C7" }}>
                              <AlertTriangle size={11} /> Ainda sem recolha
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                        <ToggleSwitch
                          on={!!f.activa}
                          disabled={!isAdmin || toggleFonte.isPending}
                          onChange={() => toggleFonte.mutate({ id: f.id, activa: !f.activa })}
                          label={f.activa ? "Desactivar fonte" : "Activar fonte"}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: f.activa ? T.ok : T.faint }}>
                          {f.activa ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>

                    {/* Barra de acções */}
                    {isAdmin && (
                      <div className="flex items-stretch border-t" style={{ borderColor: T.line, background: "#FAFBFC" }}>
                        {emEdicao ? (
                          <>
                            <button
                              onClick={() => actualizarFonteM.mutate({ id: f.id, nome: emEdicao.nome.trim(), url_feed: emEdicao.url_feed.trim() })}
                              disabled={!emEdicao.nome.trim() || actualizarFonteM.isPending}
                              className="flex-1 h-11 md:h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-white ds-gradient disabled:opacity-50"
                            >
                              <Check size={15} /> Gravar
                            </button>
                            <button
                              onClick={() => setEditandoFonte((s) => { const c = { ...s }; delete c[f.id]; return c; })}
                              className="flex-1 h-11 md:h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold border-l"
                              style={{ color: T.muted, borderColor: T.line }}
                            >
                              <X size={15} /> Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            {((f as { tipo?: string }).tipo ?? "rss") !== "newsletter" && (() => {
                              const aCorrer = correrFonteM.isPending && correrFonteM.variables === f.id;
                              return (
                                <button
                                  onClick={() => correrFonteM.mutate(f.id)}
                                  disabled={aCorrer || !f.activa}
                                  title={!f.activa ? "Activa a fonte para correr" : "Correr esta fonte agora"}
                                  className="flex-1 h-11 md:h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold hover:bg-black/[0.03] transition-colors disabled:opacity-50"
                                  style={{ color: T.primary }}
                                >
                                  {aCorrer ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                  {aCorrer ? "A correr…" : "Correr"}
                                </button>
                              );
                            })()}
                            <button
                              onClick={() => setEditandoFonte((s) => ({ ...s, [f.id]: { nome: f.nome, url_feed: f.url_feed } }))}
                              className="flex-1 h-11 md:h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold hover:bg-black/[0.03] transition-colors border-l"
                              style={{ color: T.ink, borderColor: T.line }}
                            >
                              <Pencil size={14} /> Editar
                            </button>
                            <button
                              onClick={() => { if (confirm(`Apagar a fonte "${f.nome}"?`)) removerFonte.mutate(f.id); }}
                              className="flex-1 h-11 md:h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold border-l hover:bg-black/[0.03] transition-colors"
                              style={{ color: T.danger, borderColor: T.line }}
                            >
                              <Trash2 size={14} /> Apagar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {(() => {
                      const r = resultadosFontes[f.id];
                      if (!r) return null;
                      const bg = r.tipo === "erro" ? "#FEF3F2" : r.tipo === "sucesso" && r.inseridas > 0 ? "#ECFDF3" : "#F2F4F7";
                      const cor = r.tipo === "erro" ? T.danger : r.tipo === "sucesso" && r.inseridas > 0 ? T.ok : T.muted;
                      return (
                        <div className="px-4 py-2 text-[11.5px] font-medium border-t" style={{ background: bg, color: cor, borderColor: T.line }}>
                          {r.tipo === "erro"
                            ? `Erro: ${r.msg}`
                            : r.inseridas > 0
                              ? `+${r.inseridas} nova(s) · ${r.candidatos} candidato(s) · ${(r.ms / 1000).toFixed(1)}s`
                              : `Sem novas — ${r.candidatos} candidato(s) analisado(s) em ${(r.ms / 1000).toFixed(1)}s`}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </section>

            {!isAdmin && (
              <p className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ color: T.muted, background: T.card, border: `1px solid ${T.line}` }}>
                <Lock size={11} /> Só o admin pode gerir fontes.
              </p>
            )}
          </div>
        );
        return embutido ? conteudo : <ModalBase onClose={onFechar} titulo="" wide chromeless>{conteudo}</ModalBase>;
}
