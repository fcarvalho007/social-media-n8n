// Estado e mutações da fila de aprovação, empacotados para qualquer editor.
// O Editor Clássico mantém o seu próprio estado (integrado com o resto do
// monólito); o Editor Revista usa este hook para montar o mesmo componente.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isLinkRastreio, estadoFonte } from "../../../lib/link-rastreio.ts";
import {
  listarFontes, listarPendentes, aprovarNoticia, rejeitarNoticia, atualizarNoticia, registarAudit,
  stripLeadingEmoji, type CatId, type Noticia,
} from "../data.ts";
import { ORIGEM_META, idadeEmDias, type NoticiaDraft } from "./ui.ts";
import type { PendentesProps } from "./Pendentes.ts";

const PEND_PAGINA = 10;

function vibrar() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
}

export interface UsePendentesArgs {
  edicaoId: string | null;
  bloqueado: boolean;
  nomeExibicao: string;
  iaConfigurada?: boolean;
  iaTooltip?: string;
  notify: (m: string, opts?: { tipo?: "ok" | "erro" }) => void;
  onAdicionarNoticias?: () => void;
  onAbrirFontes?: () => void;
  onLimparAntigas?: () => void;
}

/** Devolve as props prontas para `<Pendentes />`. */
export function usePendentes(args: UsePendentesArgs): PendentesProps {
  const { edicaoId, bloqueado, nomeExibicao, notify } = args;
  const qc = useQueryClient();
  const pendentesRef = useRef<HTMLDivElement | null>(null);

  const pendentesQ = useQuery({ queryKey: ["pendentes"], queryFn: listarPendentes });
  const fontesQ = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  const pendentes = useMemo(() => pendentesQ.data ?? [], [pendentesQ.data]);

  const [filtroPend, setFiltroPend] = useState<"hoje" | "semana" | "tudo">("tudo");
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "email" | "rss" | "whatsapp" | "manual">("todos");
  const [soRastreio, setSoRastreio] = useState(false);
  const [limitePend, setLimitePend] = useState(PEND_PAGINA);
  useEffect(() => { setLimitePend(PEND_PAGINA); }, [filtroPend, filtroOrigem, soRastreio]);

  const [pendAbertos, setPendAbertos] = useState<Record<string, NoticiaDraft>>({});
  const [accaoPend, setAccaoPend] = useState<Record<string, "aprovar" | "rejeitar">>({});
  const [resultadoPend, setResultadoPend] = useState<Record<string, "aprovada" | "rejeitada">>({});

  const fecharPend = useCallback((id: string) => {
    setPendAbertos((s) => { if (!(id in s)) return s; const c = { ...s }; delete c[id]; return c; });
  }, []);
  const abrirPend = useCallback((n: Noticia) => {
    setPendAbertos((s) => ({
      ...s,
      [n.id]: {
        titulo: stripLeadingEmoji(n.titulo),
        descricao: n.descricao ?? "",
        categoria: n.categoria as CatId,
        url: n.url ?? "",
      },
    }));
  }, []);
  const actualizarDraftPend = useCallback((id: string, d: NoticiaDraft) => {
    setPendAbertos((s) => (id in s ? { ...s, [id]: d } : s));
  }, []);

  const concluirCartao = useCallback((id: string, estado: "aprovada" | "rejeitada") => {
    setAccaoPend((s) => { const c = { ...s }; delete c[id]; return c; });
    setResultadoPend((s) => ({ ...s, [id]: estado }));
    window.setTimeout(() => setResultadoPend((s) => { const c = { ...s }; delete c[id]; return c; }), 1100);
  }, []);

  const invalidar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pendentes"] });
    if (edicaoId) {
      qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] });
      qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] });
    }
  }, [qc, edicaoId]);

  const patchNoticia = useMutation({
    mutationFn: (a: { id: string; patch: Record<string, unknown> }) =>
      atualizarNoticia(a.id, a.patch as Partial<Noticia>),
    onSuccess: invalidar,
    onError: (e: Error) => notify(e.message, { tipo: "erro" }),
  });

  const aprovar = useMutation({
    mutationFn: async (a: { n: Noticia; patch?: Record<string, unknown> }) => {
      if (!edicaoId) throw new Error("Sem edição");
      await aprovarNoticia(a.n.id, edicaoId, a.patch as Partial<Noticia> | undefined);
      await registarAudit(nomeExibicao, `Aprovou «${stripLeadingEmoji((a.patch?.titulo as string) ?? a.n.titulo).slice(0, 40)}…»`);
    },
    onMutate: (v) => { vibrar(); setAccaoPend((s) => ({ ...s, [v.n.id]: "aprovar" })); },
    onSuccess: (_d, v) => {
      concluirCartao(v.n.id, "aprovada");
      invalidar(); fecharPend(v.n.id);
      notify("Aprovada — fica disponível para a edição");
    },
    onError: (e: Error, v) => {
      setAccaoPend((s) => { const c = { ...s }; delete c[v.n.id]; return c; });
      notify(`Não foi possível aprovar: ${e.message}`, { tipo: "erro" });
    },
  });

  const rejeitar = useMutation({
    mutationFn: async (n: Noticia) => {
      await rejeitarNoticia(n.id);
      await registarAudit(nomeExibicao, `Rejeitou «${stripLeadingEmoji(n.titulo).slice(0, 40)}…»`);
    },
    onMutate: (n) => { vibrar(); setAccaoPend((s) => ({ ...s, [n.id]: "rejeitar" })); },
    onSuccess: (_d, n) => {
      concluirCartao(n.id, "rejeitada");
      invalidar(); fecharPend(n.id);
      notify("Rejeitada — sai da fila de pendentes");
    },
    onError: (e: Error, n) => {
      setAccaoPend((s) => { const c = { ...s }; delete c[n.id]; return c; });
      notify(`Não foi possível rejeitar: ${e.message}`, { tipo: "erro" });
    },
  });

  const precisaFonte = useCallback((n: Noticia) => {
    const est = estadoFonte((n as { fonte_estado?: string | null }).fonte_estado);
    return est === "por_confirmar" || (isLinkRastreio(n.url) && est !== "resolvida");
  }, []);

  const pendentesFiltradas = pendentes.filter((n) => {
    const dias = idadeEmDias(n.created_at);
    if (filtroPend === "hoje" && dias >= 1) return false;
    if (filtroPend === "semana" && dias >= 7) return false;
    if (filtroOrigem !== "todos") {
      const grupo = ORIGEM_META[n.origem]?.grupo ?? "outro";
      if (grupo !== filtroOrigem) return false;
    }
    if (soRastreio && !isLinkRastreio(n.url)) return false;
    return true;
  });
  const pendentesOrdenadas = [
    ...pendentesFiltradas.filter((n) => !precisaFonte(n)),
    ...pendentesFiltradas.filter((n) => precisaFonte(n)),
  ];
  const pendentesVisiveis = pendentesOrdenadas.slice(0, limitePend);

  const noop = () => {};
  return {
    pendentesRef,
    bloqueado,
    iaConfigurada: args.iaConfigurada ?? true,
    iaTooltip: args.iaTooltip,
    fontes: fontesQ.data ?? [],
    onAdicionarNoticias: args.onAdicionarNoticias ?? noop,
    onAbrirFontes: args.onAbrirFontes ?? noop,
    onLimparAntigas: args.onLimparAntigas ?? noop,
    antigasCount: pendentes.filter((n) => idadeEmDias(n.created_at) > 14).length,
    filtroPend, setFiltroPend, filtroOrigem, setFiltroOrigem,
    soRastreio, setSoRastreio,
    totalRastreio: pendentes.filter((n) => isLinkRastreio(n.url)).length,
    abertosCount: Object.keys(pendAbertos).length,
    pendAbertos, setPendAbertos,
    pendentes,
    pendentesFiltradas,
    pendentesVisiveis,
    pendentesOrdenadas,
    pendentesProntas: pendentesVisiveis.filter((n) => !precisaFonte(n)),
    pendentesPorConfirmar: pendentesVisiveis.filter((n) => precisaFonte(n)),
    pendentesPorMostrar: pendentesOrdenadas.length - pendentesVisiveis.length,
    setLimitePend,
    PEND_PAGINA,
    accaoPend,
    resultadoPend,
    novosPendentesIds: new Set<string>(),
    patchNoticia,
    aprovar,
    rejeitar,
    abrirPend,
    fecharPend,
    actualizarDraftPend,
    notify,
  };
}
