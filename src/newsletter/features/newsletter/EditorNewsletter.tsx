import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type ComponentType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@/newsletter/shim/router";
import { Link } from "@/newsletter/shim/router";

import {
  Check, X, Pencil, ChevronDown, Plus, Send, Mail,
  Rss, Star, Shield, Eye, Trash2, Inbox, Archive,
  Globe, Lock, Newspaper, BookOpen, Package, ExternalLink, Mic, Loader2, LogOut, CheckCircle2,
  Settings2, PenLine, History, ChevronUp, Layers, AlertTriangle, Sparkles, ClipboardPaste, Wrench,
  MessageSquare, MessageCircle, FileText, Wand2, GripVertical, RefreshCw, TestTube2, Radio, XCircle, Download, Copy, Calendar, Search, Play, Power,
} from "lucide-react";
import {
  DndContext, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { previewEdicaoFn, sincronizarRascunhoFn, dispararEgoiFn, publicarWordpressFn, reconciliarEdicaoFn } from "@/newsletter/lib/envio.functions";
import { useEnvioNewsletter } from "./partilhado/useEnvioNewsletter";


import {
  getEdicaoAtual, getUltimaEnviada, criarEdicaoDaSemana, garantirEdicaoSeguinte, atualizarAssunto, escolherEpisodio,
  getEdicaoPorId, listarRascunhos, rascunhoObsoleto,
  detectarEnvioRealPendente, fecharEdicaoManualmente,


  listarPendentes, listarAprovadasDaEdicao, aprovarNoticia, rejeitarNoticia, apagarNoticia,
  atualizarNoticia, adicionarManual, verificarDuplicado, atualizarCronica, marcarCronicaConcluida, atualizarConsultoria, normalizarConsultoria, CONSULTORIA_DEFAULT,
  listarEpisodios, listarFontes, criarFonte, alternarFonteActiva, apagarFonte, actualizarFonte, actualizarFocaFerramentas,
  listarEstatisticasFontes, getCuradoriaConfig, setCuradoriaMax, setCuradoriaTecto, getUltimaCorridaCuradoria,
  listarAuditRecente, registarAudit,
  listarSeccoes, garantirSeccoesPadrao, alternarSeccaoActiva,
  reordenarSeccoes, reordenarNoticias, moverSeccao,
  criarSeccaoPersonalizada, actualizarSeccaoPersonalizada, removerSeccaoPersonalizada,
  contarNoticiasPorFonte30d, idsPendentesAntigas, rejeitarNoticiasEmMassa,
  sincronizarPodcastRss, getConfig, listarListasEgoi, listarFerramentas, stripLeadingEmoji,
  sincronizarDestinos, definirOverrideDestino, definirCategoriasOcultasEmail,
  actualizarFerramenta, removerFerramenta,
  type CatId, type Noticia, type Episodio, type SeccaoRow, type SeccaoTipo, type SeccaoCor, type ListaEgoi,
  type CamposSeccaoPersonalizada,
} from "./data";
import { AssuntoField } from "./AssuntoField";
import { registarValidador, limparValidador } from "./validadorStore";
import { ALVO_NOTICIAS_PADRAO } from "@/newsletter/features/definicoes/AlvoNoticiasCard";
import { registarEnvio, limparEnvio } from "./envioStore";
// (removido) import AvisoChecklistModal — agora embutido como Fase 1 do modal Enviar.
import { ModalLinks } from "./ModalLinks";
import { ModalSugestaoOrganizacao } from "./ModalSugestaoOrganizacao";
import { computarChecklist, diasAteEnvio, fmtDiaSemanaEData, resolverDestinos, MAX_TOTAL_EMAIL, AVISO_EMAIL, MAX_POR_CATEGORIA, type ItemChecklist, type ItemChave, type OverrideDestino } from "./checklist";
import { verificarLinksEdicao, verificarUmLink, ignorarLink, type ItemLink, type ResumoLinks, type ResultadoUmLink } from "@/newsletter/lib/verificar-links.functions";
import { useServerFn } from "@/newsletter/shim/start";
import { testarFeed, correrCuradoriaAgora, descobrirFeed, correrFonteAgora, alternarFontesEmLote } from "@/newsletter/lib/curadoria.functions";
import { pesquisarFonteIA, type Candidato as CandidatoFonte } from "@/newsletter/lib/pesquisar-fonte.functions";
import { encurtarDescricao } from "@/newsletter/lib/encurtar-descricao.functions";
import { extrairNoticias, confirmarNoticias } from "@/newsletter/lib/processar-noticias.functions";
import { estadoDescricao, corEstadoDescricao } from "@/newsletter/lib/ajustar-descricao";
import { isLinkRastreio, abreviarUrl, estadoFonte } from "@/newsletter/lib/link-rastreio";

// Sheet removido daqui — o Registo de actividade vive agora no TopNav.

/* ─── URL helpers ─── */



type EdgeFn = "preview-edicao" | "publicar-edicao" | "sincronizar-rascunho-egoi" | "disparar-egoi" | "publicar-wordpress";
/** Encaminha para as funções de servidor da aplicação (já não são Edge Functions). */
async function invocarEdge<T = unknown>(fn: EdgeFn, body: Record<string, unknown>): Promise<T> {
  const edicaoId = String(body.edicao_id ?? "");
  const listaIds = Array.isArray(body.lista_ids) ? (body.lista_ids as unknown[]).map(String) : [];
  let payload: unknown;
  switch (fn) {
    case "preview-edicao":
      payload = await previewEdicaoFn({ data: { edicao_id: edicaoId, destino: body.destino === "wordpress" ? "wordpress" : "email" } });
      break;
    case "sincronizar-rascunho-egoi":
      payload = await sincronizarRascunhoFn({ data: { edicao_id: edicaoId, lista_ids: listaIds } });
      break;
    case "disparar-egoi":
    case "publicar-edicao":
      payload = await dispararEgoiFn({
        data: { edicao_id: edicaoId, lista_ids: listaIds, confirmacao_numero: Number(body.confirmacao_numero ?? 0) || undefined },
      });
      break;
    case "publicar-wordpress":
      payload = await publicarWordpressFn({ data: { edicao_id: edicaoId } });
      break;
  }
  const p = payload as { ok?: boolean; mensagem?: string } | null;
  if (p && p.ok === false && p.mensagem) throw new Error(p.mensagem);
  return payload as T;
}

import { useDefinicoesIA } from "./useDefinicoesIA";
import { useAutoSave, type AutoSaveEstado } from "./useAutoSave";
import { useSessao } from "./useSessao";
import { CronicaEditor } from "./CronicaEditor";
import { sanitizarHtmlCronica } from "./sanitizeHtml";
import { TIPO_META, COR_PRESETS, CORES_ORDENADAS, corDe, metaDe } from "./seccoes";
import { SeccaoModal } from "./SeccaoModal";
import { FerramentasSemana } from "./FerramentasSemana";
import { SeccaoPersonalizadaCard } from "./SeccaoPersonalizadaCard";
import { Preview } from "./Preview";
import { DialogoNovaEdicao, SeloFormato, type FormatoEdicao } from "./FormatoEdicao";
import {
  T, COR_ATENCAO, COR_EDITORIAL, COR_PASSIVA, SECS, categorias, catDe, tempoRelativo, idadeEmDias,
  isUrlValido, limparUtm, urlPesquisaGoogle, OrigemSelo, RepeticaoChip, EmptyState, useEnterAnim,
  Card, SectionTitle, Url, UrlEditor, DescricaoMeta, NoticiaEditForm, CatSelect, ORIGEM_META, type NoticiaDraft,
  Foldable,
} from "./partilhado/ui";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { Pendentes } from "./partilhado/Pendentes";
import { FilaEntrada } from "./partilhado/FilaEntrada";

import { Podcast } from "./partilhado/Podcast";
import { AdicionarNoticias } from "./partilhado/modais/AdicionarNoticias";
import { Fontes } from "./partilhado/modais/Fontes";
import { CATEGORIAS as CATEGORIAS_TOKENS } from "@/newsletter/edge-shared/design-tokens";




/* ─── Fase 2 do envio: cartão de link com problema ─── */
function CartaoLinkProblema({
  item, aGuardar, aRejeitar, aAprovar, onGuardarUrl, onAprovar, onRejeitar, onAbrirNoEditor,
}: {
  item: ItemLink;
  aGuardar: boolean;
  aRejeitar: boolean;
  aAprovar: boolean;
  onGuardarUrl: (urlNovo: string) => void;
  onAprovar: () => void;
  onRejeitar: () => void;
  onAbrirNoEditor: () => void;
}) {
  const [aEditar, setAEditar] = useState(false);
  const [valor, setValor] = useState(item.url);
  const [confirmar, setConfirmar] = useState(false);
  const quebrado = item.estado === "quebrado";
  const ocupado = aGuardar || aRejeitar || aAprovar;

  return (
    <li className="rounded-lg p-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: quebrado ? T.dangerSoft : T.warnSoft, color: quebrado ? T.danger : T.warn }}>
          {quebrado ? "QUEBRADO" : "SUSPEITO"}
        </span>
        {item.status > 0 && <span className="text-[10.5px] font-mono" style={{ color: T.faint }}>HTTP {item.status}</span>}
        <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: T.faint }}>
          · {item.contexto.tipo === "ferramenta" ? "Ferramenta" : "Notícia"}
        </span>
      </div>
      <p className="text-[13.5px] font-semibold" style={{ color: T.ink }}>{item.contexto.titulo}</p>

      {aEditar ? (
        <div className="mt-2 space-y-2">
          <input
            type="url"
            value={valor}
            autoFocus
            onChange={(e) => setValor(e.target.value)}
            placeholder="https://…"
            className="w-full text-[13px] h-10 px-3 rounded-lg outline-none focus:ring-2"
            style={{ background: T.shell, border: `1px solid ${T.lineStrong}`, color: T.ink }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setValor(item.url); setAEditar(false); }}
              className="text-[12px] font-semibold h-8 px-2.5 rounded-md"
              style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.muted }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupado || !valor.trim() || valor.trim() === item.url}
              onClick={() => onGuardarUrl(valor.trim())}
              className="inline-flex items-center gap-1 text-[12px] font-bold h-8 px-3 rounded-md text-white disabled:opacity-40 ds-gradient"
            >
              {aGuardar ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar link
            </button>
          </div>
        </div>
      ) : (
        <>
          <a href={item.url} target="_blank" rel="noreferrer noopener" className="block text-[12px] mt-1 truncate hover:underline" style={{ color: T.muted }} title={item.url}>
            {item.url}
          </a>
          {confirmar ? (
            <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
              <span className="text-[12px] font-semibold mr-auto" style={{ color: T.danger }}>
                {item.contexto.tipo === "ferramenta" ? "Remover da edição?" : "Rejeitar e tirar da edição?"}
              </span>
              <button
                type="button"
                onClick={() => setConfirmar(false)}
                className="text-[12px] font-semibold h-8 px-2.5 rounded-md"
                style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.muted }}
              >
                Não
              </button>
              <button
                type="button"
                disabled={ocupado}
                onClick={() => { setConfirmar(false); onRejeitar(); }}
                className="inline-flex items-center gap-1 text-[12px] font-bold h-8 px-3 rounded-md disabled:opacity-40"
                style={{ background: T.dangerSoft, border: `1px solid ${T.dangerAccent}55`, color: T.danger }}
              >
                {aRejeitar ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Sim, rejeitar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onAbrirNoEditor}
                className="text-[11.5px] font-semibold underline underline-offset-2 mr-auto"
                style={{ color: T.faint }}
              >
                Abrir no editor
              </button>
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                disabled={ocupado}
                className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-2.5 rounded-md disabled:opacity-40"
                style={{ background: T.dangerSoft, border: `1px solid ${T.dangerAccent}44`, color: T.danger }}
              >
                <XCircle size={13} /> Rejeitar
              </button>
              <button
                type="button"
                onClick={() => setAEditar(true)}
                className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-2.5 rounded-md"
                style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.muted }}
              >
                <Pencil size={12} /> Editar link
              </button>
              <button
                type="button"
                onClick={onAprovar}
                disabled={ocupado}
                className="inline-flex items-center gap-1 text-[12px] font-bold h-8 px-3 rounded-md disabled:opacity-40"
                style={{ background: "#ECFDF3", border: "1px solid #ABEFC6", color: "#067647" }}
                title="Marcar como verificado manualmente"
              >
                <CheckCircle2 size={13} /> Aprovar
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}



/* ─── DnD helpers ─── */
function SortableList({ ids, disabled, onReorder, children }: { ids: string[]; disabled?: boolean; onReorder: (ids: string[]) => void; children: ReactNode }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={disabled ? undefined : handleEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, disabled, children }: { id: string; disabled?: boolean; children: (args: { dragHandle: (icon: ReactNode) => ReactNode; isDragging: boolean }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : "auto",
    boxShadow: isDragging ? "0 12px 24px -8px rgba(16,24,40,0.18)" : undefined,
    opacity: isDragging ? 0.95 : 1,
  } as const;
  const dragHandle = (icon: ReactNode) => (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      className="h-10 w-10 sm:h-auto sm:w-auto inline-flex items-center justify-center p-1 -ml-1 shrink-0 disabled:opacity-30"
      style={{ cursor: disabled ? "not-allowed" : (isDragging ? "grabbing" : "grab"), touchAction: "none" }}
      title="Manter premido para arrastar e reordenar"
      aria-label="Manter premido para arrastar e reordenar"
    >
      {icon}
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandle, isDragging })}
    </div>
  );
}





/* Badge inline com estado de autosave (por campo).
   `vazio` marca o campo como "nunca preenchido" — usa-se para mostrar
   «· por guardar» em vez de nada, evitando um falso silêncio. */
function SavedTick({ s, err, vazio }: { s: AutoSaveEstado; err: string | null; vazio?: boolean }) {
  const base = "inline-flex items-center gap-1 text-[11px] font-medium";
  if (s === "a-guardar") return <span className={base} style={{ color: "#667085" }}><Loader2 size={10} className="animate-spin" /> A guardar…</span>;
  if (s === "guardado") return <span className={base} style={{ color: "#027A48" }}><Check size={10} /> Guardado</span>;
  if (s === "erro") return <span className={base} style={{ color: "#B42318" }} title={err ?? undefined}><X size={10} /> Erro</span>;
  if (vazio) return <span className={base} style={{ color: "#98A2B3" }}>· por guardar</span>;
  return null;
}

/* Container que revela ícone de lápis em hover/focus para reforçar que o campo é editável */
function EditableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="ds-editable relative">
      {children}
      <Pencil size={13} aria-hidden className="ds-editable-pencil absolute top-2 right-2 pointer-events-none transition-opacity" style={{ color: "#98A2B3", opacity: 0 }} />
      <style>{`
        .ds-editable:hover .ds-editable-pencil,
        .ds-editable:focus-within .ds-editable-pencil { opacity: 1; }
      `}</style>
    </div>
  );
}




function fmtData(iso: string | null | undefined): string {
  if (!iso) return "sem data";
  const d = new Date(iso + "T00:00:00");
  const s = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(d);
}

function fmtHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}


function PhaseDivider({ numero, titulo, subtitulo }: { numero: 1 | 2; cor?: string; titulo: string; subtitulo?: string }) {
  return (
    <div
      className="pt-6 pb-3 first:pt-0 scroll-mt-24"
      style={{ borderBottom: `1px solid ${T.line}` }}
      aria-label={`Fase ${numero}: ${titulo}`}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 shadow-sm"
          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)" }}
        >
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[17px] md:text-[18px] font-bold leading-tight"
            style={{ color: T.ink, fontFamily: "var(--font-display, inherit)" }}
          >
            {titulo}
          </p>
          {subtitulo && (
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: T.muted }}>{subtitulo}</p>
          )}
        </div>
      </div>
    </div>
  );
}





interface SnapshotResumo {
  destaques?: unknown[]; newsletter?: unknown[]; site?: unknown[]; assunto?: string; lista?: string;
  egoi?: Array<{ campanha_id?: string; lista_id?: string; lista_nome?: string }>;
  wordpress?: { post_id?: number; post_url?: string; status?: string } | null;
}

function SemRascunhoScreen({ onCriar, aCriar }: { onCriar: () => void; aCriar: boolean }) {
  const ultimaQ = useQuery({ queryKey: ["ultima-enviada"], queryFn: getUltimaEnviada });
  if (ultimaQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.muted }}>
        <Loader2 className="animate-spin" /> <span className="ml-2 text-sm">A carregar…</span>
      </div>
    );
  }
  const u = ultimaQ.data;
  if (!u) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: T.bg, color: T.ink }}>
        <div className="max-w-md text-center rounded-2xl p-8 anim-rise" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ds-gradient mb-4"><Newspaper color="#fff" /></div>
          <h1 className="font-display text-xl font-bold mb-2">Sem edição em rascunho</h1>
          <p className="text-sm mb-6" style={{ color: T.muted }}>Cria a edição desta semana para começares a curar as notícias.</p>
          <button onClick={onCriar} disabled={aCriar}
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-lg text-white ds-gradient disabled:opacity-50">
            {aCriar ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar edição desta semana
          </button>
        </div>
      </div>
    );
  }
  const snap = (u.snapshot_envio ?? {}) as SnapshotResumo;
  const nDest = snap.destaques?.length ?? null;
  const nNews = snap.newsletter?.length ?? null;
  const nSite = snap.site?.length ?? null;
  const dt = u.enviada_em ? new Date(u.enviada_em) : null;
  const dtTxt = dt
    ? new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(dt)
    : "sem data";
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: T.bg, color: T.ink }}>
      <div className="w-full max-w-lg rounded-2xl p-8 anim-rise text-center" style={{ background: T.shell, border: `1px solid ${T.line}`, boxShadow: T.shadow }}>
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: T.okSoft, color: T.okAccent }}>
          <CheckCircle2 size={32} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: T.ok }}>Enviada</p>
        <h1 className="font-display text-2xl font-bold mb-1">Edição #{u.numero}</h1>
        <p className="text-sm mb-1" style={{ color: T.muted }}>{u.assunto || snap.assunto || "—"}</p>
        <p className="text-xs mb-6" style={{ color: T.faint }}>{dtTxt.charAt(0).toUpperCase() + dtTxt.slice(1)}</p>
        {((snap.egoi?.length ?? 0) > 0 && !snap.wordpress) && (
          <div className="mb-6 rounded-lg p-3 text-left text-xs" style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#92400E" }}>
            <p className="font-bold mb-1">Email enviado, mas o post no WordPress falhou.</p>
            <p>Consulta o Registo de Actividade da edição para veres o motivo e publica o post manualmente se necessário.</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="rounded-lg py-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <p className="text-lg font-bold font-display" style={{ color: T.gold }}>{nDest ?? "—"}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Destaques</p>
          </div>
          <div className="rounded-lg py-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <p className="text-lg font-bold font-display" style={{ color: T.primary }}>{nNews ?? "—"}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Newsletter</p>
          </div>
          <div className="rounded-lg py-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <p className="text-lg font-bold font-display" style={{ color: T.ink }}>{nSite ?? "—"}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.muted }}>Só no site</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button onClick={onCriar} disabled={aCriar}
            className="inline-flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-lg text-white ds-gradient disabled:opacity-50">
            {aCriar ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar próxima edição
          </button>
          <Link to="/arquivo"
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg"
            style={{ border: `1px solid ${T.lineStrong}`, color: T.ink }}>
            <Archive size={14} /> Ver arquivo
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers de UI hoisted (evitam remount da árvore em cada render) ─── */



function Modal({ titulo, children, onClose, wide, size, chromeless }: { titulo?: string; children: ReactNode; onClose: () => void; wide?: boolean; size?: "md" | "lg" | "xl" | "cinema"; chromeless?: boolean }) {
  const s = size ?? (wide ? "xl" : "md");
  const widthCls = s === "xl" ? "max-w-5xl" : s === "cinema" ? "max-w-2xl" : s === "lg" ? "max-w-lg" : "max-w-md";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(11,21,35,0.62)", backdropFilter: "blur(6px)" }}
      onClick={onClose} role="dialog" aria-modal="true">
      <div className={`w-full ${widthCls} rounded-2xl ${chromeless ? "" : "p-6"} max-h-[92vh] overflow-hidden anim-rise flex flex-col`}
        style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.ink, boxShadow: T.shadowLg }} onClick={(e) => e.stopPropagation()}>
        {!chromeless && (
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-display font-bold text-lg">{titulo}</h3>
            <button type="button" onClick={onClose} className="p-1 rounded-md" style={{ color: T.muted }} aria-label="Fechar"><X size={18} /></button>
          </div>
        )}
        {chromeless ? children : <div className="overflow-y-auto">{children}</div>}
      </div>
    </div>
  );
}

/* ─── helpers puros de apresentação hoisted (sem closures sobre o estado do Editor) ─── */


function BtnIcone({ onClick, title, children, disabled, danger, active, activeColor }: {
  onClick?: () => void; title?: string; children: ReactNode; disabled?: boolean; danger?: boolean; active?: boolean; activeColor?: string;
}) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} disabled={disabled}
      className="inline-flex items-center justify-center h-11 w-11 sm:h-10 sm:w-10 rounded-xl transition-all disabled:opacity-25"
      style={{ color: active ? activeColor : danger ? T.danger : T.muted, background: active ? `${activeColor}1F` : "transparent" }}
      onMouseEnter={(e) => { if (!disabled && !active) e.currentTarget.style.background = "#F2F4F7"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}










function SaveHint({ bloqueado, estado, erro }: { bloqueado: boolean; estado: AutoSaveEstado; erro: string | null }) {
  if (bloqueado) return null;
  if (estado === "a-guardar") {
    return <span className="hidden sm:inline-flex items-center gap-1 text-[11px]" style={{ color: T.muted }}>
      <Loader2 size={11} className="animate-spin" /> a guardar…
    </span>;
  }
  if (estado === "guardado") {
    return <span className="hidden sm:inline-flex items-center gap-1 text-[11px]" style={{ color: T.ok }}>
      <Check size={11} /> guardado
    </span>;
  }
  if (estado === "erro") {
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.danger }} title={erro ?? undefined}>
      <AlertTriangle size={11} /> erro ao guardar
    </span>;
  }
  return null;
}


/* ─── Blocos isolados: cada um mantém o SEU estado de texto + autosave.
   Escrever aqui NÃO re-renderiza o EditorNewsletter todo. ────────── */

interface CronicaBlocoProps {
  edicaoId: string;
  bloqueado: boolean;
  concluida: boolean;
  aConcluir: boolean;
  onToggleConcluida: () => void;
  seccaoActiva: boolean;
  foldOpen: Record<string, boolean>;
  setFoldOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  tituloInicial: string;
  conteudoInicial: string;
  leiturasInicial: string;
  /** Publica o número de caracteres da crónica para o pai (para a checklist). */
  onLenChange?: (len: number) => void;
  /** Chamado quando um autosave da crónica termina com sucesso (para bump do preview). */
  onGuardado?: () => void;
}

/* ─── Editor estruturado das «Leituras recomendadas» ───────────────────
   Persiste em `cronicas.leituras_recomendadas` no formato Markdown (uma
   por linha): `[Título](https://url)`. Aceita também colagens no formato
   «Título - URL», «Título — URL» ou URL isolado (normaliza ao guardar). */
type Leitura = { titulo: string; url: string };
const RE_URL_LINHA = /(https?:\/\/\S+)/i;
function parseLeituras(raw: string): Leitura[] {
  const linhas = (raw ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return [];
  return linhas.map((linha): Leitura => {
    const md = linha.match(/^\[(.+?)\]\((https?:\/\/\S+?)\)\s*$/);
    if (md) return { titulo: md[1].trim(), url: md[2].trim() };
    const u = linha.match(RE_URL_LINHA);
    if (u) {
      const url = u[1].replace(/[),.;]+$/, "");
      const titulo = linha.replace(url, "").replace(/[\s\-—–:|]+$/, "").replace(/^[\s\-—–:|]+/, "").trim();
      return { titulo, url };
    }
    return { titulo: linha, url: "" };
  });
}
function serializarLeituras(list: Leitura[]): string {
  return list
    .map((l) => {
      const t = l.titulo.trim();
      const u = l.url.trim();
      if (t && u) return `[${t}](${u})`;
      if (u) return u;
      if (t) return t;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function LeiturasEditor({
  valor, onChange, disabled, T,
}: {
  valor: string;
  onChange: (v: string) => void;
  disabled: boolean;
  T: { muted: string; faint: string; ink: string; line: string; lineStrong: string; shell: string; card: string; danger: string };
}) {
  // Estado local sincronizado com a string canónica.
  const [rows, setRows] = useState<Leitura[]>(() => {
    const l = parseLeituras(valor);
    return l.length > 0 ? l : [{ titulo: "", url: "" }];
  });
  // Re-hidrata quando muda de edição (valor externo muda de forma significativa).
  const ultimoValor = useRef(valor);
  useEffect(() => {
    if (valor !== ultimoValor.current && valor !== serializarLeituras(rows)) {
      const l = parseLeituras(valor);
      setRows(l.length > 0 ? l : [{ titulo: "", url: "" }]);
      ultimoValor.current = valor;
    }
  }, [valor, rows]);

  const commit = (next: Leitura[]) => {
    setRows(next);
    const s = serializarLeituras(next);
    ultimoValor.current = s;
    onChange(s);
  };
  const update = (i: number, patch: Partial<Leitura>) => {
    commit(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const remover = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    commit(next.length > 0 ? next : [{ titulo: "", url: "" }]);
  };
  const adicionar = () => commit([...rows, { titulo: "", url: "" }]);

  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const urlInvalido = r.url.trim() !== "" && !/^https?:\/\//i.test(r.url.trim());
        return (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.15fr) auto" }}>
            <input
              type="text"
              value={r.titulo}
              disabled={disabled}
              onChange={(e) => update(i, { titulo: e.target.value })}
              placeholder="Título do artigo"
              className="text-[13.5px] rounded-lg px-3 py-2 disabled:opacity-50 focus:outline-none"
              style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }}
            />
            <input
              type="url"
              value={r.url}
              disabled={disabled}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://…"
              className="text-[13px] font-mono rounded-lg px-3 py-2 disabled:opacity-50 focus:outline-none"
              style={{
                border: `1px solid ${urlInvalido ? T.danger : T.lineStrong}`,
                background: T.shell,
                color: T.ink,
              }}
            />
            <button
              type="button"
              onClick={() => remover(i)}
              disabled={disabled}
              title="Remover"
              className="w-8 h-8 inline-flex items-center justify-center rounded-md disabled:opacity-40 transition-colors"
              style={{ color: T.muted, border: `1px solid ${T.line}`, background: T.card }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={adicionar}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md disabled:opacity-40 transition-colors"
        style={{ color: T.muted, border: `1px dashed ${T.lineStrong}`, background: "transparent" }}
      >
        <Plus size={13} /> Adicionar leitura
      </button>
      <p className="text-[11px]" style={{ color: T.faint }}>
        Só o título fica clicável na newsletter. O URL não aparece.
      </p>
    </div>
  );
}


const CronicaBloco = memo(function CronicaBloco({
  edicaoId, bloqueado, concluida, aConcluir, onToggleConcluida,
  seccaoActiva, foldOpen, setFoldOpen,
  tituloInicial, conteudoInicial, leiturasInicial,
  onLenChange, onGuardado,
}: CronicaBlocoProps) {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [conteudo, setConteudo] = useState(conteudoInicial);
  const [leituras, setLeituras] = useState(leiturasInicial);

  // Rehidrata quando muda a edição (edicaoId como chave) — não a cada refetch.
  const hidratadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (hidratadoRef.current !== edicaoId) {
      setTitulo(tituloInicial);
      setConteudo(conteudoInicial);
      setLeituras(leiturasInicial);
      hidratadoRef.current = edicaoId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId]);

  // `contexto` prende cada gravação ao edicao_id em que o texto foi escrito.
  const tituloAS = useAutoSave(titulo,
    async (v, ctx) => { await atualizarCronica(ctx ?? edicaoId, { titulo: v }); onGuardado?.(); },
    { enabled: !bloqueado, contexto: edicaoId });
  const conteudoAS = useAutoSave(conteudo,
    async (v, ctx) => { await atualizarCronica(ctx ?? edicaoId, { conteudo_html: v }); onGuardado?.(); },
    { enabled: !bloqueado, contexto: edicaoId });
  const leiturasAS = useAutoSave(leituras,
    async (v, ctx) => { await atualizarCronica(ctx ?? edicaoId, { leituras_recomendadas: v }); onGuardado?.(); },
    { enabled: !bloqueado, contexto: edicaoId });


  // Publica o comprimento textual (throttle simples com ref) para a checklist do pai.
  const ultimoLen = useRef(-1);
  useEffect(() => {
    const len = conteudo.replace(/<[^>]+>/g, "").trim().length;
    if (len !== ultimoLen.current) {
      ultimoLen.current = len;
      onLenChange?.(len);
    }
  }, [conteudo, onLenChange]);

  const vazia = conteudo.replace(/<[^>]+>/g, "").trim().length === 0;
  const cor = concluida ? COR_EDITORIAL : COR_ATENCAO;
  const aviso = vazia ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: T.warnSoft, color: T.warn, borderColor: T.warnAccent, letterSpacing: 0, textTransform: "none" }}>
      <AlertTriangle size={11} /> Vazia
    </span>
  ) : null;
  const contador = `${conteudo.replace(/<[^>]+>/g, "").trim().length} car.`;

  return (
    <Foldable foldOpen={foldOpen} setFoldOpen={setFoldOpen} secId="cronica"
      icon={SECS.cronica.icon} accent={cor} titulo={SECS.cronica.titulo} defaultOpen
      aviso={aviso} contador={contador}
      acao={
        <button type="button" disabled={bloqueado || aConcluir} onClick={onToggleConcluida}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold h-8 px-2.5 rounded-md disabled:opacity-40 transition-colors"
          style={concluida
            ? { background: T.okSoft, color: T.ok, border: `1px solid ${T.okSoft}` }
            : { background: T.card, color: T.muted, border: `1px solid ${T.lineStrong}` }}
          title={concluida ? "Marcada como concluída — clica para reabrir" : "Marcar crónica como concluída"}>
          {concluida ? <><CheckCircle2 size={13} /> Concluída</> : <><Check size={13} /> Marcar concluída</>}
        </button>
      }>
      {vazia && seccaoActiva && (
        <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: T.warnSoft, color: T.warn, border: `1px solid ${T.warnAccent}` }}>
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Sem texto — escreve ou desliga a secção na Estrutura.</span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs font-semibold" style={{ color: T.muted }}>Título da crónica (opcional)</label>
        <SavedTick s={tituloAS.estado} err={tituloAS.err} />
      </div>
      <EditableWrap>
        <input type="text" value={titulo} disabled={bloqueado}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: A reestruturação da Inteligência Artificial"
          className="w-full text-[15px] font-display font-semibold rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
          style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
      </EditableWrap>
      <div className="flex items-center gap-2 mt-4 mb-2">
        <span className="text-xs font-semibold" style={{ color: T.muted }}>Texto da crónica</span>
      </div>
      <CronicaEditor
        html={conteudo} disabled={bloqueado}
        pronto
        onChange={setConteudo}
        accent={cor} line={T.lineStrong} ink={T.ink} muted={T.muted} card={T.card} shell={T.shell}
        autoSaveEstado={conteudoAS.estado} autoSaveErr={conteudoAS.err}
        onRepetir={() => { void conteudoAS.repetir(); }}
        vazio={vazia}
      />

      <div className="flex items-center gap-2 mt-4 mb-2">
        <label className="text-xs font-semibold" style={{ color: T.muted }}>Leituras recomendadas</label>
        <SavedTick s={leiturasAS.estado} err={leiturasAS.err} vazio={!leituras.trim()} />
      </div>
      <LeiturasEditor valor={leituras} onChange={setLeituras} disabled={bloqueado} T={T} />
    </Foldable>
  );
});


interface ConsultoriaBlocoProps {
  edicaoId: string;
  bloqueado: boolean;
  activa: boolean;
  foldOpen: Record<string, boolean>;
  setFoldOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  valoresIniciais: { titulo: string; subtitulo: string; texto_botao: string; url_botao: string };
  onGuardado?: () => void;
}

const ConsultoriaBloco = memo(function ConsultoriaBloco({
  edicaoId, bloqueado, activa, foldOpen, setFoldOpen, valoresIniciais, onGuardado,
}: ConsultoriaBlocoProps) {
  const [titulo, setTitulo] = useState(valoresIniciais.titulo);
  const [subtitulo, setSubtitulo] = useState(valoresIniciais.subtitulo);
  const [textoBotao, setTextoBotao] = useState(valoresIniciais.texto_botao);
  const [urlBotao, setUrlBotao] = useState(valoresIniciais.url_botao);

  const hidratadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (hidratadoRef.current !== edicaoId) {
      setTitulo(valoresIniciais.titulo);
      setSubtitulo(valoresIniciais.subtitulo);
      setTextoBotao(valoresIniciais.texto_botao);
      setUrlBotao(valoresIniciais.url_botao);
      hidratadoRef.current = edicaoId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId]);

  const tituloAS = useAutoSave(titulo,
    async (v) => { await atualizarConsultoria(edicaoId, { titulo: v }); onGuardado?.(); },
    { enabled: !bloqueado });
  const subtituloAS = useAutoSave(subtitulo,
    async (v) => { await atualizarConsultoria(edicaoId, { subtitulo: v }); onGuardado?.(); },
    { enabled: !bloqueado });
  const textoBotaoAS = useAutoSave(textoBotao,
    async (v) => { await atualizarConsultoria(edicaoId, { texto_botao: v }); onGuardado?.(); },
    { enabled: !bloqueado });
  const urlBotaoAS = useAutoSave(urlBotao,
    async (v) => { await atualizarConsultoria(edicaoId, { url_botao: v }); onGuardado?.(); },
    { enabled: !bloqueado });

  const aviso = !activa ? (
    <span className="text-[12px]" style={{ color: T.muted }}>
      Secção desactivada — activa em «Estrutura da edição» para aparecer no email.
    </span>
  ) : null;

  return (
    <Foldable foldOpen={foldOpen} setFoldOpen={setFoldOpen} secId="consultoria"
      icon={SECS.consultoria.icon} accent={SECS.consultoria.cor} titulo={SECS.consultoria.titulo}
      defaultOpen={false} aviso={aviso}
      contador={activa ? (textoBotao || "—") : "off"}>
      <p className="text-xs mb-3" style={{ color: T.faint }}>
        Cartão preto inserido logo a seguir à crónica — só é enviado se a crónica existir. Ajusta o texto para ligar ao tema da semana.
      </p>
      <div className="grid gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-semibold" style={{ color: T.muted }}>Título</label>
            <SavedTick s={tituloAS.estado} err={tituloAS.err} />
          </div>
          <input value={titulo} disabled={bloqueado}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full text-sm rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
            style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-semibold" style={{ color: T.muted }}>Subtítulo</label>
            <SavedTick s={subtituloAS.estado} err={subtituloAS.err} />
          </div>
          <textarea value={subtitulo} disabled={bloqueado} rows={3}
            onChange={(e) => setSubtitulo(e.target.value)}
            className="w-full text-sm leading-relaxed rounded-lg px-3.5 py-3 resize-y disabled:opacity-50 focus:outline-none"
            style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold" style={{ color: T.muted }}>Texto do botão</label>
              <SavedTick s={textoBotaoAS.estado} err={textoBotaoAS.err} />
            </div>
            <input value={textoBotao} disabled={bloqueado}
              onChange={(e) => setTextoBotao(e.target.value)}
              className="w-full text-sm rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
              style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-semibold" style={{ color: T.muted }}>URL do botão</label>
              <SavedTick s={urlBotaoAS.estado} err={urlBotaoAS.err} />
            </div>
            <input value={urlBotao} disabled={bloqueado} type="url" inputMode="url"
              onChange={(e) => setUrlBotao(e.target.value)}
              placeholder="https://…"
              className="w-full text-sm rounded-lg px-3.5 py-2.5 disabled:opacity-50 focus:outline-none"
              style={{ border: `1px solid ${T.lineStrong}`, background: T.shell, color: T.ink }} />
          </div>
        </div>
      </div>
    </Foldable>
  );
});


export default function EditorNewsletter({ selo }: { selo?: React.ReactNode } = {}) {


  const qc = useQueryClient();
  const sessao = useSessao();
  const { nomeExibicao, isAdmin, papel, loading: sessaoALoad, perfilErro } = sessao;
  const papelDesconhecido = sessaoALoad || papel === null;
  const navigate = useNavigate();
  const { data: defIA } = useDefinicoesIA();
  const iaConfigurada = defIA?.estado === "configurada";
  const iaTooltip = !defIA
    ? "A carregar definições…"
    : defIA.estado === "configurada"
      ? `IA: ${defIA.provider === "deepseek" ? "DeepSeek" : "Lovable AI"} · ${defIA.modelo}`
      : "Configura a integração de IA em Definições primeiro";

  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const previewRef = useRef<HTMLDivElement>(null);
  const focarPreview = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTab("preview");
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    } else {
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const [toast, setToast] = useState<string | null>(null);
  const [toastMeta, setToastMeta] = useState<{ tipo: "ok" | "erro"; accao: { rotulo: string; fn: () => void } | null } | null>(null);
  /** Estado por cartão pendente: acção em curso e resultado breve antes de sair da lista. */
  const [accaoPend, setAccaoPend] = useState<Record<string, "aprovar" | "rejeitar">>({});
  const [resultadoPend, setResultadoPend] = useState<Record<string, "aprovada" | "rejeitada">>({});
  const [modal, setModal] = useState<null | "enviar" | "adicionar" | "fontes" | "html" | "limpar-antigas" | "links">(null);
  const [mostrarTodosEpisodios, setMostrarTodosEpisodios] = useState(false);

  // Fila de blocos colados — cada bloco é processado pela IA em segundo plano,
  // permitindo colar novos blocos sem esperar pelos anteriores.
  const [novosPendentesIds, setNovosPendentesIds] = useState<Set<string>>(new Set());
  const pendentesRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (novosPendentesIds.size === 0) return;
    const t = window.setTimeout(() => setNovosPendentesIds(new Set()), 2600);
    return () => window.clearTimeout(t);
  }, [novosPendentesIds]);
  const [filtroPend, setFiltroPend] = useState<"hoje" | "semana" | "tudo">("tudo");
  const [filtroOrigem, setFiltroOrigem] = useState<"todos" | "email" | "rss" | "whatsapp" | "manual">("todos");
  const [soRastreio, setSoRastreio] = useState(false);
  const PEND_PAGINA = 10;
  const [limitePend, setLimitePend] = useState(PEND_PAGINA);
  useEffect(() => { setLimitePend(PEND_PAGINA); }, [filtroPend, filtroOrigem, soRastreio]);

  // `listasSel` vem do hook partilhado de envio.
  const [editando, setEditando] = useState<string | null>(null);
  /** Cartões pendentes abertos em simultâneo: id → rascunho independente. */
  const [pendAbertos, setPendAbertos] = useState<Record<string, { titulo: string; descricao: string; categoria: CatId; url: string }>>({});
  /** Fecha um cartão pendente e descarta o respectivo rascunho. */
  const fecharPend = useCallback((id: string) => {
    setPendAbertos((s) => { if (!(id in s)) return s; const c = { ...s }; delete c[id]; return c; });
  }, []);

  const [foldOpen, setFoldOpen] = useState<Record<string, boolean>>({});
  const [catExpandido, setCatExpandido] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<{ titulo: string; descricao: string; categoria: CatId; url: string }>({ titulo: "", descricao: "", categoria: "ia", url: "" });

  
  const [htmlReal, setHtmlReal] = useState<{ estado: "load" | "ok" | "erro"; html?: string; erro?: string }>({ estado: "load" });
  const [htmlFeedback, setHtmlFeedback] = useState<null | { tipo: "ok" | "erro"; texto: string }>(null);

  const [seccaoModal, setSeccaoModal] = useState<null | { modo: "criar" } | { modo: "editar"; seccao: SeccaoRow }>(null);
  const [envioErro, setEnvioErro] = useState<string | null>(null);
  const [erroModal, setErroModal] = useState<{ titulo: string; mensagem: string; detalhe?: string } | null>(null);
  const [confirmNumero, setConfirmNumero] = useState("");
  // Agendamento (data/hora + WordPress) vem do hook partilhado.


  const [envioFase, setEnvioFase] = useState<"checklist" | "verificar-links" | "revisao" | "confirmacao" | "confirmar-disparo" | "resultado">("checklist");
  // (removido) checkbox "incluir WordPress" no envio — a Lição é sempre criada em rascunho
  // no botão "Criar rascunho" e o envio final apenas a passa a published.
  // Progresso do disparo vem do hook partilhado (ver `useEnvioNewsletter`).

  // «Publicar tudo» (modo teste): site → rascunho E-goi → email de teste.
  type PassoBundle = { id: "site" | "rascunho" | "teste"; rotulo: string; estado: "espera" | "a_correr" | "ok" | "erro"; detalhe?: string; url?: string };
  const [bundlePassos, setBundlePassos] = useState<PassoBundle[]>([]);
  const bundleActivoRef = useRef(false);
  // URLs tratados na Fase 2 (editados ou rejeitados) — saem já da lista sem
  // esperar por nova verificação completa.
  const [linksResolvidos, setLinksResolvidos] = useState<string[]>([]);
  const resetEnvioModal = () => {
    setEnvioFase("checklist");
    setConfirmNumero("");
    setEnvioErro(null);
    setProgressoDisparo([]);
    setBundlePassos([]);
    setLinksResolvidos([]);
    bundleActivoRef.current = false;
  };




  const notify = (m: string, opts?: { tipo?: "ok" | "erro"; accao?: { rotulo: string; fn: () => void } }) => {
    setToast(m);
    setToastMeta({ tipo: opts?.tipo ?? "ok", accao: opts?.accao ?? null });
    setTimeout(() => { setToast(null); setToastMeta(null); }, opts?.accao ? 6000 : 3200);
  };
  /** Vibração curta a confirmar o toque (só telemóveis que o suportem). */
  const vibrar = (ms = 12) => {
    try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms); } catch { /* ignora */ }
  };

  // Modal "Sugerir organização IA" — nunca aplica sozinho.
  const [modalSugestaoAberto, setModalSugestaoAberto] = useState(false);




  /* ─── queries ─── */
  const { edicao: edicaoParam, retomar: retomarParam } = useSearch({ strict: false }) as { edicao?: string; retomar?: string };
  const edicaoSel = edicaoParam ?? "";
  const edicaoQ = useQuery({
    queryKey: ["edicao-atual", edicaoSel],
    queryFn: () => (edicaoSel ? getEdicaoPorId(edicaoSel) : getEdicaoAtual()),
  });
  const rascunhosQ = useQuery({ queryKey: ["rascunhos"], queryFn: listarRascunhos });
  const rascunhos = rascunhosQ.data ?? [];

  const edicao = edicaoQ.data ?? null;
  const edicaoId = edicao?.id ?? null;

  // After an edition is sent, start the next one automatically (once).
  const tentouSeguinte = useRef(false);
  useEffect(() => {
    if (edicaoSel || !edicaoQ.isSuccess || edicaoQ.data || tentouSeguinte.current) return;
    tentouSeguinte.current = true;
    garantirEdicaoSeguinte()
      .then((r) => {
        if (!r) return;
        notify(`A #${r.anterior} foi enviada. Começaste a #${r.criada}.`);
        void qc.invalidateQueries({ queryKey: ["edicao-atual"] });
        void qc.invalidateQueries({ queryKey: ["rascunhos"] });
      })
      .catch(() => { /* fallback: the "create edition" screen stays visible */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoSel, edicaoQ.isSuccess, edicaoQ.data]);

  // Fluxo operacional de envio (listas, disparo sequencial, repetição e
  // agendamento) partilhado com o Editor Revista. A UI abaixo mantém-se igual.
  const envioCtl = useEnvioNewsletter({
    edicaoId,
    numero: edicao?.numero ?? null,
    onDisparoConcluido: (r) => {
      invalidateNoticias(); invalidateAudit(); invalidateCampanhasEgoi();
      if (r.falhas === 0) {
        if (!bundleActivoRef.current) { setModal(null); resetEnvioModal(); }
        notify(r.modo === "real"
          ? `Enviada · ${r.sucessos} lista(s)`
          : "Teste disparado · verifica a caixa de entrada");
      } else {
        const falhadas = r.resultados.filter((x) => !x.ok).map((x) => `${x.lista_nome}: ${x.erro}`).join("\n");
        setEnvioErro(`${r.mensagem}`);
        if (!bundleActivoRef.current) setErroModal({
          titulo: r.modo === "real" ? "Envio real parcial" : "Envio de teste falhou",
          mensagem: r.mensagem,
          detalhe: falhadas,
        });
        notify(`Envio parcial · ${r.sucessos} de ${r.sucessos + r.falhas} listas`);
      }
    },
    onDisparoErro: (msg) => {
      setEnvioErro(msg);
      if (!bundleActivoRef.current) setErroModal({ titulo: "Falha no disparo E-goi", mensagem: msg, detalhe: msg });
    },
    onRepetirConcluido: (r) => {
      invalidateAudit(); invalidateCampanhasEgoi();
      if (r.ok) notify(`Enviada para «${r.lista_nome}»`);
      else setEnvioErro(`${r.lista_nome}: ${r.erro ?? "falhou de novo"}`);
    },
    onRepetirErro: (msg) => setEnvioErro(msg),
    onAgendado: (r) => {
      invalidateAudit();
      setModal(null); resetEnvioModal();
      notify(`Envio agendado para ${new Date(r.agendado_para).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}`);
    },
    onAgendarErro: (msg) => {
      setEnvioErro(msg);
      setErroModal({ titulo: "Falha ao agendar", mensagem: msg, detalhe: msg });
    },
    onCancelado: () => { invalidateAudit(); notify("Agendamento cancelado"); },
    onCancelarErro: (msg) => setErroModal({ titulo: "Falha ao cancelar agendamento", mensagem: msg }),
  });
  const {
    listasSel, setListasSel, progresso: progressoDisparo, setProgresso: setProgressoDisparo,
    esperaSeg, agendarQuando, setAgendarQuando, agendarWp, setAgendarWp,
    disparar: disparoM, repetirLista: repetirListaM, agendar: agendarM,
    cancelarAgendamento: cancelarAgendamentoM,
  } = envioCtl;

  // Aviso quando este rascunho é anterior à última edição já enviada.
  const obsoletoQ = useQuery({
    queryKey: ["rascunho-obsoleto", edicaoId, edicao?.created_at],
    queryFn: () => rascunhoObsoleto(edicao ? { created_at: edicao.created_at } : null),
    enabled: !!edicao?.created_at && edicao?.estado === "rascunho",
  });
  const obsoleto = obsoletoQ.data?.obsoleto ? obsoletoQ.data : null;



  // Rede de segurança: rascunho que já teve disparo real para subscritores.
  const envioPendenteQ = useQuery({
    queryKey: ["envio-real-pendente", edicaoId],
    queryFn: () => detectarEnvioRealPendente(edicaoId!),
    enabled: !!edicaoId && edicao?.estado === "rascunho",
  });
  const envioRealPendente = envioPendenteQ.data ?? null;

  // Um disparo parcial NÃO bloqueia a edição: só uma edição fechada
  // (estado "enviada") entra em modo leitura. Assim é sempre possível
  // repetir uma lista falhada ou disparar um teste interno.
  const bloqueado = edicao?.estado === "enviada";
  const podeEditar = !bloqueado;



  const pendentesQ = useQuery({ queryKey: ["pendentes"], queryFn: listarPendentes });
  const aprovadasQ = useQuery({
    queryKey: ["aprovadas", edicaoId],
    queryFn: () => listarAprovadasDaEdicao(edicaoId!),
    enabled: !!edicaoId,
    placeholderData: (prev) => prev,
  });
  const episodiosQ = useQuery({ queryKey: ["episodios"], queryFn: listarEpisodios });
  const podcastRssUrlQ = useQuery({ queryKey: ["config", "podcast_rss_url"], queryFn: () => getConfig("podcast_rss_url") });
  const fontesQ = useQuery({ queryKey: ["fontes"], queryFn: listarFontes });
  const fontesContagemQ = useQuery({ queryKey: ["fontes-contagem-30d"], queryFn: contarNoticiasPorFonte30d });
  const fontesStatsQ = useQuery({ queryKey: ["fontes-stats-30d"], queryFn: listarEstatisticasFontes });
  const curadoriaConfigQ = useQuery({ queryKey: ["curadoria-config"], queryFn: getCuradoriaConfig });
  const ultimaCorridaQ = useQuery({ queryKey: ["curadoria-ultima-corrida"], queryFn: getUltimaCorridaCuradoria });



  const auditQ = useQuery({ queryKey: ["audit"], queryFn: () => listarAuditRecente(8) });
  // Contagem de ferramentas preenchidas — só para a checklist do cabeçalho-validador.
  const ferramentasCountQ = useQuery({
    queryKey: ["ferramentas-count", edicaoId],
    queryFn: async () => {
      if (!edicaoId) return 0;
      const { count, error } = await supabase
        .from("nl_ferramentas_semana")
        .select("id", { count: "exact", head: true })
        .eq("edicao_id", edicaoId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!edicaoId,
  });
  // Lista completa de ferramentas — usada para o Preview reagir a mudanças
  // de emoji/cor/nome/url. Partilha queryKey com FerramentasSemana.
  const ferramentasQ = useQuery({
    queryKey: ["ferramentas", edicaoId],
    queryFn: () => listarFerramentas(edicaoId!),
    enabled: !!edicaoId,
  });
  const ferramentasLista = ferramentasQ.data ?? [];
  const listasEgoiQ = useQuery({ queryKey: ["listas-egoi"], queryFn: listarListasEgoi });
  const listasEgoi = listasEgoiQ.data ?? [];
  useEffect(() => {
    if (listasEgoi.length > 0 && listasSel.length === 0) {
      const primeiroTeste = listasEgoi.find((l) => l.tipo === "teste" && l.activa);
      if (primeiroTeste) setListasSel([primeiroTeste.id]);
    }
  }, [listasEgoi.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Campanhas E-goi já criadas para esta edição (para mostrar "rascunho já criado" por lista)
  const campanhasEgoiQ = useQuery({
    queryKey: ["egoi-campanhas", edicaoId],
    queryFn: async () => {
      if (!edicaoId) return [] as Array<{ lista_id: string; campaign_hash: string; estado: string; actualizado_em: string }>;
      const { data, error } = await supabase.from("nl_egoi_campanhas")
        .select("lista_id, campaign_hash, estado, actualizado_em")
        .eq("edicao_id", edicaoId);
      if (error) throw error;
      return (data ?? []) as Array<{ lista_id: string; campaign_hash: string; estado: string; actualizado_em: string }>;
    },
    enabled: !!edicaoId,
  });
  const campanhasEgoi = campanhasEgoiQ.data ?? [];
  const campanhaPorLista = useMemo(() => {
    const map = new Map<string, { campaign_hash: string; estado: string; actualizado_em: string }>();
    for (const c of campanhasEgoi) map.set(c.lista_id, c);
    return map;
  }, [campanhasEgoi]);
  /* Reenvio: listas que já receberam esta edição num disparo anterior. */
  const listasJaEnviadas = useMemo(
    () => new Set(campanhasEgoi.filter((c) => c.estado === "enviada").map((c) => c.lista_id)),
    [campanhasEgoi],
  );
  const eReenvio = listasJaEnviadas.size > 0;

  // Chegada a partir de «Edições passadas» com ?retomar=1: pré-selecciona as
  // listas em falta e leva o utilizador ao painel de estado do envio.
  const retomaFeitaRef = useRef(false);
  useEffect(() => {
    if (retomarParam !== "1" || retomaFeitaRef.current) return;
    if (listasEgoi.length === 0 || listasJaEnviadas.size === 0) return;
    const emFalta = listasEgoi.filter((l) => l.activa && !listasJaEnviadas.has(l.id)).map((l) => l.id);
    if (emFalta.length > 0) setListasSel(emFalta);
    retomaFeitaRef.current = true;
    requestAnimationFrame(() => {
      document.getElementById("painel-envio-parcial")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [retomarParam, listasEgoi, listasJaEnviadas]);

  const dataUltimoDisparo = useMemo(() => {
    const datas = campanhasEgoi.filter((c) => c.estado === "enviada").map((c) => c.actualizado_em).sort();
    return datas.length > 0 ? datas[datas.length - 1] : null;
  }, [campanhasEgoi]);
  const invalidateCampanhasEgoi = () => { if (edicaoId) qc.invalidateQueries({ queryKey: ["egoi-campanhas", edicaoId] }); };

  /* Alinhar com a E-goi: a E-goi é a fonte da verdade sobre o que saiu.
     Evita "por enviar" falso quando a resposta ao disparo se perdeu. */
  const alinharEgoi = useMutation({
    mutationFn: async () => reconciliarEdicaoFn({ data: { edicao_id: edicaoId! } }),
    onSuccess: (r) => {
      if (r.actualizadas.length > 0) {
        notify(`E-goi confirma o envio a ${r.actualizadas.map((x: { lista_nome: string }) => x.lista_nome).join(", ")}`);
        invalidateCampanhasEgoi();
      }
    },
  });
  // Confirmação automática sempre que existem listas por enviar num disparo real.
  const alinhamentoFeitoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!edicaoId || campanhasEgoi.length === 0) return;
    if (!campanhasEgoi.some((c) => c.estado !== "enviada")) return;
    if (alinhamentoFeitoRef.current === edicaoId) return;
    alinhamentoFeitoRef.current = edicaoId;
    alinharEgoi.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, campanhasEgoi.length]);

  const seccoesQ = useQuery({
    queryKey: ["seccoes", edicaoId],
    queryFn: () => listarSeccoes(edicaoId!),
    enabled: !!edicaoId,
  });
  const seccoes = (seccoesQ.data ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const seccoesActivas = seccoes.filter((s) => s.activo);
  const seccaoActiva = (t: SeccaoTipo) => seccoesActivas.some((s) => s.tipo === t);
  const invalidateSeccoes = () => { if (edicaoId) qc.invalidateQueries({ queryKey: ["seccoes", edicaoId] }); };

  const pendentes = pendentesQ.data ?? [];
  const aprovadas = aprovadasQ.data ?? [];
  const episodios = episodiosQ.data ?? [];
  const fontes = fontesQ.data ?? [];
  const audit = auditQ.data ?? [];
  const contagemFontes30d = fontesContagemQ.data ?? {};
  const statsFontes = fontesStatsQ.data ?? {};
  const curadoriaConfig = curadoriaConfigQ.data;

  // Filtros por antiguidade + origem + links de rastreio
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
  /** Precisa de fonte: link de rastreio por resolver ou fonte por confirmar. */
  const precisaFonte = useCallback((n: Noticia) => {
    const est = estadoFonte((n as { fonte_estado?: string | null }).fonte_estado);
    return est === "por_confirmar" || (isLinkRastreio(n.url) && est !== "resolvida");
  }, []);
  const pendentesOrdenadas = [
    ...pendentesFiltradas.filter((n) => !precisaFonte(n)),
    ...pendentesFiltradas.filter((n) => precisaFonte(n)),
  ];
  const pendentesVisiveis = pendentesOrdenadas.slice(0, limitePend);
  const pendentesProntas = pendentesVisiveis.filter((n) => !precisaFonte(n));
  const pendentesPorConfirmar = pendentesVisiveis.filter((n) => precisaFonte(n));
  const pendentesPorMostrar = pendentesOrdenadas.length - pendentesVisiveis.length;
  const totalRastreio = pendentes.filter((n) => isLinkRastreio(n.url)).length;
  const abertosCount = Object.keys(pendAbertos).length;

  // Aviso de acumulação: >20 pendentes com >14 dias
  const idsAntigas = pendentes.filter((n) => idadeEmDias(n.created_at) > 14).map((n) => n.id);
  const antigasCount = idsAntigas.length;

  // ── Categorias ocultas no email + resolver de destino efectivo.
  const categoriasOcultasSet = useMemo(() => {
    const raw = (edicao as unknown as { categorias_ocultas_email?: unknown } | null | undefined)
      ?.categorias_ocultas_email;
    const arr = Array.isArray(raw) ? (raw as unknown[]).filter((v): v is string => typeof v === "string") : [];
    return new Set(arr);
  }, [edicao]);
  const destinoResolvido = useMemo(() => {
    const itens = aprovadas.map((n) => {
      const rawOverride = (n as unknown as { override_destino?: unknown }).override_destino;
      const override: OverrideDestino =
        rawOverride === "email" || rawOverride === "site" ? rawOverride : "auto";
      return {
        id: n.id,
        ordem: n.ordem ?? 0,
        categoria: n.categoria as string,
        destaque: !!n.destaque,
        override,
      };
    });
    return resolverDestinos(itens, {
      categoriasOcultas: categoriasOcultasSet,
      maxTotal: MAX_TOTAL_EMAIL,
      maxPorCategoria: MAX_POR_CATEGORIA,
    });
  }, [aprovadas, categoriasOcultasSet]);
  const destinoEfectivoDe = useCallback(
    (id: string): "email" | "site" => destinoResolvido.get(id)?.destino ?? "site",
    [destinoResolvido],
  );
  const razaoDestinoDe = useCallback(
    (id: string) => destinoResolvido.get(id)?.razao,
    [destinoResolvido],
  );
  const overrideDe = (n: { override_destino?: unknown } | Noticia): OverrideDestino => {
    const raw = (n as { override_destino?: unknown }).override_destino;
    return raw === "email" || raw === "site" ? raw : "auto";
  };

  // Reconciliador: sincroniza `noticias.destino` (persistido) com o destino
  // efectivo do resolver, para que Preview e envio E-goi/WP continuem
  // consistentes. Corre em background; ignora erros silenciosamente.
  const reconciliandoRef = useRef(false);
  useEffect(() => {
    if (reconciliandoRef.current) return;
    if (aprovadas.length === 0 || destinoResolvido.size === 0) return;
    const diffs: Array<{ id: string; destino: "news" | "site" }> = [];
    for (const n of aprovadas) {
      const eff = destinoResolvido.get(n.id)?.destino ?? "site";
      const alvo: "news" | "site" = eff === "email" ? "news" : "site";
      if (n.destino !== alvo) diffs.push({ id: n.id, destino: alvo });
    }
    if (diffs.length === 0) return;
    reconciliandoRef.current = true;
    sincronizarDestinos(diffs)
      .then(() => qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] }))
      .catch(() => undefined)
      .finally(() => { reconciliandoRef.current = false; });
  }, [aprovadas, destinoResolvido, qc, edicaoId]);

  const destaques = aprovadas.filter((n) => n.destaque);
  const naNews = aprovadas.filter((n) => destinoEfectivoDe(n.id) === "email");
  const soSite = aprovadas.filter((n) => destinoEfectivoDe(n.id) === "site");
  // ids memoizados para o dnd-kit — evita remedição do SortableContext em cada render
  const idsSeccoes = useMemo(() => seccoes.map((s) => s.id), [seccoes]);
  const idsAprovadas = useMemo(() => aprovadas.map((n) => n.id), [aprovadas]);


  const invalidateAudit = () => qc.invalidateQueries({ queryKey: ["audit"] });
  // Suprime echoes Realtime das nossas próprias mutações (evita refetch que
  // esvazia momentaneamente a lista e faz saltar o scroll para o topo em mobile).
  const supressorNoticiasAte = useRef(0);
  const suprimirNoticiasPor = (ms: number) => { supressorNoticiasAte.current = Date.now() + ms; };
  const invalidateNoticias = () => {
    if (Date.now() < supressorNoticiasAte.current) return;
    qc.invalidateQueries({ queryKey: ["pendentes"] });
    qc.invalidateQueries({ queryKey: ["fontes-contagem-30d"] });
    if (edicaoId) qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] });
  };


  /* ─── realtime — só reage a mudanças materiais que outra sessão fez ─── */
  useEffect(() => {
    const cacheEdicao = () => qc.getQueryData<{ id: string; estado: string; numero: number; data_envio_prevista: string | null } | null>(["edicao-atual", edicaoSel]) ?? null;
    const ch = supabase
      .channel("editor-newsletter")
      .on("postgres_changes", { event: "*", schema: "public", table: "nl_noticias" }, invalidateNoticias)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nl_audit_log" }, invalidateAudit)
      .on("postgres_changes", { event: "*", schema: "public", table: "nl_edicoes" }, (payload) => {
        // Ignora echoes das nossas próprias escritas (assunto, snapshot, etc.).
        // Só refetch se a edição actual mudou de estado, ou se apareceu outra edição.
        const cur = cacheEdicao();
        const novo = (payload.new ?? {}) as { id?: string; estado?: string; numero?: number; data_envio_prevista?: string | null };
        if (!cur) { qc.invalidateQueries({ queryKey: ["edicao-atual"] }); return; }
        if (novo.id === cur.id) {
          if (novo.estado && novo.estado !== cur.estado) qc.invalidateQueries({ queryKey: ["edicao-atual"] });
          return;
        }
        // Outra edição — só interessa se agora é ela o rascunho mais recente
        if (novo.estado === "rascunho" && (novo.numero ?? 0) > (cur.numero ?? 0)) {
          qc.invalidateQueries({ queryKey: ["edicao-atual"] });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nl_secoes_edicao" }, invalidateSeccoes)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "nl_secoes_edicao" }, invalidateSeccoes)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, edicaoSel]);

  /* Garante secções-padrão em edições antigas */
  useEffect(() => {
    if (edicaoId && seccoesQ.data && seccoesQ.data.length === 0) {
      garantirSeccoesPadrao(edicaoId).then(invalidateSeccoes).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, seccoesQ.data?.length]);

  const [modalNovaEdicao, setModalNovaEdicao] = useState(false);

  /* ─── mutations ─── */
  const criarEdicao = useMutation({
    mutationFn: (f: FormatoEdicao) => criarEdicaoDaSemana(f),
    onSuccess: () => {
      setModalNovaEdicao(false);
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      invalidateAudit();
      notify("Edição criada");
    },
  });

  // Reconciliação: fechar a edição que já foi enviada e abrir a seguinte.
  const reconciliar = useMutation({
    mutationFn: async (args: { criarSeguinte: boolean }) => {
      if (!edicaoId || !envioRealPendente) throw new Error("Sem edição a reconciliar");
      await fecharEdicaoManualmente(edicaoId, envioRealPendente);
      if (args.criarSeguinte) await criarEdicaoDaSemana();
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries();
      notify(vars.criarSeguinte ? "Edição fechada e nova edição criada" : "Edição fechada");
    },
    onError: (e) => notify(e instanceof Error ? e.message : "Falha a fechar a edição"),
  });



  /** Marca o cartão como concluído durante ~1s antes de o deixar sair da lista. */
  const concluirCartao = useCallback((id: string, estado: "aprovada" | "rejeitada") => {
    setAccaoPend((s) => { const c = { ...s }; delete c[id]; return c; });
    setResultadoPend((s) => ({ ...s, [id]: estado }));
    window.setTimeout(() => {
      setResultadoPend((s) => { const c = { ...s }; delete c[id]; return c; });
    }, 1100);
  }, []);

  const aprovar = useMutation({
    mutationFn: async (args: { n: Noticia; patch?: Partial<Noticia> }) => {
      if (!edicaoId) throw new Error("Sem edição");
      await aprovarNoticia(args.n.id, edicaoId, args.patch);
      await registarAudit(nomeExibicao, `Aprovou «${stripLeadingEmoji(args.patch?.titulo ?? args.n.titulo).slice(0, 40)}…»`);
    },
    onMutate: (vars) => { vibrar(); setAccaoPend((s) => ({ ...s, [vars.n.id]: "aprovar" })); },
    onSuccess: (_d, vars) => {
      concluirCartao(vars.n.id, "aprovada");
      invalidateNoticias(); invalidateAudit(); fecharPend(vars.n.id);
      notify("Aprovada — entra na newsletter e no site");
    },
    onError: (e, vars) => {
      setAccaoPend((s) => { const c = { ...s }; delete c[vars.n.id]; return c; });
      notify(`Não foi possível aprovar: ${(e as Error)?.message ?? "erro"}`, { tipo: "erro" });
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
      invalidateNoticias(); invalidateAudit(); fecharPend(n.id);
      notify("Rejeitada — sai da fila de pendentes", {
        accao: {
          rotulo: "Anular",
          fn: () => {
            patchNoticia.mutate({ id: n.id, patch: { estado: "pendente" }, log: `Anulou a rejeição de «${stripLeadingEmoji(n.titulo).slice(0, 40)}…»` });
            notify("Rejeição anulada — voltou a pendentes");
          },
        },
      });
    },
    onError: (e, n) => {
      setAccaoPend((s) => { const c = { ...s }; delete c[n.id]; return c; });
      notify(`Não foi possível rejeitar: ${(e as Error)?.message ?? "erro"}`, { tipo: "erro" });
    },
  });

  const apagar = useMutation({
    mutationFn: async (n: Noticia) => {
      await apagarNoticia(n.id);
      await registarAudit(nomeExibicao, `Removeu «${stripLeadingEmoji(n.titulo).slice(0, 34)}…» da edição`);
    },
    onSuccess: () => { invalidateNoticias(); invalidateAudit(); notify("Notícia removida"); },
    onError: (e: unknown) => notify(`Erro ao remover: ${(e as Error)?.message ?? "erro"}`),
  });

  const patchNoticia = useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Noticia>; log?: string }) => {
      await atualizarNoticia(args.id, args.patch);
      if (args.log) await registarAudit(nomeExibicao, args.log);
    },
    onSuccess: () => { invalidateNoticias(); invalidateAudit(); },
  });

  // Move várias notícias para «Só no site» de uma vez (usado quando uma
  // categoria excede o limite de MAX_POR_CATEGORIA no email).
  const moverExcedentesM = useMutation({
    mutationFn: async (args: { ids: string[]; rotuloCategoria: string }) => {
      for (const id of args.ids) {
        await atualizarNoticia(id, { destino: "site", destaque: false });
      }
      await registarAudit(
        nomeExibicao,
        `Moveu ${args.ids.length} notícia(s) de ${args.rotuloCategoria} para o site (limite 3 por categoria)`,
      );
      return args.ids.length;
    },
    onSuccess: (n) => {
      invalidateNoticias(); invalidateAudit();
      notify(`${n} notícia${n === 1 ? "" : "s"} movida${n === 1 ? "" : "s"} para o site`);
    },
  });

  // Alterna o destino de uma notícia entre «email» e «só no site».
  // Ao mover para o site remove o destaque — destaques só existem no email.
  const alternarDestino = (n: Noticia) => {
    if (bloqueado) return;
    const efectivo = destinoEfectivoDe(n.id);
    const paraSite = efectivo !== "site";
    const titulo = stripLeadingEmoji(n.titulo).slice(0, 40);
    // Pin manual via override_destino (para o resolver respeitar) + espelha em destino (para envio/preview),
    // e limpa destaque quando vai para o site.
    patchNoticia.mutate({
      id: n.id,
      patch: paraSite
        ? { override_destino: "site", destino: "site", destaque: false }
        : { override_destino: "email", destino: "news" },
      log: paraSite ? `Movida só para o site: «${titulo}»` : `Devolvida ao email: «${titulo}»`,
    });
  };




  const limparAntigas = useMutation({
    mutationFn: async () => {
      const ids = await idsPendentesAntigas(14);
      if (ids.length === 0) return 0;
      await rejeitarNoticiasEmMassa(ids);
      await registarAudit(nomeExibicao, `Rejeição em massa: ${ids.length} notícia(s) antiga(s)`, { dias_min: 14, quantidade: ids.length });
      return ids.length;
    },
    onSuccess: (n) => {
      invalidateNoticias(); invalidateAudit();
      setModal(null);
      notify(`${n} notícia(s) antiga(s) rejeitada(s)`);
    },
  });



  const verificarLinksFn = useServerFn(verificarLinksEdicao);
  // Verificação de links — hooks têm de correr em todos os renders, antes dos early returns.
  const verificarLinksM = useMutation({
    mutationFn: async (opts: { forcar?: boolean } = {}) => {
      if (!edicaoId) throw new Error("Sem edição");
      return await verificarLinksFn({ data: { edicao_id: edicaoId, forcar: !!opts.forcar } });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      invalidateAudit();
      if (res.resumo.quebrado > 0) {
        notify(`${res.resumo.quebrado} link(s) quebrado(s)`);
      } else if (res.resumo.suspeito > 0) {
        notify(`${res.resumo.suspeito} link(s) suspeito(s)`);
      } else if (!res.cache) {
        notify("Links verificados ✓");
      }
    },
    onError: (e) => notify(`Falha na verificação: ${String((e as Error)?.message ?? e)}`),
  });
  const ignorarLinkFn = useServerFn(ignorarLink);
  const ignorarLinkM = useMutation({
    mutationFn: async (url: string) => {
      if (!edicaoId) throw new Error("Sem edição");
      return await ignorarLinkFn({ data: { edicao_id: edicaoId, url } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      invalidateAudit();
      notify("Aviso removido ✓");
    },
    onError: (e) => notify(`Não consegui confirmar: ${String((e as Error)?.message ?? e)}`),
  });

  /** Fase 2: grava um URL corrigido sem sair do modal de envio. */
  const guardarUrlLinkM = useMutation({
    mutationFn: async (args: { contexto: ItemLink["contexto"]; urlAntigo: string; urlNovo: string }) => {
      const url = args.urlNovo.trim();
      if (!url) throw new Error("URL vazio");
      if (args.contexto.tipo === "ferramenta") {
        await actualizarFerramenta(args.contexto.id, { url });
      } else {
        await atualizarNoticia(args.contexto.id, { url });
      }
      if (edicaoId) {
        try { await ignorarLinkFn({ data: { edicao_id: edicaoId, url } }); } catch { /* não bloqueia */ }
      }
      await registarAudit(nomeExibicao, `Corrigiu o link de «${stripLeadingEmoji(args.contexto.titulo).slice(0, 40)}»`);
    },
    onSuccess: (_d, args) => {
      setLinksResolvidos((s) => (s.includes(args.urlAntigo) ? s : [...s, args.urlAntigo]));
      invalidateNoticias(); invalidateAudit();
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      if (edicaoId) qc.invalidateQueries({ queryKey: ["ferramentas", edicaoId] });
      notify("Link actualizado ✓");
    },
    onError: (e) => notify(`Não consegui gravar o link: ${String((e as Error)?.message ?? e)}`, { tipo: "erro" }),
  });

  /** Fase 2: rejeita a notícia (ou remove a ferramenta) directamente no modal. */
  const rejeitarLinkM = useMutation({
    mutationFn: async (args: { contexto: ItemLink["contexto"]; url: string }) => {
      if (args.contexto.tipo === "ferramenta") {
        if (!edicaoId) throw new Error("Sem edição");
        await removerFerramenta(args.contexto.id, edicaoId);
        await registarAudit(nomeExibicao, `Removeu a ferramenta «${args.contexto.titulo.slice(0, 40)}» da edição`);
      } else {
        await rejeitarNoticia(args.contexto.id);
        await registarAudit(nomeExibicao, `Rejeitou «${stripLeadingEmoji(args.contexto.titulo).slice(0, 40)}» na verificação de links`);
      }
    },
    onSuccess: (_d, args) => {
      setLinksResolvidos((s) => (s.includes(args.url) ? s : [...s, args.url]));
      invalidateNoticias(); invalidateAudit();
      if (edicaoId) qc.invalidateQueries({ queryKey: ["ferramentas", edicaoId] });
      const ctx = args.contexto;
      notify(ctx.tipo === "ferramenta" ? "Ferramenta removida da edição" : "Notícia rejeitada — saiu da edição", {
        accao: ctx.tipo === "noticia"
          ? {
              rotulo: "Anular",
              fn: () => {
                patchNoticia.mutate({ id: ctx.id, patch: { estado: "aprovada" }, log: `Anulou a rejeição de «${stripLeadingEmoji(ctx.titulo).slice(0, 40)}»` });
                setLinksResolvidos((s) => s.filter((u) => u !== args.url));
                notify("Rejeição anulada — voltou à edição");
              },
            }
          : undefined,
      });
    },
    onError: (e) => notify(`Não consegui rejeitar: ${String((e as Error)?.message ?? e)}`, { tipo: "erro" }),
  });
  // Verifica links automaticamente ao abrir "Aprovar e enviar".
  // O servidor reaproveita o retrato anterior quando os URLs não mudaram,
  // por isso corre-se sempre: assim uma edição manual de URL é reavaliada.
  useEffect(() => {
    if (modal !== "enviar" || !edicaoId) return;
    if (!verificarLinksM.isPending) verificarLinksM.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, edicaoId]);



  // Correr uma fonte individualmente + resultados por fonte



  const escolherEp = useMutation({
    mutationFn: async (ep: Episodio) => {
      if (!edicaoId) return;
      await escolherEpisodio(edicaoId, ep.id);
      await registarAudit(nomeExibicao, `Escolheu o episódio ${ep.codigo ?? ep.titulo.slice(0, 30)}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edicao-atual"] }); invalidateAudit(); },
  });

  const marcarCronicaConcluidaM = useMutation({
    mutationFn: async (valor: boolean) => {
      if (!edicaoId) return;
      await marcarCronicaConcluida(edicaoId, valor);
      await registarAudit(nomeExibicao, valor ? "Marcou a crónica como concluída" : "Reabriu a crónica");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edicao-atual"] }); invalidateAudit(); },
    onError: (e: unknown) => notify(`Falha: ${(e as Error)?.message ?? "erro"}`),
  });

  const sincronizarPodcast = useMutation({
    mutationFn: sincronizarPodcastRss,
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["episodios"] });
      await qc.invalidateQueries({ queryKey: ["audit"] });
      notify(r.novos > 0
        ? `${r.novos} novo(s) episódio(s) sincronizado(s)`
        : "Sincronização concluída — sem novidades no feed");
    },
    onError: (e: unknown) => notify(`Falha ao sincronizar: ${(e as Error)?.message ?? "erro"}`),
  });

  const togglarSeccao = useMutation({
    mutationFn: async (args: { s: SeccaoRow; activo: boolean }) => {
      await alternarSeccaoActiva(args.s.id, args.activo);
      const rot = args.s.tipo === "personalizada" ? (args.s.titulo ?? "personalizada") : metaDe(args.s.tipo as SeccaoTipo).rotulo;
      await registarAudit(nomeExibicao, `${args.activo ? "Activou" : "Desactivou"} secção «${rot}»`);
    },
    onSuccess: () => { invalidateSeccoes(); invalidateAudit(); },
  });


  const reordenarSeccoesM = useMutation({
    mutationFn: (ids: string[]) => {
      if (!edicaoId) throw new Error("Sem edição");
      return reordenarSeccoes(edicaoId, ids);
    },
    onSuccess: () => invalidateSeccoes(),
    onError: (e: unknown) => { invalidateSeccoes(); notify(`Erro ao reordenar: ${(e as Error)?.message ?? "erro"}`); },
  });

  const moverSeccaoM = useMutation({
    mutationFn: ({ seccaoId, direccao }: { seccaoId: string; direccao: "cima" | "baixo" }) =>
      moverSeccao(seccaoId, direccao),
    onSuccess: () => invalidateSeccoes(),
    onError: (e: unknown) => { invalidateSeccoes(); notify(`Erro ao mover: ${(e as Error)?.message ?? "erro"}`); },
  });

  const reordenarNoticiasM = useMutation({
    mutationFn: (ids: string[]) => {
      if (!edicaoId) throw new Error("Sem edição");
      suprimirNoticiasPor(2500);
      return reordenarNoticias(edicaoId, ids);
    },
    // Sem invalidate em sucesso: o estado optimista já reflecte a nova ordem
    // e o refetch fá-lo-ia esvaziar a lista por um instante (o que empurra o
    // scroll para o topo em mobile). Em erro, refazemos.
    onError: (e: unknown) => {
      supressorNoticiasAte.current = 0;
      if (edicaoId) qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] });
      notify(`Erro ao reordenar: ${(e as Error)?.message ?? "erro"}`);
    },
  });

  const criarPersonalizada = useMutation({
    mutationFn: async (campos: CamposSeccaoPersonalizada) => {
      if (!edicaoId) throw new Error("Sem edição");
      await criarSeccaoPersonalizada(edicaoId, campos);
      await registarAudit(nomeExibicao, `Criou secção personalizada «${campos.titulo}»`);
    },
    onSuccess: () => { invalidateSeccoes(); invalidateAudit(); setSeccaoModal(null); notify("Secção adicionada"); },
  });

  const guardarPersonalizada = useMutation({
    mutationFn: async (args: { id: string; campos: Partial<CamposSeccaoPersonalizada> }) => {
      await actualizarSeccaoPersonalizada(args.id, args.campos);
    },
    onSuccess: () => { invalidateSeccoes(); setSeccaoModal(null); notify("Secção actualizada"); },
  });

  const apagarPersonalizada = useMutation({
    mutationFn: async (s: SeccaoRow) => {
      await removerSeccaoPersonalizada(s.id);
      await registarAudit(nomeExibicao, `Removeu secção «${s.titulo ?? "personalizada"}»`);
    },
    onSuccess: () => { invalidateSeccoes(); invalidateAudit(); },
  });

  // "Enviar teste" no modal de HTML: usa disparar-egoi contra a primeira lista de teste activa
  const testeM = useMutation({
    mutationFn: async () => {
      if (!edicaoId) throw new Error("Sem edição");
      const teste = (listasEgoiQ.data ?? []).find((l) => l.tipo === "teste" && l.activa);
      if (!teste) throw new Error("Não há nenhuma lista de teste activa. Vai a Definições → E-goi para criar uma.");
      await invocarEdge("disparar-egoi", { edicao_id: edicaoId, lista_ids: [teste.id] });
      await registarAudit(nomeExibicao, "Disparou envio de teste (E-goi)");
    },
    onSuccess: () => { invalidateAudit(); invalidateCampanhasEgoi(); notify("Teste enviado ✓ — verifica o teu email"); },
    onError: async (e: unknown) => {
      const msg = (e as Error).message;
      setErroModal({ titulo: "Envio de teste falhou", mensagem: msg, detalhe: msg });
      try { await registarAudit(nomeExibicao, "Falha no envio de teste", msg); } catch { /* ignora */ }
    },
  });

  // Botão "📝 Criar rascunho na E-goi" — cria/actualiza (PATCH) campanhas em rascunho.
  // NÃO toca no WordPress (esse fluxo é o botão dedicado «Escrever página»).
  const rascunhoM = useMutation({
    mutationFn: async () => {
      if (!edicaoId) throw new Error("Sem edição");
      setEnvioErro(null);
      if (listasSel.length === 0) throw new Error("Escolhe pelo menos uma lista.");
      const r = await invocarEdge<{ ok: boolean; sucessos: number; falhas: number; mensagem: string; campanhas: Array<{ lista_id: string; lista_nome: string; ok: boolean; erro?: string; criado_agora?: boolean }> }>(
        "sincronizar-rascunho-egoi",
        { edicao_id: edicaoId, lista_ids: listasSel },
      );
      return r;
    },
    onSuccess: (r) => {
      invalidateAudit();
      invalidateCampanhasEgoi();
      if (r.falhas === 0) {
        notify(`Rascunho actualizado na E-goi · ${r.sucessos} lista(s)`);
      } else {
        const falhadas = r.campanhas.filter((x) => !x.ok).map((x) => `${x.lista_nome}: ${x.erro}`).join("\n");
        setEnvioErro(`${r.mensagem}`);
        if (!bundleActivoRef.current) setErroModal({ titulo: "Rascunho E-goi parcial", mensagem: `${r.mensagem}`, detalhe: falhadas });
        notify(`Rascunho parcial · ${r.sucessos} de ${r.sucessos + r.falhas} listas`);
      }
    },
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      setEnvioErro(msg);
      if (!bundleActivoRef.current) setErroModal({ titulo: "Falha ao criar rascunho E-goi", mensagem: msg, detalhe: msg });
    },
  });

  // Botão "📝 Escrever página no WordPress" — cria ou actualiza a Lição em
  // `status="publish"`. Independente do E-goi. Se falhar, não afecta o envio.
  const publicarWpM = useMutation({
    mutationFn: async () => {
      if (!edicaoId) throw new Error("Sem edição");
      const r = await invocarEdge<{ ok: boolean; post_id?: number; post_url?: string; status?: string; actualizada?: boolean; mensagem: string }>(
        "publicar-wordpress",
        { edicao_id: edicaoId },
      );
      return r;
    },
    onSuccess: (r) => {
      invalidateAudit();
      qc.invalidateQueries({ queryKey: ["edicao-atual"] });
      notify(r.mensagem);
    },
    onError: (e: unknown) => {
      const msg = (e as Error).message;
      if (!bundleActivoRef.current) setErroModal({ titulo: "Falha a escrever no WordPress", mensagem: msg, detalhe: msg });
    },
  });

  // Disparo final e repetição de lista falhada vivem no hook partilhado
  // `useEnvioNewsletter` (ver acima), reutilizado também pelo Editor Revista.


  // Agendamento e cancelamento vivem no hook partilhado `useEnvioNewsletter`.




  // Compatibilidade: quaisquer usos de "enviarM.isPending" no resto do JSX
  // agora reflectem qualquer das duas mutações E-goi.
  const enviarM = { isPending: rascunhoM.isPending || disparoM.isPending };

  const previewM = useMutation({
    mutationFn: async (edId: string) => {
      const r = await invocarEdge<{ ok: true; html: string }>("preview-edicao", { edicao_id: edId });
      return r.html;
    },
    onSuccess: (html) => { setHtmlReal({ estado: "ok", html }); },
    onError: (e: unknown) => { setHtmlReal({ estado: "erro", erro: (e as Error).message }); },
  });

  const abrirHtmlReal = () => {
    if (!edicaoId) return;
    setHtmlReal({ estado: "load" });
    setHtmlFeedback(null);
    setModal("html");
    previewM.mutate(edicaoId);
    void registarAudit(nomeExibicao, "Abriu HTML real da edição");
  };

  const mostrarFeedbackHtml = (tipo: "ok" | "erro", texto: string) => {
    setHtmlFeedback({ tipo, texto });
    window.setTimeout(() => setHtmlFeedback((f) => (f?.texto === texto ? null : f)), 4000);
  };

  const descarregarHtml = () => {
    if (htmlReal.estado !== "ok" || !htmlReal.html || !edicao) return;
    try {
      const blob = new Blob([htmlReal.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `digital-sprint-edicao-${edicao.numero}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      mostrarFeedbackHtml("ok", "HTML descarregado ✓");
      void registarAudit(nomeExibicao, `Descarregou HTML da edição #${edicao.numero}`);
    } catch (e) {
      mostrarFeedbackHtml("erro", `Falha ao descarregar · ${(e as Error).message}`);
    }
  };

  const copiarHtml = async () => {
    if (htmlReal.estado !== "ok" || !htmlReal.html) return;
    try {
      await navigator.clipboard.writeText(htmlReal.html);
      mostrarFeedbackHtml("ok", "HTML copiado ✓");
      void registarAudit(nomeExibicao, "Copiou HTML da edição");
    } catch {
      mostrarFeedbackHtml("erro", "Não consegui copiar — verifica permissões do browser");
    }
  };

  const enviarTesteDoModal = () => {
    if (bloqueado || testeM.isPending) return;
    testeM.mutate(undefined, {
      onSuccess: () => {
        mostrarFeedbackHtml("ok", "Teste enviado ✓ — verifica o teu email");
        void registarAudit(nomeExibicao, "Enviou teste a partir do HTML real");
      },
      onError: (e: unknown) => mostrarFeedbackHtml("erro", `Envio de teste falhou · ${(e as Error).message}`),
    });
  };



  /* ─── autosaves ─── */
  // Chave de refresh do Preview (iframe do preview-edicao). Um contador que bump
  // sempre que muda algo que afecta o HTML renderizado — o Preview aplica
  // depois o seu próprio debounce antes de re-invocar a edge function.
  const [previewKey, setPreviewKey] = useState(0);
  const [previewDestino, setPreviewDestino] = useState<"email" | "wordpress">("email");

  const [assunto, setAssunto] = useState("");
  // Comprimento textual da crónica publicado pelo CronicaBloco (para a checklist).
  const [cronicaTextoLenLive, setCronicaTextoLenLive] = useState(0);

  // Hidratação por edição: ao trocar de rascunho, o assunto tem de vir da
  // edição escolhida — caso contrário o autosave escrevia o assunto anterior
  // por cima da nova edição.
  const hydratedFor = useRef<string | null>(null);
  const [aTrocarEdicao, setATrocarEdicao] = useState(false);
  useEffect(() => {
    if (!edicao) return;
    if (hydratedFor.current === edicao.id) return;
    hydratedFor.current = edicao.id;
    setATrocarEdicao(true);
    setAssunto(edicao.assunto ?? "");
    // Liberta o autosave só no ciclo seguinte, já com o valor novo assente.
    const t = setTimeout(() => setATrocarEdicao(false), 0);
    return () => clearTimeout(t);
  }, [edicao]);

  const assuntoAS = useAutoSave(
    assunto,
    async (v) => { if (edicaoId) await atualizarAssunto(edicaoId, v); },
    { enabled: !!edicaoId && !bloqueado && !aTrocarEdicao },
  );


  // Os dados lidos pertencem mesmo à edição aberta? Só então os blocos de texto
  // podem ser hidratados: caso contrário fixariam valores vazios para sempre.
  const dadosDaEdicao = !!edicao && !!edicaoId && edicao.id === edicaoId && !aTrocarEdicao;

  // Valores iniciais estáveis por edição — evitam recriar refs a cada render do pai.
  const cronicaInicial = useMemo(() => {
    const c = edicao?.cronica;
    return {
      titulo: c?.titulo ?? "",
      conteudo: sanitizarHtmlCronica(c?.conteudo_html ?? ""),
      leituras: c?.leituras_recomendadas ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, dadosDaEdicao]);

  const consultoriaInicial = useMemo(() => {
    return normalizarConsultoria((edicao as unknown as { bloco_consultoria?: unknown } | undefined)?.bloco_consultoria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edicaoId, dadosDaEdicao]);


  // Bump do preview — chamado pelos blocos quando terminam autosaves e por mutations que alteram a edição.
  const bumpPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  // Assinatura barata de estrutura (secções + notícias + ferramentas + assunto) — apanha reordenações e destaques.
  useEffect(() => {
    setPreviewKey((k) => k + 1);
  }, [
    assunto,
    edicao?.id, edicao?.episodio_podcast_id,
    aprovadas.length, naNews.length, destaques.length,
    seccoesActivas.length,
    seccoesActivas.map((s) => `${s.id}:${s.tipo}:${s.ordem}:${s.activo ? 1 : 0}`).join("|"),
    aprovadas.map((n) => `${n.id}:${n.ordem}:${n.destaque ? 1 : 0}:${n.destino}:${(n.titulo ?? "").length}:${(n.descricao ?? "").length}`).join("|"),
    ferramentasLista.map((f) => `${f.id}:${f.posicao}:${f.emoji ?? ""}:${f.cor ?? ""}:${f.nome ?? ""}:${f.url ?? ""}`).join("|"),
  ]);


  /* ─── atalho ⌘/Ctrl + S para descarregar HTML enquanto o modal está aberto ─── */
  useEffect(() => {
    if (modal !== "html") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        descarregarHtml();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, htmlReal.estado, htmlReal.html, edicao?.numero]);

  /* ─── acções UI ─── */

  const abrirEdicao = (n: Noticia) => { setEditando(n.id); setDraft({ titulo: n.titulo, descricao: n.descricao ?? "", categoria: n.categoria as CatId, url: n.url ?? "" }); };
  const guardarEdicao = (id: string, urlAnterior: string | null | undefined) => {
    const novoUrl = draft.url.trim();
    if (novoUrl && !isUrlValido(novoUrl)) { notify("URL inválido — corrige antes de guardar"); return; }
    const urlMudou = (urlAnterior ?? "") !== novoUrl;
    patchNoticia.mutate({
      id,
      patch: { titulo: draft.titulo, descricao: draft.descricao, categoria: draft.categoria, url: novoUrl || null },
      log: urlMudou ? "Refinou o texto e alterou o URL de uma notícia" : "Refinou o texto de uma notícia",
    });
    setEditando(null); notify("Alterações guardadas");
  };
  /** Alterna um cartão pendente. Vários podem estar abertos ao mesmo tempo,
      cada um com o seu rascunho — permite investigar fontes em paralelo. */
  const abrirPend = (n: Noticia) => {
    setPendAbertos((s) => {
      if (n.id in s) { const c = { ...s }; delete c[n.id]; return c; }
      return { ...s, [n.id]: { titulo: n.titulo, descricao: n.descricao ?? "", categoria: n.categoria as CatId, url: n.url ?? "" } };
    });
  };
  const actualizarDraftPend = useCallback((id: string, d: { titulo: string; descricao: string; categoria: CatId; url: string }) => {
    setPendAbertos((s) => (id in s ? { ...s, [id]: d } : s));
  }, []);

  const toggleDestaque = (n: Noticia) => {
    if (!n.destaque && destaques.length >= 3) { notify("Máximo de 3 destaques — retira um primeiro"); return; }
    patchNoticia.mutate({
      id: n.id,
      patch: { destaque: !n.destaque, destino: "news" },
      log: `${n.destaque ? "Retirou" : "Marcou"} destaque em «${stripLeadingEmoji(n.titulo).slice(0, 30)}…»`,
    });
  };
  const mover = (i: number, dir: number) => {
    const j = i + dir;
    if (!edicaoId || j < 0 || j >= aprovadas.length) return;
    const ids = arrayMove(aprovadas.map((n) => n.id), i, j);
    const map = new Map(aprovadas.map((n) => [n.id, n]));
    qc.setQueryData(["aprovadas", edicaoId], ids.map((id, k) => ({ ...map.get(id)!, ordem: k })));
    reordenarNoticiasM.mutate(ids);
  };

  // Sensores partilhados pelo DndContext da lista agrupada de notícias.
  const sensoresNoticias = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* sub-componentes hoisted a módulo — ver definições no topo do ficheiro */







  /* ─── ecrãs sem edição: movidos para depois de todos os hooks (ver antes do return final) ─── */



  /* ─── preview editorial: extraído para ./Preview.tsx ─── */



  // (o cabeçalho-validador substitui as métricas/SaveHint que viviam no topo)

  // Sinais para o cabeçalho-validador (checklist compacta).
  const cronicaConcluida = Boolean(edicao?.cronica?.concluida);
  // O que entra no email é o texto da crónica; a marcação manual é só confirmação.
  const cronicaTemTexto = Boolean(
    (edicao?.cronica?.conteudo_html ?? "").replace(/<[^>]*>/g, "").trim()
      || (edicao?.cronica?.conteudo ?? "").trim(),
  );
  const ferramentasPreenchidas = ferramentasCountQ.data ?? 0;

  // Links verificados: colunas jsonb/timestamptz recém-adicionadas.
  // O tipo gerado pode ainda não reflectir; casting seguro.
  const edicaoLinks = edicao as unknown as {
    links_verificados?: ItemLink[] | null;
    links_verificados_em?: string | null;
    links_ignorados?: string[] | null;
  } | null;
  const linksIgnoradosSet = useMemo(() => {
    const raw = edicaoLinks?.links_ignorados;
    return new Set(Array.isArray(raw) ? raw : []);
  }, [edicaoLinks?.links_ignorados]);
  const linksItemsRaw: ItemLink[] | null = edicaoLinks?.links_verificados ?? null;
  const linksItems: ItemLink[] | null = useMemo(() => {
    if (!linksItemsRaw) return null;
    if (linksIgnoradosSet.size === 0) return linksItemsRaw;
    // Um URL confirmado como OK passa a "ok" para o resumo global também.
    return linksItemsRaw.map((it) => (linksIgnoradosSet.has(it.url) ? { ...it, estado: "ok" as const } : it));
  }, [linksItemsRaw, linksIgnoradosSet]);
  const linksVerificadosEm: string | null = edicaoLinks?.links_verificados_em ?? null;
  const linksResumo: ResumoLinks | null = linksItems
    ? linksItems.reduce<ResumoLinks>(
        (acc, it) => { acc[it.estado]++; acc.total++; return acc; },
        { ok: 0, redireccionado: 0, suspeito: 0, quebrado: 0, total: 0 },
      )
    : null;
  const linksPorUrl = useMemo(() => {
    const map = new Map<string, ItemLink>();
    if (!linksItems) return map;
    for (const it of linksItems) {
      map.set(it.url, it);
      try { map.set(new URL(it.url).toString(), it); } catch { /* ignore */ }
    }
    return map;
  }, [linksItems]);
  const linkParaNoticia = (url: string | null | undefined): ItemLink | null => {
    if (!url) return null;
    const direct = linksPorUrl.get(url);
    if (direct) return direct;
    try { return linksPorUrl.get(new URL(url).toString()) ?? null; } catch { return null; }
  };


  // `verificarLinksM` está declarado no topo do componente (hooks antes de early returns).


  // (categoriasOcultasSet, destinoResolvido, destinoEfectivoDe, razaoDestinoDe declarados acima)


  const aprovadasNoEmail = aprovadas.filter((n) => destinoEfectivoDe(n.id) === "email");
  const noticiasEmail = aprovadasNoEmail.length;
  // A quota por categoria aplica-se ao bloco «Categorias» do email, onde os
  // destaques não são repetidos — por isso não entram nesta contagem.
  const porCategoriaNoEmail = categorias
    .map((c) => ({
      id: c.id as string,
      nome: c.nome,
      curto: c.curto,
      count: aprovadasNoEmail.filter((n) => n.categoria === c.id && !n.destaque).length,
    }))
    .filter((c) => c.count > 0);


  const checklist: ItemChecklist[] = computarChecklist({
    noticiasEmail,
    cronicaConcluida,
    cronicaTemTexto,
    temPodcast: !!edicao?.episodio_podcast_id,
    ferramentasPreenchidas,
    porCategoriaNoEmail,
    categoriasOcultas: categoriasOcultasSet.size,
    maxTotal: MAX_TOTAL_EMAIL,
    aviso: AVISO_EMAIL,
    maxPorCategoria: MAX_POR_CATEGORIA,
  });
  // Só itens realmente accionáveis contam como pendência da Fase 1.
  // maxPorCategoria é informativo (o resolver já resolve o excesso automaticamente)
  // e nível "neutro" nunca é pendência.
  const CHAVES_BLOQUEANTES: ItemChave[] = ["noticiasEmail", "cronica", "podcast", "ferramenta"];
  const itensEmFalta = checklist.filter(
    (i) => CHAVES_BLOQUEANTES.includes(i.chave) && (i.nivel === "ambar" || i.nivel === "vermelho"),
  );
  const dias = diasAteEnvio(edicao?.data_envio_prevista);
  const diaData = fmtDiaSemanaEData(edicao?.data_envio_prevista);

  const abrirLinks = () => {
    setModal("links");
    const stale = !linksVerificadosEm
      || (Date.now() - new Date(linksVerificadosEm).getTime()) > 30 * 60 * 1000;
    if (stale && !verificarLinksM.isPending) verificarLinksM.mutate({});
  };

  const focarNoticia = (id: string) => {
    setFoldOpen((s) => ({ ...s, categorias: true, destaques: true, ferramentas: true }));
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-noticia-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.animate(
          [{ boxShadow: "0 0 0 3px rgba(99,102,241,0.55)" }, { boxShadow: "0 0 0 0 rgba(99,102,241,0)" }],
          { duration: 1800, easing: "ease-out" },
        );
      }
    });
  };

  const irParaSeccao = (secId: string) => {
    if (secId === "__links__") { abrirLinks(); return; }
    if (secId === "pendentes") {
      pendentesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setFoldOpen((s) => ({ ...s, [secId]: true }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`fold-${secId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };


  // useEffect de verificação automática de links movido para o topo do componente.


  const tentarEnviar = () => {
    if (bloqueado || enviarM.isPending || papelDesconhecido) return;
    resetEnvioModal();
    // Fase inicial: checklist só se houver itens em falta; caso contrário, salta para links.
    const faseInicial: "checklist" | "verificar-links" = itensEmFalta.length > 0 ? "checklist" : "verificar-links";
    setEnvioFase(faseInicial);
    // Reenvio: listas que já receberam esta edição entram desmarcadas — quem
    // quiser reenviar tem de as marcar de propósito.
    if (listasJaEnviadas.size > 0) {
      setListasSel((prev) => prev.filter((id) => !listasJaEnviadas.has(id)));
    }
    setModal("enviar");
    // Dispara verificação de links imediatamente para poder saltar Fase 2 se estiver tudo OK.
    const stale = !linksVerificadosEm
      || (Date.now() - new Date(linksVerificadosEm).getTime()) > 30 * 60 * 1000;
    if (stale && !verificarLinksM.isPending) verificarLinksM.mutate({});
  };


  useEffect(() => {
    registarEnvio({
      onEnviar: tentarEnviar,
      enviarPending: enviarM.isPending,
      bloqueado,
      papelDesconhecido,
      isAdmin,
    });
    return () => { limparEnvio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enviarM.isPending, bloqueado, papelDesconhecido, isAdmin, itensEmFalta.length]);

  useEffect(() => {
    registarValidador({
      dias,
      itens: checklist,
      nEmail: noticiasEmail,
      nSite: aprovadas.length,
      nSoNoSite: Math.max(0, aprovadas.length - noticiasEmail),
      nPendentes: pendentes.length,
      onIrParaSeccao: irParaSeccao,
    });
    return () => { limparValidador(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, noticiasEmail, aprovadas.length, pendentes.length, JSON.stringify(checklist.map((i) => [i.chave, i.nivel, i.rotulo]))]);


  /* ─── ecrãs sem edição (early returns só depois de todos os hooks) ─── */
  if (edicaoQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.muted }}>
        <Loader2 className="animate-spin" /> <span className="ml-2 text-sm">A carregar edição…</span>
      </div>
    );
  }
  if (!edicao) {
    return (
      <>
        <SemRascunhoScreen onCriar={() => setModalNovaEdicao(true)} aCriar={criarEdicao.isPending} />
        <DialogoNovaEdicao
          aberto={modalNovaEdicao}
          onAberto={setModalNovaEdicao}
          onCriar={(f) => criarEdicao.mutate(f)}
          aCriar={criarEdicao.isPending}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: T.bg, color: T.ink }}>
      {/* Tabs Editor / Preview — mobile (o cabeçalho global vive no TopNav) */}
      <div className="lg:hidden flex px-4 pt-3 pb-2 gap-1" style={{ background: T.shell, borderBottom: `1px solid ${T.line}` }}>
        {([["editor", "Editor"], ["preview", "Pré-visualização"]] as const).map(([v, l]) => {
          const activo = tab === v;
          return (
            <button key={v} onClick={() => setTab(v)}
              className="flex-1 relative text-[13px] font-bold uppercase tracking-widest py-3 rounded-md transition-colors"
              style={{ color: activo ? T.ink : T.muted }}>
              {l}
              {activo && (
                <span className="absolute left-3 right-3 bottom-0 h-[2px] rounded-full" style={{ background: T.primary }} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-[1460px] mx-auto px-4 md:px-8 pt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[20px] md:text-[22px] font-bold" style={{ color: T.ink }}>
          Digital Sprint #{edicao.numero}
        </h1>
        {selo ?? <SeloFormato formato="classic" />}
      </div>




      {envioRealPendente && !bloqueado && (() => {
        // Painel informativo (não impeditivo): estado do envio por lista.
        const activas = listasEgoi.filter((l) => l.activa);
        const linhas = activas.map((l) => {
          const c = campanhaPorLista.get(l.id);
          const estado: "enviada" | "preparada" | "por_enviar" =
            c?.estado === "enviada" ? "enviada" : c ? "preparada" : "por_enviar";
          return { id: l.id, nome: l.nome, tipo: l.tipo, estado, quando: c?.actualizado_em ?? null };
        });
        const porEnviar = linhas.filter((x) => x.estado !== "enviada");
        const fmt = (iso: string) =>
          new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
        return (
          <div className="px-4 md:px-8 pt-4 max-w-[1460px] mx-auto" id="painel-envio-parcial">
            <div className="rounded-xl p-4 md:p-5" style={{ background: "#FFFAEB", border: "1px solid #FEDF89" }}>

              <p className="text-[15px] md:text-base font-bold" style={{ color: "#93370D" }}>
                Envio parcial — último disparo a {fmt(envioRealPendente)}
              </p>
              <p className="text-[14px] mt-1" style={{ color: "#93370D" }}>
                Esta edição já saiu para pelo menos uma lista real, mas continua em rascunho.
                Podes retomar o envio das listas em falta, repetir uma lista ou disparar um teste interno.
              </p>

              <ul className="mt-3 space-y-1.5">
                {linhas.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 text-[13.5px]" style={{ color: "#7A2E0E" }}>
                    <span
                      className="inline-flex items-center h-6 px-2 rounded-md text-[11.5px] font-bold uppercase tracking-wide"
                      style={x.estado === "enviada"
                        ? { background: "#ECFDF3", color: "#067647", border: "1px solid #ABEFC6" }
                        : x.estado === "preparada"
                          ? { background: "#FEF0C7", color: "#93370D", border: "1px solid #FEDF89" }
                          : { background: "#FFFFFF", color: "#667085", border: `1px solid ${T.line}` }}>
                      {x.estado === "enviada" ? "Enviada" : x.estado === "preparada" ? "Por disparar" : "Por enviar"}
                    </span>
                    <span className="font-semibold">{x.nome}</span>
                    {x.tipo === "teste" && (
                      <span className="text-[12px]" style={{ color: "#98A2B3" }}>(interna)</span>
                    )}
                    {x.quando && <span style={{ color: "#98A2B3" }}>· {fmt(x.quando)}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-[12.5px] mt-2" style={{ color: "#98A2B3" }}>
                O detalhe dos erros de cada tentativa fica no registo de actividade, no fim da página.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                {porEnviar.length > 0 && (
                  <button
                    onClick={() => { setListasSel(porEnviar.map((x) => x.id)); tentarEnviar(); }}
                    className="h-12 sm:h-10 px-4 rounded-lg text-[15px] sm:text-sm font-bold text-white"
                    style={{ background: "#B54708" }}>
                    Retomar envio ({porEnviar.length} lista{porEnviar.length === 1 ? "" : "s"})
                  </button>
                )}
                <button
                  onClick={() => alinharEgoi.mutate()}
                  disabled={alinharEgoi.isPending}
                  className="h-12 sm:h-10 px-4 rounded-lg text-[15px] sm:text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#FFFFFF", color: "#93370D", border: "1px solid #FEDF89" }}>
                  {alinharEgoi.isPending ? "A confirmar na E-goi…" : "Confirmar estado na E-goi"}
                </button>
                <button
                  onClick={() => reconciliar.mutate({ criarSeguinte: true })}
                  disabled={reconciliar.isPending}
                  className="h-12 sm:h-10 px-4 rounded-lg text-[15px] sm:text-sm font-semibold disabled:opacity-50"
                  style={{ background: "#FFFFFF", color: "#93370D", border: "1px solid #FEDF89" }}>
                  Fechar edição e criar a seguinte
                </button>
                <button
                  onClick={() => reconciliar.mutate({ criarSeguinte: false })}
                  disabled={reconciliar.isPending}
                  className="h-12 sm:h-10 px-4 rounded-lg text-[15px] sm:text-sm font-semibold disabled:opacity-50"
                  style={{ background: "transparent", color: "#93370D", border: `1px solid ${T.line}` }}>
                  Apenas fechar edição
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Barra de contexto: que rascunho estou a editar + aviso de reenvio */}
      <div className="px-4 md:px-8 pt-4 max-w-[1460px] mx-auto">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-semibold" style={{ color: T.muted }}>
            A editar
          </span>
          {rascunhos.length > 1 ? (
            <select
              value={edicao.id}
              onChange={(e) => { void navigate({ to: "/", search: { edicao: e.target.value } }); }}
              className="h-11 rounded-lg px-3 text-[14px] font-semibold"
              style={{ border: `1px solid ${T.line}`, background: "#FFFFFF", color: T.ink }}
              aria-label="Escolher a edição em rascunho"
            >
              {rascunhos.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.numero} — {r.assunto?.trim() ? r.assunto : "sem assunto"}
                </option>
              ))}
            </select>
          ) : (
            <span className="h-11 inline-flex items-center rounded-lg px-3 text-[14px] font-semibold"
              style={{ border: `1px solid ${T.line}`, background: "#FFFFFF", color: T.ink }}>
              #{edicao.numero} — {edicao.assunto?.trim() ? edicao.assunto : "sem assunto"}
            </span>
          )}
        </div>

        {obsoleto && (
          <div className="mt-3 rounded-xl p-4" style={{ background: "#FFFAEB", border: "1px solid #FEDF89" }}>
            <p className="text-[15px] font-bold" style={{ color: "#93370D" }}>
              Rascunho anterior à última edição enviada
            </p>
            <p className="text-[14px] mt-1" style={{ color: "#93370D" }}>
              Este rascunho foi criado a {new Date(edicao.created_at).toLocaleDateString("pt-PT")}, antes de a
              edição #{obsoleto.ultimaNumero} ter saído
              {obsoleto.ultimaEnviadaEm ? ` a ${new Date(obsoleto.ultimaEnviadaEm).toLocaleDateString("pt-PT")}` : ""}.
              Confirma que é mesmo aqui que queres trabalhar — os avisos de envio em falta referem-se a esta edição antiga.
            </p>
            {rascunhos.length > 1 && rascunhos[0].id !== edicao.id && (
              <button
                onClick={() => { void navigate({ to: "/", search: { edicao: rascunhos[0].id } }); }}
                className="mt-3 h-12 sm:h-10 px-4 rounded-lg text-[15px] sm:text-sm font-bold text-white"
                style={{ background: "#B54708" }}>
                Abrir o rascunho mais recente (#{rascunhos[0].numero})
              </button>
            )}
          </div>
        )}

        {eReenvio && !envioRealPendente && (
          <div className="mt-3 rounded-xl p-4" style={{ background: T.warnSoft, border: `1px solid ${T.warn}55` }}>
            <p className="text-[15px] font-bold" style={{ color: T.warn }}>
              Reenvio em preparação
            </p>
            <p className="text-[14px] mt-1" style={{ color: T.ink }}>
              Esta edição já foi disparada{dataUltimoDisparo ? ` a ${new Date(dataUltimoDisparo).toLocaleDateString("pt-PT")}` : ""} para{" "}
              {listasJaEnviadas.size} lista{listasJaEnviadas.size === 1 ? "" : "s"}. No envio, essas listas entram
              desmarcadas — marca-as só se quiseres mesmo repetir o disparo.
            </p>
          </div>
        )}
      </div>

      <main className="px-4 md:px-8 py-4 md:py-6 grid gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_470px] max-w-[1460px] mx-auto">
        <div className={`${tab === "preview" ? "hidden lg:block" : ""} space-y-8 md:space-y-10`}>
          {/* ① Validar notícias novas — sempre visível para dar contexto */}
          <PhaseDivider
            numero={1}
            cor={pendentes.length > 0 ? COR_ATENCAO : COR_PASSIVA}
            titulo="Validar notícias novas"
            subtitulo={pendentes.length > 0
              ? "Aprovar, rejeitar ou editar antes de organizar a edição"
              : "Nada pendente — a edição pode avançar directamente para «Organizar»"}
          />
          <>
          {/* Pendentes (primeira secção — acção semanal) */}

          <div className="mb-4"><FilaEntrada /></div>
          {edicaoId && !bloqueado && <details className="mb-4 rounded-2xl border border-border bg-card p-4">
            <summary className="min-h-11 cursor-pointer font-semibold">Notícias aprovadas na curadoria comum</summary>
            <CuradoriaNoticias paraEdicao={{ id: edicaoId, onSelecionada: () => { void qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["pendentes"] }); } }} />
          </details>}

          <Pendentes

            pendentesRef={pendentesRef}
            bloqueado={bloqueado}
            iaConfigurada={iaConfigurada}
            iaTooltip={iaTooltip}
            fontes={fontes}
            onAdicionarNoticias={() => setModal("adicionar")}
            onAbrirFontes={() => setModal("fontes")}
            onLimparAntigas={() => setModal("limpar-antigas")}
            antigasCount={antigasCount}
            filtroPend={filtroPend}
            setFiltroPend={setFiltroPend}
            filtroOrigem={filtroOrigem}
            setFiltroOrigem={setFiltroOrigem}
            soRastreio={soRastreio}
            setSoRastreio={setSoRastreio}
            totalRastreio={totalRastreio}
            abertosCount={abertosCount}
            pendAbertos={pendAbertos}
            setPendAbertos={setPendAbertos}
            pendentes={pendentes}
            pendentesFiltradas={pendentesFiltradas}
            pendentesVisiveis={pendentesVisiveis}
            pendentesOrdenadas={pendentesOrdenadas}
            pendentesProntas={pendentesProntas}
            pendentesPorConfirmar={pendentesPorConfirmar}
            pendentesPorMostrar={pendentesPorMostrar}
            setLimitePend={setLimitePend}
            PEND_PAGINA={PEND_PAGINA}
            accaoPend={accaoPend}
            resultadoPend={resultadoPend}
            novosPendentesIds={novosPendentesIds}
            patchNoticia={patchNoticia}
            aprovar={aprovar}
            rejeitar={rejeitar}
            abrirPend={abrirPend}
            fecharPend={fecharPend}
            actualizarDraftPend={actualizarDraftPend}
            notify={notify}
          />
          </>







          {/* ② Organizar a newsletter */}
          <div className="mt-6 md:mt-10">
            <PhaseDivider numero={2} cor={T.primary} titulo="Organizar a newsletter" subtitulo="Assunto, destaques, crónica, actualidade e blocos finais" />
          </div>


          {/* Edição — assunto (ajuste raro, fica abaixo de Pendentes) */}

          <Card accent={SECS.edicao.cor}>
            <SectionTitle icon={SECS.edicao.icon} accent={SECS.edicao.cor}
              extra={<SavedTick s={assuntoAS.estado} err={assuntoAS.err} vazio={!assunto.trim()} />}>
              {SECS.edicao.titulo}
            </SectionTitle>



            <AssuntoField
              valor={assunto}
              onAlterar={(v) => setAssunto(v)}
              bloqueado={bloqueado}
              edicaoId={edicao.id}
              onAceitouSugestao={(s) => {
                void registarAudit(nomeExibicao, `Aceitou sugestão de assunto: «${s.slice(0, 60)}»`);
              }}
              onAplicouSugestao={() => { focarPreview(); notify("Assunto aplicado à pré-visualização"); }}
            />

          </Card>


          {/* Destaques da Semana — cartão dedicado, 3 slots numerados 01·02·03 */}
          {(() => {
            const GRAD_MARCA = "linear-gradient(135deg,#6366F1 0%,#8B5CF6 50%,#EC4899 100%)";
            const slots = [0, 1, 2].map((i) => destaques[i] ?? null);
            const promoverACima = (n: Noticia) => {
              if (destaques.length >= 3) { notify("Já tens 3 destaques — retira um primeiro"); return; }
              patchNoticia.mutate({ id: n.id, patch: { destaque: true }, log: `Marcou destaque: «${stripLeadingEmoji(n.titulo).slice(0, 40)}»` });
            };
            const primeirasCandidatas = naNews.filter((n) => !n.destaque).slice(0, 8);
            const destaqueIds = destaques.map((n) => n.id);
            const reordenarDestaques = (novosDestaqueIds: string[]) => {
              if (!edicaoId) return;
              const setDestaques = new Set(destaqueIds);
              let k = 0;
              const idsFull = aprovadas.map((n) => (setDestaques.has(n.id) ? novosDestaqueIds[k++] : n.id));
              const map = new Map(aprovadas.map((n) => [n.id, n]));
              qc.setQueryData(["aprovadas", edicaoId], idsFull.map((id, idx) => ({ ...map.get(id)!, ordem: idx })));
              reordenarNoticiasM.mutate(idsFull);
              void registarAudit(nomeExibicao, "Reordenou destaques");
            };
            return (
              <Card accent="#8B5CF6">
                <SectionTitle icon={Star} accent="#8B5CF6"
                  extra={<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: destaques.length === 3 ? T.okSoft : T.warnSoft, color: destaques.length === 3 ? T.ok : T.warn }}>{destaques.length}/3</span>}>
                  Destaques da Semana
                </SectionTitle>
                <SortableList ids={destaqueIds} disabled={bloqueado} onReorder={reordenarDestaques}>
                  <div className="space-y-3">
                    {slots.map((n, i) => {
                      const numero = String(i + 1).padStart(2, "0");
                      const wpActivo = previewDestino === "wordpress";
                      const tituloLimpo = n ? stripLeadingEmoji(n.titulo) : "";
                      const cardInner = (dragHandle?: (icon: ReactNode) => ReactNode, isDragging?: boolean) => (
                        <div className="rounded-xl overflow-hidden relative transition-shadow"
                          data-noticia-id={n?.id}
                          style={{
                            background: T.card,
                            border: `1px solid ${T.line}`,
                            outline: wpActivo && n ? `1.5px solid ${T.primary}59` : "none",
                            outlineOffset: 2,
                            boxShadow: isDragging ? "0 12px 24px -8px rgba(16,24,40,0.18)" : (wpActivo && n ? `0 0 0 3px ${T.primary}14` : (n ? "0 2px 12px rgba(99,102,241,0.08)" : "none")),
                          }}>
                          <div style={{ height: 5, background: n ? GRAD_MARCA : T.line }} />
                          <div className="p-3 sm:p-4">
                            <div className="flex items-start gap-3 sm:gap-4">
                              <div className="shrink-0 flex flex-col items-center gap-1.5" style={{ minWidth: 62 }}>
                                <div className="leading-none font-display font-extrabold"
                                  style={{
                                    fontSize: 52,
                                    lineHeight: "0.9",
                                    background: n ? GRAD_MARCA : "transparent",
                                    WebkitBackgroundClip: n ? "text" : undefined,
                                    WebkitTextFillColor: n ? "transparent" : undefined,
                                    color: n ? undefined : T.faint,
                                    letterSpacing: "-0.03em",
                                  }}
                                  aria-hidden>
                                  {numero}
                                </div>
                                {n && dragHandle && !bloqueado && editando !== n.id && (
                                  <div title="Arrastar para reordenar">
                                    {dragHandle(<GripVertical size={16} style={{ color: T.faint }} />)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {n ? (
                                  editando === n.id ? (
                                    <NoticiaEditForm
                                      draft={draft}
                                      onDraftChange={setDraft}
                                      onCancel={() => setEditando(null)}
                                      onSubmit={() => guardarEdicao(n.id, n.url)}
                                      submitLabel="Guardar"
                                      submitTone="primary"
                                    />
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <CatSelect n={n} disabled={bloqueado}
                                          onChange={(cat) => patchNoticia.mutate({ id: n.id, patch: { categoria: cat }, log: `Recategorizou → ${catDe(cat).curto}` })} />
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                                          style={{ background: "#FEF3C7", color: "#92400E" }}
                                          title="Destaque da semana">
                                          ★ Destaque
                                        </span>
                                        {n.destino === "site" && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                            style={{ background: "#F2F4F7", color: "#344054", border: `1px solid ${T.line}` }}
                                            title="Não entra no email, aparece só na página WordPress">
                                            <Globe size={10} /> Só no site
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[17px] sm:text-[16px] font-bold leading-snug mt-2" style={{ color: T.ink }}>{tituloLimpo}</p>
                                      {n.descricao && (
                                        <p className="text-[15.5px] sm:text-[14px] mt-1.5 leading-relaxed line-clamp-3" style={{ color: T.muted }}>{n.descricao}</p>
                                      )}
                                      {(() => {
                                        const li = linkParaNoticia(n.url);
                                        if (!li || li.estado === "ok") return null;
                                        const critico = li.estado === "quebrado";
                                        const cor = critico ? T.danger : T.warn;
                                        const soft = critico ? T.dangerSoft : T.warnSoft;
                                        const Icone = critico ? XCircle : AlertTriangle;
                                        const rotulo = critico
                                          ? `Link quebrado${li.status ? ` (${li.status})` : ""}`
                                          : li.estado === "redireccionado"
                                            ? "Link redirecciona"
                                            : `Link suspeito${li.status ? ` (${li.status})` : ""}`;
                                        return (
                                          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: soft, border: `1px solid ${cor}33` }}
                                            title={li.redirect_para ? `Destino final: ${li.redirect_para}` : undefined}>
                                            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: cor }}>
                                              <Icone size={14} /> {rotulo}
                                            </span>
                                            <button type="button" onClick={() => verificarLinksM.mutate({ forcar: true })} disabled={verificarLinksM.isPending}
                                              className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40" style={{ color: cor }}>
                                              {verificarLinksM.isPending ? "A reverificar…" : "Reverificar"}
                                            </button>
                                            <button type="button" onClick={() => n.url && ignorarLinkM.mutate(n.url)} disabled={ignorarLinkM.isPending || !n.url}
                                              title="Já confirmei manualmente que o link funciona"
                                              className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40" style={{ color: T.ok }}>
                                              {ignorarLinkM.isPending ? "A confirmar…" : "Confirmar OK"}
                                            </button>
                                            <button type="button" onClick={abrirLinks}
                                              className="text-[12px] font-semibold underline underline-offset-2" style={{ color: T.muted }}>
                                              Ver todos
                                            </button>
                                          </div>
                                        );
                                      })()}
                                      <div className="mt-2"><Url href={n.url} /></div>
                                    </>
                                  )
                                ) : (
                                  <p className="text-[13px] italic pt-2" style={{ color: T.faint }}>Sem destaque nesta posição — promove uma da Actualidade abaixo ou usa uma das candidatas.</p>
                                )}
                              </div>
                            </div>
                            {n && editando !== n.id && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t" style={{ borderColor: T.line }}>
                                <button onClick={() => !bloqueado && toggleDestaque(n)} disabled={bloqueado} aria-label="Retirar destaque"
                                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold"
                                  style={{ background: `${T.gold}1F`, color: "#92400E" }}>
                                  <Star size={18} fill={T.gold} /> Destaque
                                </button>
                                <button onClick={() => alternarDestino(n)} disabled={bloqueado || patchNoticia.isPending}
                                  role="switch" aria-checked={destinoEfectivoDe(n.id) === "email"}
                                  title={destinoEfectivoDe(n.id) === "site"
                                    ? "Actualmente só na página WordPress — clica para voltar a incluir no email"
                                    : "Retira do email e mantém só na página WordPress (também remove o destaque)"}
                                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold"
                                  style={destinoEfectivoDe(n.id) === "site"
                                    ? { background: "#F2F4F7", color: "#344054", border: `1px solid ${T.line}` }
                                    : { background: T.shell, color: T.muted, border: `1px solid ${T.line}` }}>
                                  {destinoEfectivoDe(n.id) === "site" ? <><Mail size={16} /> No email</> : <><Globe size={16} /> Só no site</>}
                                </button>
                                <button onClick={() => !bloqueado && abrirEdicao(n)} disabled={bloqueado} aria-label="Editar texto"
                                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold" style={{ background: T.primarySoft, color: T.primary }}>
                                  <Pencil size={18} /> Editar
                                </button>
                                <button onClick={() => {
                                  if (bloqueado) return;
                                  if (!window.confirm(`Remover «${stripLeadingEmoji(n.titulo).slice(0, 50)}»? A acção não pode ser desfeita.`)) return;
                                  apagar.mutate(n);
                                }} disabled={bloqueado || apagar.isPending} aria-label="Remover notícia"
                                  className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold" style={{ background: T.dangerSoft, color: T.danger }}>
                                  <Trash2 size={18} /> Remover
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      if (n) {
                        return (
                          <SortableRow key={n.id} id={n.id} disabled={bloqueado || editando === n.id}>
                            {({ dragHandle, isDragging }) => cardInner(dragHandle, isDragging)}
                          </SortableRow>
                        );
                      }
                      return <div key={`empty-${i}`}>{cardInner()}</div>;
                    })}
                  </div>
                </SortableList>

                {destaques.length < 3 && primeirasCandidatas.length > 0 && (
                  <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${T.line}` }}>
                    <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: T.muted }}>
                      Candidatas rápidas <span className="font-semibold" style={{ color: T.faint }}>({primeirasCandidatas.length})</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {primeirasCandidatas.map((n) => {
                        const cat = catDe(n.categoria);
                        return (
                          <button key={n.id} disabled={bloqueado}
                            onClick={() => promoverACima(n)}
                            className="text-left rounded-lg px-3 py-2.5 flex items-start gap-2.5 transition-all hover:-translate-y-px hover:shadow-sm disabled:opacity-40"
                            style={{ background: T.shell, border: `1px dashed ${T.line}`, color: T.ink }}
                            title={`Promover a destaque: ${stripLeadingEmoji(n.titulo)}`}>
                            <Star size={14} className="shrink-0 mt-0.5" style={{ color: T.gold }} fill={T.gold} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: T.ink }}>{stripLeadingEmoji(n.titulo)}</p>
                              <p className="text-[10.5px] font-bold uppercase tracking-wider mt-0.5" style={{ color: cat.cor }}>{cat.curto}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}



          {/* Crónica — bloco isolado, sem re-render do EditorNewsletter a cada tecla */}
          {edicaoId && dadosDaEdicao && (
            <CronicaBloco
              key={`cronica-${edicaoId}`}
              edicaoId={edicaoId}
              bloqueado={bloqueado}
              concluida={cronicaConcluida}
              aConcluir={marcarCronicaConcluidaM.isPending}
              onToggleConcluida={() => marcarCronicaConcluidaM.mutate(!cronicaConcluida)}
              seccaoActiva={seccaoActiva("cronica")}
              foldOpen={foldOpen}
              setFoldOpen={setFoldOpen}
              tituloInicial={cronicaInicial.titulo}
              conteudoInicial={cronicaInicial.conteudo}
              leiturasInicial={cronicaInicial.leituras}
              onLenChange={setCronicaTextoLenLive}
              onGuardado={bumpPreview}
            />
          )}

          {/* Consultoria — bloco isolado */}
          {edicaoId && dadosDaEdicao && (
            <ConsultoriaBloco
              key={`consultoria-${edicaoId}`}
              edicaoId={edicaoId}
              bloqueado={bloqueado}
              activa={seccaoActiva("consultoria")}
              foldOpen={foldOpen}
              setFoldOpen={setFoldOpen}
              valoresIniciais={consultoriaInicial}
              onGuardado={bumpPreview}
            />
          )}




          {/* A Actualidade — agrupadas por categoria; destaques têm cartão próprio.
              Notícias «só no site» aparecem no mesmo fluxo mas com cartão esbatido. */}
          {(() => {
            // Base = todas as aprovadas sem destaque (destaques têm cartão dedicado).
            // Inclui email e site — a distinção é visual (cartão colorido vs. cinzento).
            const baseActualidade = aprovadas.filter((n) => !n.destaque);
            // Ordem canónica de categorias (a mesma usada no email).
            // Dentro de cada categoria: email primeiro (preserva ordem), depois site.
            const gruposCat = categorias
              .map((c) => {
                const doGrupo = baseActualidade.filter((n) => n.categoria === c.id);
                const ordenado = [...doGrupo].sort((a, b) => {
                  const aEmail = destinoEfectivoDe(a.id) === "email" ? 0 : 1;
                  const bEmail = destinoEfectivoDe(b.id) === "email" ? 0 : 1;
                  if (aEmail !== bEmail) return aEmail - bEmail;
                  return (a.ordem ?? 0) - (b.ordem ?? 0);
                });
                return { cat: c, items: ordenado };
              })
              .filter((g) => g.items.length > 0);
            const idsOrdenadosPorGrupo = gruposCat.flatMap((g) => g.items.map((n) => n.id));


            const noticiasSensors = sensoresNoticias;

            // IDs escondidos = apenas destaques (que têm cartão próprio). Site já entra na lista principal.
            const idsEscondidos = aprovadas.filter((n) => n.destaque).map((n) => n.id);
            const persistirOrdemGrupo = (catId: string, novosIdsGrupo: string[]) => {
              if (!edicaoId) return;
              const novoVisivel = gruposCat.flatMap((g) => g.cat.id === catId ? novosIdsGrupo : g.items.map((x) => x.id));
              const novoFull = [...novoVisivel, ...idsEscondidos];
              const map = new Map(aprovadas.map((n) => [n.id, n]));
              qc.setQueryData(["aprovadas", edicaoId], novoFull.map((id, k) => ({ ...map.get(id)!, ordem: k })));
              reordenarNoticiasM.mutate(novoFull);
            };

            const moverDentroGrupo = (catId: string, iLocal: number, dir: number) => {
              const grupo = gruposCat.find((g) => g.cat.id === catId);
              if (!grupo) return;
              const j = iLocal + dir;
              if (j < 0 || j >= grupo.items.length) return;
              const idsGrupo = grupo.items.map((x) => x.id);
              persistirOrdemGrupo(catId, arrayMove(idsGrupo, iLocal, j));
            };

            const onDragEndNoticias = (e: DragEndEvent) => {
              const { active, over } = e;
              if (!over || active.id === over.id) return;
              const activeId = String(active.id);
              const overId = String(over.id);
              const from = idsOrdenadosPorGrupo.indexOf(activeId);

          {/* Podcast */}
          <Podcast
            episodios={episodios}
            episodioActivoId={edicao.episodio_podcast_id}
            bloqueado={bloqueado}
            feedUrl={podcastRssUrlQ.data ?? ""}
            aSincronizarFeed={sincronizarPodcast.isPending}
            onSincronizar={() => sincronizarPodcast.mutate()}
            onEscolher={(ep) => escolherEp.mutate(ep)}
            mostrarTodosEpisodios={mostrarTodosEpisodios}
            setMostrarTodosEpisodios={setMostrarTodosEpisodios}
            foldOpen={foldOpen}
            setFoldOpen={setFoldOpen}
          />
              const to = idsOrdenadosPorGrupo.indexOf(overId);
              if (from < 0 || to < 0 || !edicaoId) return;
              const activo = aprovadas.find((n) => n.id === activeId);
              const alvo = aprovadas.find((n) => n.id === overId);
              if (!activo || !alvo) return;
              const novoVisivel = arrayMove(idsOrdenadosPorGrupo, from, to);
              const novoFull = [...novoVisivel, ...idsEscondidos];
              const novaCategoria = alvo.categoria;
              const trocouCategoria = novaCategoria !== activo.categoria;
              const map = new Map(aprovadas.map((n) => [n.id, n]));
              qc.setQueryData(
                ["aprovadas", edicaoId],
                novoFull.map((id, k) => {
                  const item = map.get(id)!;
                  return { ...item, ordem: k, categoria: id === activeId ? novaCategoria : item.categoria };
                }),
              );
              reordenarNoticiasM.mutate(novoFull);
              if (trocouCategoria) {
                patchNoticia.mutate({
                  id: activeId,
                  patch: { categoria: novaCategoria as CatId },
                  log: `Recategorizou → ${catDe(novaCategoria).curto} (arrasto)`,
                });
                notify(`Categoria alterada para ${catDe(novaCategoria).curto}`);
              }
              // Promoção por arrasto: se a notícia foi parar às 2 primeiras posições da categoria
              // e estava pinada como "site", limpa o override para o resolver a devolver ao email.
              const catAlvo = trocouCategoria ? novaCategoria : activo.categoria;
              const idsDaCatDepois = novoFull
                .filter((id) => {
                  const it = map.get(id);
                  if (!it) return false;
                  const cat = id === activeId ? catAlvo : it.categoria;
                  return cat === catAlvo && !it.destaque;
                });
              const posLocal = idsDaCatDepois.indexOf(activeId);
              if (posLocal >= 0 && posLocal < MAX_POR_CATEGORIA && overrideDe(activo) === "site") {
                patchNoticia.mutate({
                  id: activeId,
                  patch: { override_destino: "email", destino: "news" },
                  log: `Promoveu «${stripLeadingEmoji(activo.titulo).slice(0, 40)}» para email (arrasto)`,
                });
              }
            };


            const nDestaques = destaques.length;
            const nCorpoEmail = baseActualidade.filter((n) => destinoEfectivoDe(n.id) === "email").length;
            const nEmailTotal = nDestaques + nCorpoEmail;
            const nSiteTotal = aprovadas.length; // tudo o que está aprovado vai para WP
            return (
          <Card accent={SECS.noticias.cor}>
            <SectionTitle icon={SECS.noticias.icon} accent={SECS.noticias.cor}
              extra={
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const nTotal = aprovadas.length;
                    const nVisiveis = nDestaques + idsOrdenadosPorGrupo.length;
                    const nOcultas = nTotal - nVisiveis;
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: nOcultas > 0 ? "#FEF3C7" : "#ECFDF3",
                          color: nOcultas > 0 ? "#92400E" : "#067647",
                          border: nOcultas > 0 ? "1px solid #FDE68A" : "1px solid #A6F4C5",
                        }}
                        title={nOcultas > 0
                          ? `${nOcultas} notícia${nOcultas === 1 ? "" : "s"} aprovada${nOcultas === 1 ? "" : "s"} com categoria fora da ordem canónica — verifica a categoria de cada uma.`
                          : `${nTotal} notícia${nTotal === 1 ? "" : "s"} aprovada${nTotal === 1 ? "" : "s"} nesta edição (${nDestaques} destaque${nDestaques === 1 ? "" : "s"} + ${baseActualidade.length} no corpo).`}
                      >
                        <Check size={12} /> Aprovadas · {nTotal}
                        {nOcultas > 0 && <span>· {nOcultas} sem categoria</span>}
                      </span>
                    );
                  })()}
                  {(() => {
                    const excedeEmail = nEmailTotal > MAX_TOTAL_EMAIL;
                    const perto = !excedeEmail && nEmailTotal >= AVISO_EMAIL;
                    const bg = excedeEmail ? T.dangerSoft : perto ? "#FEF3C7" : "#EEF2FF";
                    const cor = excedeEmail ? T.danger : perto ? "#92400E" : "#3730A3";
                    const borda = excedeEmail
                      ? `1px solid ${T.danger}55`
                      : perto
                        ? "1px solid #FDE68A"
                        : "1px solid #C7D2FE";
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: bg, color: cor, border: borda }}
                        title={excedeEmail
                          ? `A newsletter tem ${nEmailTotal} notícias — o tecto absoluto é ${MAX_TOTAL_EMAIL}. Fixa algumas como «Só no site».`
                          : perto
                            ? `Estás a chegar ao limite recomendado (${AVISO_EMAIL}). Tecto absoluto: ${MAX_TOTAL_EMAIL}.`
                            : `Newsletter (email): ${nDestaques} destaque${nDestaques === 1 ? "" : "s"} + ${nCorpoEmail} no corpo (aviso a ${AVISO_EMAIL}, tecto ${MAX_TOTAL_EMAIL})`}
                      >
                        <Mail size={12} /> Email · {nEmailTotal}/{MAX_TOTAL_EMAIL}
                      </span>
                    );
                  })()}
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "#F2F4F7", color: "#344054", border: `1px solid ${T.line}` }}
                    title={`Página WordPress: ${nSiteTotal} notícia${nSiteTotal === 1 ? "" : "s"} (inclui as marcadas como «Só no site»)`}
                  >
                    <Globe size={12} /> Site · {nSiteTotal}
                  </span>
                  {!bloqueado && aprovadas.length >= 4 && (
                    <button
                      type="button"
                      onClick={() => setModalSugestaoAberto(true)}
                      title="Pede à IA para escolher 3 destaques e distribuir o resto entre email e site"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)", color: "#fff", border: "1px solid transparent" }}
                    >
                      <Sparkles size={12} /> Sugerir organização
                    </button>
                  )}
                </div>
              }>
              A Actualidade
            </SectionTitle>
            {baseActualidade.length === 0 && (
              <EmptyState icon={Newspaper} texto="Ainda sem notícias na Actualidade — aprova uma da fila em «Pendentes» (as marcadas como Destaque aparecem no cartão acima)." />
            )}


            <DndContext sensors={noticiasSensors} collisionDetection={closestCenter} onDragEnd={bloqueado ? undefined : onDragEndNoticias}>
              <SortableContext items={idsOrdenadosPorGrupo} strategy={verticalListSortingStrategy}>
                <div className="space-y-8 sm:space-y-10">
                  {gruposCat.map((g) => (
                    <div key={g.cat.id}>
                      <div
                        className="sticky top-0 z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-3 pb-3.5 sm:pt-3.5 sm:pb-4 mb-5 sm:mb-6 flex items-center gap-3"
                        style={{
                          background: "rgba(247, 248, 250, 0.94)",
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                          borderBottom: `1px solid ${T.line}`,
                          boxShadow: "0 6px 12px -12px rgba(16, 24, 40, 0.18)",
                        }}
                      >

                        <span className="shrink-0 rounded-full" style={{ width: 4, height: 32, background: g.cat.cor }} aria-hidden="true" />
                        <h3 className="flex-1 min-w-0 truncate font-display font-bold tracking-tight text-[26px] sm:text-[30px] leading-none" style={{ color: g.cat.cor }}>
                          {g.cat.nome}
                        </h3>
                        {(() => {
                          const contEmail = porCategoriaNoEmail.find((c) => c.id === g.cat.id)?.count ?? 0;
                          const excede = contEmail > MAX_POR_CATEGORIA;
                          // Excedentes: notícias mais para o fim da grelha do grupo (ordem desc), excluindo destaques.
                          const naoDestaque = g.items.filter((n) => !n.destaque);
                          const nExcedentes = Math.max(0, contEmail - MAX_POR_CATEGORIA);
                          const idsExcedentes = naoDestaque.slice(-nExcedentes).map((n) => n.id);
                          const podeMover = !bloqueado && idsExcedentes.length > 0 && !moverExcedentesM.isPending;
                          return (
                            <div className="shrink-0 flex items-center gap-2">
                              <span
                                className="text-[13px] sm:text-[14px] font-bold px-2.5 py-1 rounded-full"
                                style={{
                                  background: T.line,
                                  color: T.muted,
                                }}
                                title={`${g.items.length} notícia(s) aprovada(s) nesta categoria (email + só site)`}
                              >
                                Total · {g.items.length}
                              </span>
                              <span
                                className="text-[13px] sm:text-[14px] font-bold px-2.5 py-1 rounded-full"
                                style={{
                                  background: excede ? T.dangerSoft : "transparent",
                                  color: excede ? T.danger : T.muted,
                                  border: excede ? `1px solid ${T.danger}44` : "none",
                                }}
                                title={excede
                                  ? `Esta categoria tem ${contEmail} notícias no email — o máximo é ${MAX_POR_CATEGORIA}. As restantes deviam ir só para o site.`
                                  : `${contEmail} no email · máximo ${MAX_POR_CATEGORIA} por categoria`}
                              >
                                {contEmail}/{MAX_POR_CATEGORIA} no email
                              </span>
                              {(() => {
                                // Explica porque é que uma categoria com notícias
                                // aprovadas não aparece no bloco «Categorias» do email.
                                const regulares = g.items.filter((n) => !n.destaque);
                                if (contEmail > 0 || regulares.length === 0) return null;
                                const razoes = new Set(regulares.map((n) => razaoDestinoDe(n.id)));
                                const motivo = razoes.has("categoria_oculta")
                                  ? "categoria oculta no email"
                                  : razoes.has("auto_corte_global")
                                    ? `tecto de ${MAX_TOTAL_EMAIL} notícias atingido`
                                    : razoes.has("auto_extra_categoria")
                                      ? `limite de ${MAX_POR_CATEGORIA} por categoria`
                                      : "todas fixadas como «Só no site»";
                                return (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-bold px-2.5 py-1 rounded-full"
                                    style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
                                    title={`Nenhuma notícia desta categoria entra no bloco «Categorias» do email — ${motivo}.`}
                                  >
                                    <Globe size={12} /> Fora do email · {motivo}
                                  </span>
                                );
                              })()}

                              {excede && podeMover && (
                                <button
                                  type="button"
                                  onClick={() => moverExcedentesM.mutate({ ids: idsExcedentes, rotuloCategoria: g.cat.curto })}
                                  disabled={!podeMover}
                                  className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full transition hover:opacity-90 disabled:opacity-50"
                                  style={{ background: T.dangerSoft, color: T.danger, border: `1px solid ${T.danger}44` }}
                                  title={`Passa ${idsExcedentes.length} notícia(s) para «Só no site», mantendo as ${MAX_POR_CATEGORIA} primeiras no email`}
                                >
                                  <Globe size={12} /> Mover {idsExcedentes.length} para o site
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(() => {
                        const LIMITE = 2;
                        const totalGrupo = g.items.length;
                        const expandido = catExpandido[g.cat.id] ?? false;
                        const escondidos = Math.max(0, totalGrupo - LIMITE);
                        const visiveis = expandido || totalGrupo <= LIMITE ? g.items : g.items.slice(0, LIMITE);
                        return (
                      <>
                      <div className="space-y-3">
                        {visiveis.map((n, iLocal) => (
                          <SortableRow key={n.id} id={n.id} disabled={bloqueado}>
                            {({ dragHandle }) => {
                              const wpActivo = previewDestino === "wordpress";
                              const soSite = destinoEfectivoDe(n.id) === "site";
                              const borda = n.destaque
                                ? `1.5px solid ${T.goldBorder}`
                                : soSite
                                  ? `1px dashed ${T.line}`
                                  : wpActivo
                                    ? `1.5px solid ${g.cat.cor}66`
                                    : `1px solid ${T.line}`;
                              const sombraWp = wpActivo && !n.destaque && !soSite ? `0 0 0 3px ${g.cat.cor}14` : undefined;
                              const emEd = editando === n.id;
                              const sombraFinal = emEd
                                ? "0 6px 24px -12px rgba(79,70,229,0.35), 0 0 0 3px rgba(79,70,229,0.10)"
                                : sombraWp;
                              const fundo = soSite
                                ? "#F2F4F7"
                                : "linear-gradient(180deg,#FFFFFF 0%,#F5F3FF 100%)";
                              const opacidade = soSite && !emEd ? 0.75 : 1;
                              const bordaEsquerda = soSite || n.destaque ? undefined : `3px solid ${g.cat.cor}`;
                              return (
                              <div className="rounded-xl p-3 sm:p-4 transition-shadow"
                                data-noticia-id={n.id}
                                data-noticia-edicao-id={n.id}
                                style={{ background: fundo, border: borda, borderLeft: bordaEsquerda, boxShadow: sombraFinal, opacity: opacidade }}>

                                <div className="flex items-start gap-2 sm:gap-3">
                                  <div className="flex flex-col shrink-0 items-center gap-0.5">
                                    {dragHandle(<GripVertical size={16} style={{ color: T.faint }} />)}
                                    <div className="inline-flex"><BtnIcone onClick={() => !bloqueado && moverDentroGrupo(g.cat.id, iLocal, -1)} disabled={iLocal === 0 || bloqueado || reordenarNoticiasM.isPending} title="Subir no grupo"><ChevronUp size={18} /></BtnIcone></div>
                                    <span className="text-center text-[13px] font-bold min-w-[24px]" style={{ color: soSite ? T.faint : T.primary }}>{iLocal + 1}</span>
                                    <div className="inline-flex"><BtnIcone onClick={() => !bloqueado && moverDentroGrupo(g.cat.id, iLocal, 1)} disabled={iLocal === visiveis.length - 1 || bloqueado || reordenarNoticiasM.isPending} title="Descer no grupo"><ChevronDown size={18} /></BtnIcone></div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CatSelect n={n} disabled={bloqueado}
                                        onChange={(cat) => patchNoticia.mutate({ id: n.id, patch: { categoria: cat }, log: `Recategorizou → ${catDe(cat).curto}` })} />
                                      {n.destaque && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                                          style={{ background: "#FEF3C7", color: "#92400E" }}
                                          title="Destaque da semana">
                                          ★ Destaque
                                        </span>
                                      )}
                                      {soSite ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                          style={{ background: "#EAECF0", color: "#475467", border: `1px solid ${T.line}` }}
                                          title="Não entra no email, aparece só na página WordPress">
                                          <Globe size={10} /> Só no site
                                        </span>
                                      ) : !n.destaque && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                          style={{ background: T.primarySoft, color: T.primary, border: `1px solid ${T.primary}22` }}
                                          title="Vai entrar na newsletter (email)">
                                          <Mail size={10} /> No email
                                        </span>
                                      )}
                                      {overrideDe(n) !== "auto" && (
                                        <button
                                          type="button"
                                          disabled={bloqueado || patchNoticia.isPending}
                                          onClick={() => patchNoticia.mutate({
                                            id: n.id,
                                            patch: { override_destino: "auto" },
                                            log: `Devolveu «${stripLeadingEmoji(n.titulo).slice(0, 40)}» ao automático`,
                                          })}
                                          className="text-[11px] font-semibold underline underline-offset-2 disabled:opacity-40"
                                          style={{ color: T.faint }}
                                          title="Fixado manualmente — clica para voltar a seguir a regra automática (2 por categoria)"
                                        >
                                          Automático
                                        </button>
                                      )}
                                    </div>


                                    {editando === n.id ? (
                                      <NoticiaEditForm
                                        draft={draft}
                                        onDraftChange={setDraft}
                                        onCancel={() => setEditando(null)}
                                        onSubmit={() => guardarEdicao(n.id, n.url)}
                                        submitLabel="Guardar"
                                        submitTone="primary"
                                      />
                                    ) : (
                                      <>
                                        <p className="text-[17px] sm:text-[16px] font-bold leading-snug mt-2">{stripLeadingEmoji(n.titulo)}</p>
                                        <p className="text-[15.5px] sm:text-[14px] mt-1.5 leading-relaxed" style={{ color: T.muted }}>{n.descricao}</p>
                                        {(() => {
                                          const li = linkParaNoticia(n.url);
                                          if (!li || li.estado === "ok") return null;
                                          const critico = li.estado === "quebrado";
                                          const cor = critico ? T.danger : T.warn;
                                          const soft = critico ? T.dangerSoft : T.warnSoft;
                                          const Icone = critico ? XCircle : AlertTriangle;
                                          const rotulo = critico
                                            ? `Link quebrado${li.status ? ` (${li.status})` : ""}`
                                            : li.estado === "redireccionado"
                                              ? "Link redirecciona"
                                              : `Link suspeito${li.status ? ` (${li.status})` : ""}`;
                                          return (
                                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: soft, border: `1px solid ${cor}33` }}
                                              title={li.redirect_para ? `Destino final: ${li.redirect_para}` : undefined}>
                                              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: cor }}>
                                                <Icone size={14} /> {rotulo}
                                              </span>
                                              <button type="button" onClick={() => verificarLinksM.mutate({ forcar: true })} disabled={verificarLinksM.isPending}
                                                className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40" style={{ color: cor }}>
                                                {verificarLinksM.isPending ? "A reverificar…" : "Reverificar"}
                                              </button>
                                              <button type="button" onClick={() => n.url && ignorarLinkM.mutate(n.url)} disabled={ignorarLinkM.isPending || !n.url}
                                                title="Já confirmei manualmente que o link funciona"
                                                className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40" style={{ color: T.ok }}>
                                                {ignorarLinkM.isPending ? "A confirmar…" : "Confirmar OK"}
                                              </button>
                                              <button type="button" onClick={abrirLinks}
                                                className="text-[12px] font-semibold underline underline-offset-2" style={{ color: T.muted }}>
                                                Ver todos
                                              </button>
                                            </div>
                                          );
                                        })()}
                                        <div className="mt-2"><Url href={n.url} /></div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                {editando !== n.id && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t" style={{ borderColor: T.line }}>
                                    <button onClick={() => !bloqueado && toggleDestaque(n)} disabled={bloqueado} aria-label={n.destaque ? "Retirar destaque" : "Marcar Destaque da Semana"}
                                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold"
                                      style={{ background: n.destaque ? `${T.gold}1F` : T.shell, color: n.destaque ? "#92400E" : T.ink, border: `1px solid ${T.line}` }}>
                                      <Star size={18} fill={n.destaque ? T.gold : "none"} /> Destaque
                                    </button>
                                    <button onClick={() => alternarDestino(n)} disabled={bloqueado || patchNoticia.isPending}
                                      role="switch" aria-checked={destinoEfectivoDe(n.id) === "email"}
                                      title={soSite
                                        ? "Actualmente só na página WordPress — clica para voltar a incluir no email"
                                        : "Retira do email e mantém só na página WordPress"}
                                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold"
                                      style={soSite
                                        ? { background: "#F2F4F7", color: "#344054", border: `1px solid ${T.line}` }
                                        : { background: T.shell, color: T.muted, border: `1px solid ${T.line}` }}>
                                      {soSite ? <><Mail size={16} /> No email</> : <><Globe size={16} /> Só no site</>}
                                    </button>
                                    <button onClick={() => !bloqueado && abrirEdicao(n)} disabled={bloqueado} aria-label="Editar texto"
                                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold" style={{ background: T.primarySoft, color: T.primary }}>
                                      <Pencil size={18} /> Editar
                                    </button>
                                    <button onClick={() => {
                                      if (bloqueado) return;
                                      if (!window.confirm(`Remover «${stripLeadingEmoji(n.titulo).slice(0, 50)}»? A acção não pode ser desfeita.`)) return;
                                      apagar.mutate(n);
                                    }} disabled={bloqueado || apagar.isPending} aria-label="Remover notícia"
                                      className="min-h-11 flex items-center justify-center gap-1.5 rounded-lg transition-transform hover:scale-105 disabled:opacity-40 text-[14px] font-bold" style={{ background: T.dangerSoft, color: T.danger }}>
                                      <Trash2 size={18} /> Remover
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                            }}
                          </SortableRow>
                        ))}
                      </div>
                      {escondidos > 0 && (
                        <button
                          type="button"
                          onClick={() => setCatExpandido((s) => ({ ...s, [g.cat.id]: !expandido }))}
                          className="mt-3 text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition hover:opacity-80"
                          style={{ background: T.shell, color: T.muted, border: `1px dashed ${T.line}` }}
                        >
                          {expandido
                            ? `Ver menos — mostrar só as ${LIMITE} primeiras`
                            : `Ver mais ${escondidos} notícia${escondidos === 1 ? "" : "s"} desta categoria`}
                        </button>
                      )}
                      </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </Card>

            );
          })()}





          {/* Ferramenta da semana */}
          {edicaoId && (() => {
            const activa = seccaoActiva("ferramentas_semana");
            return (
              <Foldable
                foldOpen={foldOpen} setFoldOpen={setFoldOpen}
                secId="ferramentas"
                icon={SECS.ferramentas.icon}
                accent={activa ? SECS.ferramentas.cor : COR_PASSIVA}
                titulo={SECS.ferramentas.titulo}
                defaultOpen={false}
                contador={activa ? "activa" : "desligada"}
              >
                {!activa && (
                  <div className="rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-2"
                    style={{ background: "#FFFAEB", border: "1px solid #FDE68A", color: "#B54708" }}>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>Secção desligada na Estrutura — as ferramentas preenchidas ficarão ocultas do email e da página.</span>
                  </div>
                )}
                <FerramentasSemana
                  edicaoId={edicaoId}
                  bloqueado={bloqueado}
                  onAcao={(m) => registarAudit(nomeExibicao, m).catch(() => {})}
                />
              </Foldable>
            );
          })()}


          {/* Secções personalizadas — cartões editáveis inline, ordenados pela sua `ordem` na Estrutura */}
          {seccoes
            .filter((s) => s.tipo === "personalizada")
            .sort((a, b) => a.ordem - b.ordem)
            .map((s) => (
              <SeccaoPersonalizadaCard
                key={s.id}
                seccao={s}
                bloqueado={bloqueado}
                Foldable={Foldable}
                foldOpen={foldOpen}
                setFoldOpen={setFoldOpen}
                onAcao={(m) => registarAudit(nomeExibicao, m).catch(() => {})}
                onRemovida={invalidateSeccoes}
              />
            ))}


          {/* Estrutura da Edição — accordion fechado por omissão (movido para o fim: primeiro edito, depois configuro) */}
          <Foldable foldOpen={foldOpen} setFoldOpen={setFoldOpen} secId="estrutura" icon={SECS.estrutura.icon} accent={SECS.estrutura.cor} titulo={SECS.estrutura.titulo}
            defaultOpen={false}
            contador={`${seccoesActivas.length}/${seccoes.length} activas`}>
            <p className="text-xs mb-3" style={{ color: T.faint }}>
              Ordem das secções no email — arrasta pela pega ou usa as setas para reordenar. Desliga o que não deve entrar nesta edição. Aqui também controlas os blocos fixos «Livro» e «Recursos».
            </p>
            {(() => {
              const avisos: string[] = [];
              if (!seccaoActiva("destaques") && destaques.length > 0)
                avisos.push(`Tens ${destaques.length} notícia(s) marcada(s) como destaque, mas a secção «Destaques» está desligada.`);
              if (!seccaoActiva("categorias") && naNews.some((n) => !n.destaque))
                avisos.push(`Tens notícias com destino «Newsletter» que iriam para a secção «Categorias», mas está desligada.`);
              if (seccoesActivas.length === 0)
                avisos.push("Nenhuma secção activa — activa pelo menos uma.");
              return avisos.length > 0 ? (
                <div className="rounded-lg px-3 py-2 mb-3 text-xs flex items-start gap-2"
                  style={{ background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E" }}>
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <div className="space-y-0.5">{avisos.map((a, i) => <p key={i}>{a}</p>)}</div>
                </div>
              ) : null;
            })()}
            <div className="flex justify-end mb-2">
              <button onClick={() => !bloqueado && setSeccaoModal({ modo: "criar" })} disabled={bloqueado}
                className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-40"
                style={{ background: SECS.personal.cor }}>
                <Plus size={12} /> Adicionar secção
              </button>
            </div>
            <SortableList
              ids={idsSeccoes}
              disabled={bloqueado}
              onReorder={(ids) => {
                const map = new Map(seccoes.map((s) => [s.id, s]));
                qc.setQueryData(["seccoes", edicaoId], ids.map((id, i) => ({ ...map.get(id)!, ordem: i })));
                reordenarSeccoesM.mutate(ids);
              }}
            >
              <div className="space-y-1.5">
                {seccoes.map((s, idx) => {
                  const meta = metaDe(s.tipo as SeccaoTipo);
                  const Ico = meta.icone;
                  const nome = s.tipo === "personalizada" ? (s.titulo || "Secção personalizada") : meta.rotulo;
                  const cor = s.tipo === "personalizada" ? corDe(s.cor).solid : SECS.estrutura.cor;
                  const podeMinimoUm = seccoesActivas.length <= 1 && s.activo;
                  return (
                    <SortableRow key={s.id} id={s.id} disabled={bloqueado}>
                      {({ dragHandle }) => (
                        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                          style={{ background: T.card, border: `1px solid ${T.line}`, opacity: s.activo ? 1 : 0.55 }}>
                          {dragHandle(<GripVertical size={16} style={{ color: T.faint }} />)}
                          <div className="flex flex-col">
                            <button type="button" disabled={bloqueado || idx === 0 || moverSeccaoM.isPending}
                              onClick={() => moverSeccaoM.mutate({ seccaoId: s.id, direccao: "cima" })}
                              className="p-0.5 disabled:opacity-20" title="Subir"><ChevronUp size={14} /></button>
                            <button type="button" disabled={bloqueado || idx === seccoes.length - 1 || moverSeccaoM.isPending}

                              onClick={() => moverSeccaoM.mutate({ seccaoId: s.id, direccao: "baixo" })}
                              className="p-0.5 disabled:opacity-20" title="Descer"><ChevronDown size={14} /></button>
                          </div>
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                            style={{ background: `${cor}14`, color: cor }}>
                            <Ico size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{nome}</p>
                            <p className="text-[11px] truncate" style={{ color: T.faint }}>{meta.descricao}</p>
                          </div>
                          {s.tipo === "personalizada" && (
                            <>
                              <button disabled={bloqueado} onClick={() => setSeccaoModal({ modo: "editar", seccao: s })}
                                className="p-1.5 rounded-md" style={{ background: T.primarySoft, color: T.primary }} title="Editar">
                                <Pencil size={13} />
                              </button>
                              <button disabled={bloqueado} onClick={() => apagarPersonalizada.mutate(s)}
                                className="p-1.5 rounded-md" style={{ background: T.dangerSoft, color: T.danger }} title="Remover">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          <label className="inline-flex items-center cursor-pointer" title={podeMinimoUm ? "Tem de haver pelo menos uma secção activa" : (s.activo ? "Desligar" : "Ligar")}>
                            <input type="checkbox" className="sr-only peer" checked={s.activo}
                              disabled={bloqueado || podeMinimoUm}
                              onChange={(e) => togglarSeccao.mutate({ s, activo: e.target.checked })} />
                            <div className="w-9 h-5 rounded-full transition-colors relative"
                              style={{ background: s.activo ? SECS.edicao.cor : T.line }}>
                              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                                style={{ transform: s.activo ? "translateX(16px)" : "translateX(0)" }} />
                            </div>
                          </label>
                        </div>
                      )}
                    </SortableRow>
                  );
                })}
              </div>
            </SortableList>
          </Foldable>

        </div>

        <div ref={previewRef} className={`${tab === "editor" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-28">
            <Preview edicaoId={edicaoId} refreshKey={previewKey} destino={previewDestino} onDestinoChange={setPreviewDestino} />
          </div>
        </div>

      </main>

      {/* Modais */}
      {/* (removido) modal aviso-checklist externo — passou a Fase 1 do modal "enviar". */}


      {modal === "links" && (
        <ModalLinks
          items={linksItems}
          resumo={linksResumo}
          verificadoEm={linksVerificadosEm}
          pending={verificarLinksM.isPending}
          onClose={() => setModal(null)}
          onReverificar={() => verificarLinksM.mutate({ forcar: true })}
          onEditar={(ctx) => {
            setModal(null);
            if (ctx.tipo === "noticia") {
              requestAnimationFrame(() => focarNoticia(ctx.id));
            } else {
              irParaSeccao("ferramentas");
            }
          }}
        />
      )}

      {modalSugestaoAberto && edicaoId && (
        <ModalSugestaoOrganizacao
          edicaoId={edicaoId}
          nomeUtilizador={nomeExibicao}
          onClose={() => setModalSugestaoAberto(false)}
          onAplicado={(n) => notify(`${n} notícia${n === 1 ? "" : "s"} actualizada${n === 1 ? "" : "s"} pela sugestão da IA`)}
        />
      )}



      {modal === "enviar" && (() => {
        const listasActivas = listasEgoi.filter((l) => l.activa);
        const listasTeste = listasActivas.filter((l) => l.tipo === "teste");
        const listasReal = listasActivas.filter((l) => l.tipo === "real");
        const listasEscolhidas = listasActivas.filter((l) => listasSel.includes(l.id));
        const isReal = listasEscolhidas.some((l) => l.tipo === "real");
        const semListaConfig = listasActivas.length === 0;
        const bloqueioCurador = isReal && !isAdmin;
        const numOk = !isReal || confirmNumero.trim() === String(edicao.numero);
        const cronicaTextoLen = cronicaTextoLenLive;
        type Sev = "ok" | "aviso" | "bloqueia";
        const checks: { id: string; sev: Sev; texto: string }[] = [
          assunto.trim().length < 10
            ? { id: "assunto", sev: "bloqueia", texto: `Assunto demasiado curto (${assunto.trim().length}/10).` }
            : assunto.trim().length > 90
              ? { id: "assunto", sev: "bloqueia", texto: `Assunto demasiado longo (${assunto.trim().length}/90).` }
              : { id: "assunto", sev: "ok", texto: `Assunto: «${assunto.trim().slice(0, 60)}${assunto.trim().length > 60 ? "…" : ""}»` },
          destaques.length === 0
            ? { id: "destaques", sev: "bloqueia", texto: "Sem destaques — a secção do topo fica vazia." }
            : destaques.length < 3
              ? { id: "destaques", sev: "aviso", texto: `Só ${destaques.length} destaque(s); o normal são 3.` }
              : { id: "destaques", sev: "ok", texto: "3 destaques prontos." },
          aprovadas.length === 0
            ? { id: "noticias", sev: "bloqueia", texto: "Nenhuma notícia aprovada." }
            : aprovadas.length < 3
              ? { id: "noticias", sev: "aviso", texto: `Apenas ${aprovadas.length} notícia(s) aprovadas.` }
              : { id: "noticias", sev: "ok", texto: `${aprovadas.length} notícias aprovadas (${naNews.length} na newsletter).` },
          cronicaTextoLen === 0
            ? { id: "cronica", sev: "aviso", texto: "Crónica vazia — vai ser omitida no envio." }
            : cronicaTextoLen < 200
              ? { id: "cronica", sev: "aviso", texto: `Crónica curta (${cronicaTextoLen} caracteres).` }
              : { id: "cronica", sev: "ok", texto: `Crónica com ${cronicaTextoLen} caracteres.` },
          edicao.episodio
            ? { id: "podcast", sev: "ok", texto: `Podcast: ${edicao.episodio.codigo ?? edicao.episodio.titulo.slice(0, 40)}` }
            : { id: "podcast", sev: "aviso", texto: "Sem episódio de podcast associado." },
          seccoesActivas.length < 3
            ? { id: "seccoes", sev: "aviso", texto: `Só ${seccoesActivas.length} secção(ões) activa(s) na estrutura.` }
            : { id: "seccoes", sev: "ok", texto: `${seccoesActivas.length} secções activas na estrutura.` },
          isReal
            ? { id: "wp", sev: "ok", texto: "Página WordPress passa automaticamente de rascunho a publicada." }
            : { id: "wp", sev: "ok", texto: "Modo teste: WordPress fica em rascunho para poderes rever." },
        ];
        const temBloqueio = checks.some((c) => c.sev === "bloqueia");
        const podeAvancar = !temBloqueio && !bloqueioCurador && listasEscolhidas.length > 0;
        const iconeSev = (s: Sev) => s === "ok" ? "✓" : s === "aviso" ? "!" : "✕";
        const corSev = (s: Sev) => s === "ok" ? "#067647" : s === "aviso" ? T.warn : T.danger;
        const bgSev = (s: Sev) => s === "ok" ? "#ECFDF3" : s === "aviso" ? T.warnSoft : T.dangerSoft;

        const resumoDestino = listasEscolhidas.length === 0
          ? "Escolhe pelo menos uma lista."
          : `Vai enviar para: ${listasEscolhidas.map((l) => l.nome).join(", ")}`;

        const GRAD_MARCA = "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899)";
        const iconeSevNode = (sev: Sev) =>
          sev === "ok" ? <CheckCircle2 size={18} style={{ color: corSev(sev) }} />
          : sev === "aviso" ? <AlertTriangle size={18} style={{ color: corSev(sev) }} />
          : <XCircle size={18} style={{ color: corSev(sev) }} />;

        // Cor do "modo" no cabeçalho: âmbar = real, verde = teste, vermelho = há bloqueio
        const modoCor = temBloqueio ? "#EF4444" : isReal ? "#F59E0B" : "#10B981";
        const modoTitulo = temBloqueio ? "Envio bloqueado" : isReal ? "Envio real" : listasSel.length === 0 ? "Escolhe as listas" : "Envio de teste";
        const modoSub = temBloqueio
          ? "Resolve os bloqueios abaixo antes de continuar."
          : isReal
            ? "Inclui uma ou mais listas reais — subscritores vão receber."
            : listasSel.length === 0
              ? "Ainda não seleccionaste destino."
              : "Só listas de teste seleccionadas — nada vai para subscritores.";
        const ModoIcone = isReal ? Radio : TestTube2;

        const renderListaCartao = (l: (typeof listasActivas)[number]) => {
          const escolhida = listasSel.includes(l.id);
          const isRealLista = l.tipo === "real";
          const desactivar = isRealLista && !isAdmin;
          const corLista = isRealLista ? "#F59E0B" : "#10B981";
          const campanha = campanhaPorLista.get(l.id);
          return (
            <button
              key={l.id}
              type="button"
              role="checkbox"
              aria-checked={escolhida}
              disabled={desactivar}
              onClick={() => setListasSel((prev) => prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id])}
              className={`relative text-left rounded-xl p-4 min-h-[44px] transition ${desactivar ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:shadow-sm"}`}
              style={{
                background: escolhida ? "#fff" : T.card,
                border: escolhida ? "1.5px solid transparent" : `1.5px solid ${T.line}`,
                backgroundImage: escolhida ? `${GRAD_MARCA} border-box, #fff padding-box` : undefined,
                backgroundOrigin: escolhida ? "border-box" : undefined,
                backgroundClip: escolhida ? "border-box, padding-box" : undefined,
                boxShadow: escolhida ? "0 0 0 4px rgba(139,92,246,0.14)" : undefined,
              }}
            >
              {escolhida && (
                <span className="absolute top-2.5 right-2.5 inline-flex items-center justify-center rounded-full"
                  style={{ width: 20, height: 20, background: GRAD_MARCA, color: "#fff" }}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              {desactivar && (
                <span className="absolute top-2.5 right-2.5" style={{ color: T.muted }}>
                  <Lock size={14} />
                </span>
              )}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
                  style={{ background: `${corLista}22`, color: corLista }}>
                  {isRealLista ? "Real" : "Teste"}
                </span>
              </div>
              <p className="text-[15px] font-semibold leading-tight" style={{ color: T.ink }}>{l.nome}</p>
              <p className="text-[11px] mt-1 font-mono" style={{ color: T.faint ?? T.muted }}>ID {l.egoi_lista_id}</p>
              {campanha ? (
                <p className="text-[11px] mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold"
                  style={campanha.estado === "enviada"
                    ? { background: "#DCFCE7", color: "#166534" }
                    : { background: "#EEF2FF", color: "#4338CA" }}>
                  {campanha.estado === "enviada"
                    ? <>✓ Já recebeu esta edição · {new Date(campanha.actualizado_em).toLocaleDateString("pt-PT")}</>
                    : <>📝 Rascunho na E-goi · {tempoRelativo(campanha.actualizado_em)}</>}
                </p>
              ) : (
                <p className="text-[11px] mt-2" style={{ color: T.faint ?? T.muted }}>Ainda por criar</p>
              )}
            </button>
          );
        };

        const renderListasBloco = () => (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: T.muted }}>
              Para que listas queres enviar?
            </p>
            {semListaConfig ? (
              <div className="rounded-lg px-3.5 py-3 flex items-start gap-2" style={{ background: T.dangerSoft, border: `1px solid ${T.dangerAccent}33` }}>
                <AlertTriangle size={16} style={{ color: T.danger }} className="mt-0.5 shrink-0" />
                <p className="text-sm" style={{ color: T.danger }}>
                  Nenhuma lista configurada. Vai a <strong>Definições → E-goi</strong> para adicionar.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[...listasTeste, ...listasReal].map(renderListaCartao)}
                </div>
                {(() => {
                  const repetidas = listasEscolhidas.filter((l) => listasJaEnviadas.has(l.id));
                  if (repetidas.length === 0) return null;
                  return (
                    <p className="mt-3 text-xs flex items-start gap-1.5 px-3 py-2 rounded-lg" style={{ background: T.warnSoft, color: T.warn }}>
                      <AlertTriangle size={13} className="mt-[1px] shrink-0" />
                      <span>
                        {repetidas.length} lista{repetidas.length === 1 ? "" : "s"} ({repetidas.map((l) => l.nome).join(", ")}) já
                        recebeu esta edição — os contactos vão recebê-la outra vez.
                      </span>
                    </p>
                  );
                })()}
                {bloqueioCurador && (
                  <p className="mt-3 text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: T.warnSoft, color: T.warn }}>
                    <Lock size={12} /> Esta selecção inclui uma lista real — pede a um admin para disparar o envio.
                  </p>
                )}
              </>
            )}
          </div>
        );

        // Stepper: 3 fases visíveis (Checklist · Links · Destino). Confirmação real e disparo são sub-passos da Fase 3.
        const faseIndice =
          envioFase === "checklist" ? 1
          : envioFase === "verificar-links" ? 2
          : 3; // revisao | confirmacao | confirmar-disparo
        const faseNome =
          envioFase === "checklist" ? "Secções por concluir"
          : envioFase === "verificar-links" ? "Verificação de links"
          : envioFase === "resultado" ? "Resultado da publicação"
          : envioFase === "confirmacao" ? "Confirmação final"
          : envioFase === "confirmar-disparo" ? "Confirmação de disparo"
          : "Destino do envio";
        const stepLabel = `Fase ${faseIndice} de 3 · ${faseNome}`;

        const linksProntos = !!linksResumo && linksResumo.quebrado === 0;
        const linksTotais = linksResumo?.total ?? 0;
        const linksProblemas = (linksItems ?? []).filter(
          (it) => (it.estado === "quebrado" || it.estado === "suspeito") && !linksResolvidos.includes(it.url),
        );
        const linksAprovadosCount = linksIgnoradosSet.size;
        const linksQuebradosCount = linksProblemas.filter((it) => it.estado === "quebrado").length;
        const linksSuspeitosCount = linksProblemas.filter((it) => it.estado === "suspeito").length;
        const linksSemProblemas = linksProblemas.length === 0;

        // Avanço automático: salta Fase 2 se, ao chegar de Fase 1, os links estiverem OK e já verificados.
        const podeSaltarLinks = !verificarLinksM.isPending && !!linksResumo
          && linksResumo.quebrado === 0 && linksResumo.suspeito === 0;


        // Bundle: em modo real escreve a página e avança para a confirmação (o envio
        // real nunca parte sem o número da edição). Em modo teste corre os três passos
        // — página no site, rascunho na E-goi e email de teste — e mostra o resultado.
        const nomesListas = listasEscolhidas.map((l) => l.nome).join(", ");
        const marcar = (id: PassoBundle["id"], patch: Partial<PassoBundle>) =>
          setBundlePassos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

        const handlePublicarTudo = async () => {
          if (isReal) {
            try { await publicarWpM.mutateAsync(); }
            catch { return; /* erro já mostrado no cartão */ }
            void registarAudit(nomeExibicao, `Passou revisão · edição #${edicao.numero} (bundle)`);
            setEnvioFase("confirmacao");
            return;
          }

          bundleActivoRef.current = true;
          setBundlePassos([
            { id: "site", rotulo: "Página no site (WordPress)", estado: "a_correr" },
            { id: "rascunho", rotulo: "Rascunho na E-goi", estado: "espera" },
            { id: "teste", rotulo: `Email de teste · ${nomesListas || "listas escolhidas"}`, estado: "espera" },
          ]);
          setEnvioFase("resultado");

          try {
            const r = await publicarWpM.mutateAsync();
            marcar("site", { estado: "ok", detalhe: r.mensagem, url: r.post_url ?? undefined });
          } catch (e) {
            marcar("site", { estado: "erro", detalhe: (e as Error).message });
            marcar("rascunho", { estado: "erro", detalhe: "Não corrido — o passo anterior falhou." });
            marcar("teste", { estado: "erro", detalhe: "Não corrido — o passo anterior falhou." });
            bundleActivoRef.current = false;
            return;
          }

          marcar("rascunho", { estado: "a_correr" });
          try {
            const r = await rascunhoM.mutateAsync();
            if (r.falhas > 0) {
              marcar("rascunho", { estado: "erro", detalhe: r.mensagem });
              marcar("teste", { estado: "erro", detalhe: "Não corrido — o rascunho não ficou pronto." });
              bundleActivoRef.current = false;
              return;
            }
            marcar("rascunho", { estado: "ok", detalhe: `Actualizado em ${r.sucessos} lista(s).` });
          } catch (e) {
            marcar("rascunho", { estado: "erro", detalhe: (e as Error).message });
            marcar("teste", { estado: "erro", detalhe: "Não corrido — o passo anterior falhou." });
            bundleActivoRef.current = false;
            return;
          }

          marcar("teste", { estado: "a_correr" });
          try {
            const r = await disparoM.mutateAsync();
            marcar("teste", {
              estado: r.falhas === 0 ? "ok" : "erro",
              detalhe: r.falhas === 0 ? `Enviado para ${r.sucessos} lista(s) de teste.` : r.mensagem,
            });
          } catch (e) {
            marcar("teste", { estado: "erro", detalhe: (e as Error).message });
          }
          bundleActivoRef.current = false;
        };
        const bundlePending = publicarWpM.isPending || rascunhoM.isPending || disparoM.isPending;
        const bundleACorrer = bundlePassos.some((p) => p.estado === "a_correr" || p.estado === "espera");

        return (
        <Modal size="xl" chromeless onClose={() => { if (!enviarM.isPending && !bundleActivoRef.current) { setModal(null); resetEnvioModal(); } }}>

          {/* ── CABEÇALHO CINEMATOGRÁFICO ── */}
          <header className="relative shrink-0" style={{ background: "linear-gradient(135deg,#0B1523 0%,#14162E 100%)" }}>
            {/* risco em gradiente no topo */}
            <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: GRAD_MARCA, borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }} />
            <button onClick={() => { if (!enviarM.isPending && !bundleActivoRef.current) { setModal(null); resetEnvioModal(); } }}
              className="absolute top-4 right-4 p-1.5 rounded-md transition hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Fechar">
              <X size={20} />
            </button>
            <div className="px-6 sm:px-8 pt-7 pb-6">
              <div className="flex items-center gap-3 mb-2">
                {[
                  { n: 1, nome: "Secções" },
                  { n: 2, nome: "Links" },
                  { n: 3, nome: "Destino" },
                ].map((s, i, arr) => {
                  const activo = faseIndice === s.n;
                  const feito = faseIndice > s.n;
                  return (
                    <div key={s.n} className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center rounded-full text-[11px] font-bold"
                        style={{
                          width: 22, height: 22,
                          background: activo ? "#fff" : feito ? "rgba(16,185,129,0.9)" : "rgba(255,255,255,0.10)",
                          color: activo ? "#0B1523" : feito ? "#fff" : "rgba(255,255,255,0.55)",
                          border: activo ? "none" : `1px solid rgba(255,255,255,${feito ? 0 : 0.15})`,
                        }}
                      >
                        {feito ? "✓" : s.n}
                      </span>
                      <span
                        className="text-[11.5px] font-semibold uppercase tracking-[0.08em]"
                        style={{ color: activo ? "#fff" : feito ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)" }}
                      >
                        {s.nome}
                      </span>
                      {i < arr.length - 1 && (
                        <span className="mx-1" style={{ width: 22, height: 1, background: "rgba(255,255,255,0.15)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                {stepLabel}
              </p>
              <h2 className="font-display font-bold" style={{ color: "#fff", fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                {eReenvio ? "Reenvio" : "Confirmar envio"} · Edição #{edicao.numero}
              </h2>
              {eReenvio && (
                <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Esta edição já foi disparada{dataUltimoDisparo ? ` a ${new Date(dataUltimoDisparo).toLocaleDateString("pt-PT")}` : ""} para{" "}
                  {listasJaEnviadas.size} lista{listasJaEnviadas.size === 1 ? "" : "s"}. Essas listas entram desmarcadas.
                </p>
              )}


              {/* Cartão de modo */}
              <div className="mt-5 rounded-xl p-4 flex items-start gap-3.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${modoCor}66`,
                  boxShadow: `0 0 0 3px ${modoCor}22`,
                }}>
                <span className="inline-flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 44, height: 44, background: `${modoCor}22`, color: modoCor }}>
                  <ModoIcone size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-[17px]" style={{ color: "#fff" }}>{modoTitulo}</p>
                  <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.7)" }}>{modoSub}</p>
                </div>
              </div>
            </div>
          </header>

          {/* ── CORPO ── */}
          <div className="flex-1 overflow-y-auto">
            {envioFase === "checklist" && (
              <div className="px-6 sm:px-8 py-6 space-y-5">
                <section>
                  <div className="rounded-xl px-4 py-4 flex items-start gap-3" style={{ background: T.warnSoft, border: `1px solid ${T.warn}33` }}>
                    <AlertTriangle size={20} style={{ color: T.warn }} className="mt-[1px] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14.5px] font-bold" style={{ color: T.warn }}>
                        {itensEmFalta.length === 1
                          ? "1 secção ainda por concluir"
                          : `${itensEmFalta.length} secções ainda por concluir`}
                      </p>
                      <p className="text-[12.5px] mt-0.5" style={{ color: T.ink }}>
                        Podes aprovar assim mesmo, mas confirma que é essa a intenção.
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${T.line}`, background: "#fff" }}>
                    {itensEmFalta.map((it, i) => {
                      const podeResolverAqui =
                        (it.chave === "cronica" && cronicaTemTexto) ||
                        (it.chave === "podcast" && episodios.length > 0);
                      return (
                      <li key={it.chave}
                        className="flex flex-wrap items-center gap-2 px-3.5 py-3"
                        style={{ borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}
                      >
                        <span className="inline-block rounded-full shrink-0"
                          style={{ width: 8, height: 8, background: T.warn }} aria-hidden="true" />
                        <span className="text-[14px] font-medium flex-1 min-w-[120px]" style={{ color: T.ink }}>
                          {it.rotulo}
                          {it.chave === "cronica" && cronicaTemTexto && (
                            <span className="block text-[12px] font-normal" style={{ color: T.muted }}>
                              A crónica já tem texto — falta confirmar.
                            </span>
                          )}
                          {it.chave === "podcast" && episodios.length > 0 && (
                            <span className="block text-[12px] font-normal" style={{ color: T.muted }}>
                              Nenhum episódio gravado nesta edição.
                            </span>
                          )}
                        </span>
                        {podeResolverAqui && (
                          <button
                            type="button"
                            disabled={bloqueado || escolherEp.isPending || marcarCronicaConcluidaM.isPending}
                            onClick={() => {
                              if (it.chave === "cronica") marcarCronicaConcluidaM.mutate(true);
                              else if (episodios[0]) escolherEp.mutate(episodios[0]);
                            }}
                            className="text-[12px] font-bold h-8 px-3 rounded-md text-white disabled:opacity-50"
                            style={{ background: T.primary }}
                          >
                            {it.chave === "cronica" ? "Marcar como concluída" : "Usar o mais recente"}
                          </button>
                        )}
                        {(it.chave === "cronica" || it.chave === "noticiasEmail" || it.chave === "podcast" || it.chave === "ferramenta") && (
                          <button
                            type="button"
                            onClick={() => {
                              setModal(null);
                              resetEnvioModal();
                              const alvo = it.destino;
                              irParaSeccao(alvo);
                            }}
                            className="text-[12px] font-semibold h-8 px-2.5 rounded-md"
                            style={{ background: T.shell, border: `1px solid ${T.line}`, color: T.muted }}
                          >
                            Ir à secção →
                          </button>
                        )}

                      </li>
                      );
                    })}

                    {itensEmFalta.length === 0 && (
                      <li className="flex items-center gap-2 px-3.5 py-3 text-[13.5px]" style={{ color: "#067647" }}>
                        <CheckCircle2 size={16} /> Tudo pronto — podes continuar.
                      </li>
                    )}
                  </ul>
                </section>
              </div>
            )}

            {envioFase === "verificar-links" && (

              <div className="px-6 sm:px-8 py-6 space-y-5">
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: T.muted }}>Verificação de links</p>

                  {verificarLinksM.isPending && (
                    <div className="rounded-xl px-4 py-6 flex items-center gap-3" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
                      <Loader2 size={18} className="animate-spin" style={{ color: T.primary }} />
                      <p className="text-[14px] font-semibold" style={{ color: T.ink }}>
                        🔗 A verificar {linksTotais > 0 ? `${linksTotais} links…` : "links…"}
                      </p>
                    </div>
                  )}

                  {!verificarLinksM.isPending && linksResumo && linksSemProblemas && (
                    <div className="rounded-xl px-4 py-5 flex items-start gap-3" style={{ background: "#ECFDF3", border: "1px solid #ABEFC6" }}>
                      <CheckCircle2 size={20} style={{ color: "#067647" }} className="mt-[1px] shrink-0" />
                      <div>
                        <p className="text-[14.5px] font-bold" style={{ color: "#067647" }}>Todos os {linksResumo.total} links OK</p>
                        <p className="text-[12.5px] mt-0.5" style={{ color: "#0F4C31" }}>Podes avançar para a revisão final.</p>
                      </div>
                    </div>
                  )}

                  {!verificarLinksM.isPending && linksResumo && !linksSemProblemas && (
                    <>
                      <div className="rounded-xl px-4 py-4 mb-3 flex items-start gap-3" style={{
                        background: linksQuebradosCount > 0 ? T.dangerSoft : T.warnSoft,
                        border: `1px solid ${linksQuebradosCount > 0 ? T.dangerAccent : T.warn}33`,
                      }}>
                        {linksQuebradosCount > 0
                          ? <XCircle size={20} style={{ color: T.danger }} className="mt-[1px] shrink-0" />
                          : <AlertTriangle size={20} style={{ color: T.warn }} className="mt-[1px] shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[14.5px] font-bold" style={{ color: linksQuebradosCount > 0 ? T.danger : T.warn }}>
                            {linksQuebradosCount} quebrado{linksQuebradosCount === 1 ? "" : "s"} · {linksSuspeitosCount} suspeito{linksSuspeitosCount === 1 ? "" : "s"} · {linksAprovadosCount} aprovado{linksAprovadosCount === 1 ? "" : "s"}
                          </p>
                          <p className="text-[12.5px] mt-0.5" style={{ color: T.ink }}>
                            Corrige o link aqui mesmo, aprova-o como verificado ou rejeita para o tirar da edição.
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2 list-none p-0 m-0">
                        {linksProblemas.map((it, i) => (
                          <CartaoLinkProblema
                            key={`${it.url}-${i}`}
                            item={it}
                            aGuardar={guardarUrlLinkM.isPending}
                            aRejeitar={rejeitarLinkM.isPending}
                            aAprovar={ignorarLinkM.isPending}
                            onGuardarUrl={(urlNovo) => guardarUrlLinkM.mutate({ contexto: it.contexto, urlAntigo: it.url, urlNovo })}
                            onAprovar={() => ignorarLinkM.mutate(it.url)}
                            onRejeitar={() => rejeitarLinkM.mutate({ contexto: it.contexto, url: it.url })}
                            onAbrirNoEditor={() => {
                              setModal(null);
                              resetEnvioModal();
                              if (it.contexto.tipo === "noticia") {
                                requestAnimationFrame(() => focarNoticia(it.contexto.id));
                              } else {
                                irParaSeccao("ferramentas");
                              }
                            }}
                          />
                        ))}
                      </ul>

                      {linksAprovadosCount > 0 && (
                        <details className="mt-3 rounded-lg" style={{ background: "#ECFDF3", border: "1px solid #ABEFC6" }}>
                          <summary className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer list-none">
                            <CheckCircle2 size={15} style={{ color: "#067647" }} />
                            <span className="text-[13px] font-semibold flex-1" style={{ color: "#067647" }}>
                              {linksAprovadosCount} link{linksAprovadosCount === 1 ? "" : "s"} aprovado{linksAprovadosCount === 1 ? "" : "s"} nesta sessão
                            </span>
                            <ChevronDown size={14} style={{ color: "#067647" }} className="transition group-open:rotate-180" />
                          </summary>
                          <ul className="px-3.5 pb-3 pt-1 space-y-1">
                            {Array.from(linksIgnoradosSet).map((url) => (
                              <li key={url} className="text-[12px] truncate" style={{ color: "#0F4C31" }} title={url}>✓ {url}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </>
                  )}


                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => verificarLinksM.mutate({ forcar: true })}
                      disabled={verificarLinksM.isPending}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg disabled:opacity-40"
                      style={{ background: T.card, border: `1px solid ${T.line}`, color: T.ink }}
                    >
                      {verificarLinksM.isPending ? <Loader2 size={13} className="animate-spin" /> : <>🔄</>}
                      Verificar novamente
                    </button>
                  </div>
                </section>
              </div>
            )}

            {envioFase === "revisao" && (() => {
              const bloqueios = checks.filter((c) => c.sev === "bloqueia");
              const avisos = checks.filter((c) => c.sev === "aviso");
              const oks = checks.filter((c) => c.sev === "ok");
              const jaExiste = !!edicao.wordpress_post_id;
              const wpUrl = edicao.wordpress_post_url ?? null;
              return (
                <div className="px-6 sm:px-8 py-5 space-y-4">
                  {/* Barra compacta de resumo dos checks */}
                  <div className="flex flex-wrap items-center gap-2">
                    {bloqueios.length > 0 && (
                      <details className="rounded-lg" style={{ background: T.dangerSoft, border: `1px solid ${T.dangerAccent}33` }}>
                        <summary className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer list-none text-[12px] font-bold" style={{ color: T.danger }}>
                          <XCircle size={13} /> {bloqueios.length} bloqueio{bloqueios.length === 1 ? "" : "s"}
                          <ChevronDown size={12} />
                        </summary>
                        <ul className="px-3 pb-2 pt-1 space-y-1">
                          {bloqueios.map((c) => (<li key={c.id} className="text-[12.5px]" style={{ color: T.danger }}>· {c.texto}</li>))}
                        </ul>
                      </details>
                    )}
                    {avisos.length > 0 && (
                      <details className="rounded-lg" style={{ background: T.warnSoft, border: `1px solid ${T.warn}33` }}>
                        <summary className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer list-none text-[12px] font-bold" style={{ color: T.warn }}>
                          <AlertTriangle size={13} /> {avisos.length} aviso{avisos.length === 1 ? "" : "s"}
                          <ChevronDown size={12} />
                        </summary>
                        <ul className="px-3 pb-2 pt-1 space-y-1">
                          {avisos.map((c) => (<li key={c.id} className="text-[12.5px]" style={{ color: T.ink }}>· {c.texto}</li>))}
                        </ul>
                      </details>
                    )}
                    {oks.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: "#ECFDF3", border: "1px solid #ABEFC6", color: "#067647" }}>
                        <CheckCircle2 size={13} /> {oks.length} verificações ok
                      </span>
                    )}
                    {linksAprovadosCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: "#ECFDF3", border: "1px solid #ABEFC6", color: "#067647" }}>
                        ✓ {linksAprovadosCount} link{linksAprovadosCount === 1 ? "" : "s"} aprovado{linksAprovadosCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* Dois canais lado a lado */}
                  <div className="grid gap-4 lg:grid-cols-2">

                    {/* ─── CANAL 1 · EMAIL (E-goi) ─── */}
                    <section className="rounded-2xl overflow-hidden flex flex-col"
                      style={{ background: "#fff", border: `1px solid ${T.line}`, boxShadow: "0 2px 10px -6px rgba(15,23,42,0.10)" }}>
                      <div style={{ height: 4, backgroundImage: "linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899)" }} />
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center justify-center rounded-lg shrink-0"
                            style={{ width: 36, height: 36, background: `${T.primary}18`, color: T.primary }}>
                            <Mail size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.primary }}>Canal 1</p>
                            <h3 className="font-display font-bold text-[16px] leading-tight" style={{ color: T.ink }}>Email · E-goi</h3>
                          </div>
                        </div>

                        {renderListasBloco()}

                        <button
                          type="button"
                          onClick={() => rascunhoM.mutate()}
                          disabled={enviarM.isPending || !podeAvancar}
                          title={!podeAvancar ? "Escolhe uma lista e resolve bloqueios primeiro." : "Cria ou actualiza a campanha em rascunho na E-goi (não envia)."}
                          className="inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold rounded-lg disabled:opacity-40"
                          style={{ height: 36, background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}>
                          {rascunhoM.isPending
                            ? <><Loader2 size={13} className="animate-spin" /> A criar…</>
                            : <>📝 Só criar rascunho</>}
                        </button>
                      </div>
                    </section>

                    {/* ─── CANAL 2 · SITE (WordPress) ─── */}
                    <section className="rounded-2xl overflow-hidden flex flex-col"
                      style={{ background: "#fff", border: `1px solid ${T.line}`, boxShadow: "0 2px 10px -6px rgba(15,23,42,0.10)" }}>
                      <div style={{ height: 4, background: "linear-gradient(90deg,#0EA5A4,#14B8A6,#22D3EE)" }} />
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center justify-center rounded-lg shrink-0"
                            style={{ width: 36, height: 36, background: "#0EA5A418", color: "#0EA5A4" }}>
                            <Globe size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#0EA5A4" }}>Canal 2</p>
                            <h3 className="font-display font-bold text-[16px] leading-tight" style={{ color: T.ink }}>Site · WordPress</h3>
                          </div>
                        </div>

                        <div className="rounded-lg px-3 py-2.5 flex-1" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
                          <p className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: T.ink }}>
                            {jaExiste ? <><CheckCircle2 size={13} style={{ color: "#067647" }} /> Página publicada</> : "Ainda por publicar"}
                          </p>
                          {wpUrl && (
                            <a href={wpUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11.5px] font-semibold mt-1 hover:underline"
                              style={{ color: T.primary }}>
                              Abrir página ↗
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => publicarWpM.mutate()}
                          disabled={publicarWpM.isPending || temBloqueio}
                          title={temBloqueio ? "Resolve os bloqueios antes de escrever no site." : undefined}
                          className="inline-flex items-center justify-center gap-2 text-[12.5px] font-semibold rounded-lg disabled:opacity-40"
                          style={{ height: 36, background: "#0EA5A415", color: "#0EA5A4", border: "1.5px solid #0EA5A455" }}>
                          {publicarWpM.isPending
                            ? <><Loader2 size={13} className="animate-spin" /> A escrever…</>
                            : jaExiste ? <>🔄 Actualizar página</> : <>📝 Escrever página</>}
                        </button>
                      </div>
                    </section>
                  </div>


                  {temBloqueio && (
                    <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                      <XCircle size={14} /> Resolve os bloqueios antes de continuar.
                    </p>
                  )}
                  {enviarM.isPending && !isReal && (
                    <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.primarySoft, color: T.primary }}>
                      <Loader2 size={14} className="animate-spin" /> A gerar HTML e a comunicar com a E-goi.
                    </p>
                  )}
                  {envioErro && !enviarM.isPending && (
                    <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                      <XCircle size={14} /> Última operação falhou · {envioErro}.
                    </p>
                  )}
                </div>
              );
            })()}

            {isReal && envioFase === "confirmacao" && (
              <div className="px-6 sm:px-8 py-6 space-y-6">
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: T.muted }}>Resumo</p>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.line}` }}>
                    {([
                      ["Assunto", assunto],
                      ["Newsletter", `${naNews.length} notícias · ${destaques.length}/3 destaques`],
                      ["Página WordPress", edicao.wordpress_post_id ? "Publicada ✓" : "Ainda por publicar"],
                      ["Podcast", edicao.episodio ? (edicao.episodio.codigo ?? edicao.episodio.titulo.slice(0, 40)) : "—"],
                      ["Destino", listasEscolhidas.map((l) => l.nome).join(", ")],
                    ] as const).map(([label, valor], idx) => (
                      <div key={label} className="flex items-baseline gap-4 px-4 py-3"
                        style={{ background: idx % 2 === 0 ? T.shell : T.card, borderTop: idx === 0 ? "none" : `1px solid ${T.line}` }}>
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] shrink-0" style={{ color: T.muted, width: 120 }}>{label}</span>
                        <span className={`text-[15px] font-semibold ${label === "Destino" ? "" : ""}`}
                          style={{ color: label === "Destino" ? T.danger : T.ink }}>{valor || "—"}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl px-4 py-4" style={{ background: T.warnSoft, border: `1px solid ${T.warn}33` }}>
                  <p className="text-[13px] font-bold mb-1" style={{ color: T.warn }}>
                    Modo real · escreve o número da edição para desbloquear as acções.
                  </p>
                  <label className="block text-[12px] font-semibold mt-3 mb-1.5" style={{ color: T.ink }}>
                    Escreve o número <strong>{edicao.numero}</strong> para confirmar
                  </label>
                  <input value={confirmNumero} onChange={(e) => setConfirmNumero(e.target.value)}
                    disabled={enviarM.isPending} inputMode="numeric" autoComplete="off"
                    placeholder={String(edicao.numero)}
                    className="w-full font-mono rounded-lg px-4 disabled:opacity-50 focus:outline-none"
                    style={{
                      border: `2px solid ${numOk ? "#10B981" : T.warn}`,
                      background: "#fff",
                      color: T.ink,
                      height: 48,
                      fontSize: 18,
                    }} />
                </section>

                {/* ─── Agendar envio ─── */}
                <section className="rounded-xl px-4 py-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                  <p className="text-[13px] font-bold mb-1 flex items-center gap-2" style={{ color: T.ink }}>
                    ⏰ Agendar em vez de enviar já
                  </p>
                  <p className="text-[12.5px] mb-3" style={{ color: T.muted }}>
                    Deixa tudo pronto e escolhe o dia e a hora. O servidor trata do envio sozinho, mesmo com o computador desligado.
                  </p>

                  {edicao.agendamento_estado === "agendado" && edicao.agendado_para ? (
                    <div className="rounded-lg px-3 py-3 flex flex-wrap items-center gap-3" style={{ background: T.primarySoft, border: `1px solid ${T.primary}44` }}>
                      <span className="text-[13px] font-semibold" style={{ color: T.primary }}>
                        Agendada para {new Date(edicao.agendado_para).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}
                        {edicao.agendado_por ? ` · por ${edicao.agendado_por}` : ""}
                      </span>
                      <button type="button" onClick={() => cancelarAgendamentoM.mutate()} disabled={cancelarAgendamentoM.isPending}
                        className="text-[12.5px] font-semibold rounded-lg px-3 disabled:opacity-40"
                        style={{ height: 34, background: T.dangerSoft, color: T.danger, border: `1px solid ${T.dangerAccent}44` }}>
                        {cancelarAgendamentoM.isPending ? "A cancelar…" : "Cancelar agendamento"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <label className="flex-1 min-w-0">
                        <span className="block text-[12px] font-semibold mb-1.5" style={{ color: T.ink }}>Data e hora</span>
                        <input type="datetime-local" value={agendarQuando} onChange={(e) => setAgendarQuando(e.target.value)}
                          disabled={agendarM.isPending}
                          className="w-full rounded-lg px-3 focus:outline-none disabled:opacity-50"
                          style={{ height: 44, border: `1.5px solid ${T.line}`, background: "#fff", color: T.ink, fontSize: 15 }} />
                      </label>
                      <label className="flex items-center gap-2 text-[12.5px] font-semibold shrink-0" style={{ color: T.ink, height: 44 }}>
                        <input type="checkbox" checked={agendarWp} onChange={(e) => setAgendarWp(e.target.checked)} />
                        Publicar também no site
                      </label>
                      <button type="button" onClick={() => agendarM.mutate()}
                        disabled={agendarM.isPending || !numOk || !agendarQuando || listasEscolhidas.length === 0}
                        title={!numOk ? "Escreve o número da edição para confirmar" : undefined}
                        className="inline-flex items-center justify-center gap-2 text-[13.5px] font-semibold rounded-lg shrink-0 disabled:opacity-40"
                        style={{ height: 44, padding: "0 18px", background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}>
                        {agendarM.isPending ? <><Loader2 size={14} className="animate-spin" /> A agendar…</> : <>⏰ Agendar envio</>}
                      </button>
                    </div>
                  )}
                </section>



                {enviarM.isPending && (
                  <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.primarySoft, color: T.primary }}>
                    <Loader2 size={14} className="animate-spin" /> A comunicar com a E-goi · a edição fica bloqueada durante a operação.
                  </p>
                )}
                {envioErro && !enviarM.isPending && (
                  <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                    <XCircle size={14} /> Operação falhou · {envioErro}. A edição continua em rascunho.
                  </p>
                )}
              </div>
            )}

            {envioFase === "resultado" && (() => {
              const falhou = bundlePassos.some((p) => p.estado === "erro");
              const tudoOk = bundlePassos.length > 0 && bundlePassos.every((p) => p.estado === "ok");
              return (
                <div className="px-6 sm:px-8 py-8 space-y-5">
                  <section className="rounded-2xl px-5 py-6 text-center"
                    style={{
                      background: bundleACorrer ? T.primarySoft : tudoOk ? "#ECFDF3" : T.dangerSoft,
                      border: `2px solid ${bundleACorrer ? `${T.primary}44` : tudoOk ? "#12B76A55" : `${T.dangerAccent}55`}`,
                    }}>
                    {bundleACorrer
                      ? <Loader2 size={34} className="mx-auto mb-3 animate-spin" style={{ color: T.primary }} />
                      : tudoOk
                        ? <CheckCircle2 size={34} className="mx-auto mb-3" style={{ color: "#067647" }} />
                        : <AlertTriangle size={34} className="mx-auto mb-3" style={{ color: T.danger }} />}
                    <p className="text-[18px] font-bold mb-1" style={{ color: bundleACorrer ? T.primary : tudoOk ? "#067647" : T.danger }}>
                      {bundleACorrer ? "A publicar tudo…" : tudoOk ? "Publicado com sucesso" : "Publicação incompleta"}
                    </p>
                    <p className="text-[14px]" style={{ color: T.ink }}>
                      {bundleACorrer
                        ? "Página no site, rascunho na E-goi e email de teste — por esta ordem."
                        : tudoOk
                          ? "A página está no site e o email de teste seguiu para as listas de teste. Nada foi enviado a subscritores reais."
                          : "Alguns passos correram bem e outros não. Vê o detalhe em baixo."}
                    </p>
                  </section>

                  <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                    <div className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide" style={{ background: T.bg, color: T.muted, borderBottom: `1px solid ${T.line}` }}>
                      O que aconteceu
                    </div>
                    <ul className="divide-y" style={{ borderColor: T.line }}>
                      {bundlePassos.map((p) => {
                        const cor = p.estado === "ok" ? "#067647" : p.estado === "erro" ? T.danger : p.estado === "a_correr" ? T.primary : T.faint;
                        const bg = p.estado === "ok" ? "#ECFDF3" : p.estado === "erro" ? T.dangerSoft : p.estado === "a_correr" ? T.primarySoft : T.bg;
                        const icone = p.estado === "ok" ? <CheckCircle2 size={16} />
                          : p.estado === "erro" ? <XCircle size={16} />
                          : p.estado === "a_correr" ? <Loader2 size={16} className="animate-spin" />
                          : <span className="inline-block w-2 h-2 rounded-full" style={{ background: T.faint }} />;
                        return (
                          <li key={p.id} className="flex items-start gap-3 px-4 py-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0" style={{ background: bg, color: cor }}>
                              {icone}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[14px] font-semibold break-words" style={{ color: T.ink }}>{p.rotulo}</span>
                              {p.detalhe && (
                                <span className="block text-[12.5px] mt-0.5 break-words" style={{ color: p.estado === "erro" ? T.danger : T.muted }}>{p.detalhe}</span>
                              )}
                              {p.url && (
                                <a href={p.url} target="_blank" rel="noreferrer"
                                  className="inline-block text-[12.5px] font-semibold mt-1" style={{ color: T.primary }}>
                                  Abrir página ↗
                                </a>
                              )}
                            </span>
                            <span className="text-[12px] font-semibold shrink-0" style={{ color: cor }}>
                              {p.estado === "ok" ? "Feito" : p.estado === "erro" ? "Falhou" : p.estado === "a_correr" ? "A correr…" : "Em espera"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {!bundleACorrer && (
                    <p className="text-[12.5px]" style={{ color: T.muted }}>
                      O envio real para subscritores continua por fazer — usa «Só email» na revisão quando estiveres pronto.
                    </p>
                  )}
                </div>
              );
            })()}



            {envioFase === "confirmar-disparo" && (
              <div className="px-6 sm:px-8 py-8 space-y-5">
                <section className="rounded-2xl px-5 py-6 text-center" style={{ background: T.dangerSoft, border: `2px solid ${T.dangerAccent}55` }}>
                  <AlertTriangle size={36} className="mx-auto mb-3" style={{ color: T.danger }} />
                  <p className="text-[18px] font-bold mb-2" style={{ color: T.danger }}>
                    Tens a certeza? Isto envia já.
                  </p>
                  <p className="text-[14px]" style={{ color: T.ink }}>
                    A campanha vai ser criada na E-goi e disparada imediatamente para
                    <strong> {listasEscolhidas.map((l) => l.nome).join(", ") || "—"}</strong>. Não há forma de reverter.
                  </p>
                </section>

                {(enviarM.isPending || progressoDisparo.length > 0) && (
                  <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                    {(() => {
                      const total = progressoDisparo.length || 1;
                      const feitas = progressoDisparo.filter((p) => p.estado === "ok" || p.estado === "erro").length;
                      const pct = Math.round((feitas / total) * 100);
                      return (
                        <div className="px-4 py-2.5" style={{ background: T.bg, borderBottom: `1px solid ${T.line}` }}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: T.muted }}>
                              Progresso do envio
                            </span>
                            <span className="text-[12px] font-semibold" style={{ color: T.ink }}>{feitas} de {total} · {pct}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: T.line }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: T.primary }} />
                          </div>
                        </div>
                      );
                    })()}
                    <ul className="divide-y" style={{ borderColor: T.line }}>
                      {progressoDisparo.map((p) => {
                        const activo = p.estado === "a_enviar" || p.estado === "a_preparar";
                        const cor = p.estado === "ok" ? "#067647" : p.estado === "erro" ? T.danger : activo ? T.primary : T.faint;
                        const bg = p.estado === "ok" ? "#ECFDF3" : p.estado === "erro" ? T.dangerSoft : activo ? T.primarySoft : T.bg;
                        const icone = p.estado === "ok" ? <CheckCircle2 size={16} />
                          : p.estado === "erro" ? <XCircle size={16} />
                          : activo ? <Loader2 size={16} className="animate-spin" />
                          : <span className="inline-block w-2 h-2 rounded-full" style={{ background: T.faint }} />;
                        const rotulo = p.estado === "ok" ? "Enviada"
                          : p.estado === "erro" ? (p.erro ?? "Falha")
                          : p.estado === "a_enviar" ? "A enviar…"
                          : p.estado === "a_preparar" ? "A preparar campanha…"
                          : esperaSeg != null ? `Em espera · ${esperaSeg}s` : "Em espera";
                        const podeRepetir = p.estado === "erro" && !enviarM.isPending && !repetirListaM.isPending;
                        return (
                          <li key={p.lista_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0" style={{ background: bg, color: cor }}>
                              {icone}
                            </span>
                            <span className="flex-1 min-w-0 text-[14px] font-semibold truncate" style={{ color: T.ink }}>{p.lista_nome}</span>
                            <span className="text-[12px] font-semibold shrink-0 text-right sm:max-w-[45%]" style={{ color: cor }}>{rotulo}</span>
                            {p.estado === "erro" && (
                              <button
                                type="button"
                                onClick={() => repetirListaM.mutate(p.lista_id)}
                                disabled={!podeRepetir}
                                className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold min-h-[40px] disabled:opacity-50"
                                style={{ background: T.primarySoft, color: T.primary, border: `1px solid ${T.line}` }}
                              >
                                {repetirListaM.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Repetir esta lista
                              </button>
                            )}
                          </li>

                        );
                      })}
                    </ul>
                    {enviarM.isPending && (
                      <div className="px-4 py-2 text-[12px]" style={{ color: T.muted, background: T.bg, borderTop: `1px solid ${T.line}` }}>
                        {esperaSeg != null
                          ? `Pausa de segurança · próxima lista em ${esperaSeg}s`
                          : "Campanhas preparadas primeiro; disparo sequencial com 15s entre listas."}
                      </div>
                    )}
                  </div>
                )}
                {envioErro && !enviarM.isPending && (
                  <p className="text-[13px] font-semibold flex items-center gap-2 px-3.5 py-2.5 rounded-lg" style={{ background: T.dangerSoft, color: T.danger }}>
                    <XCircle size={14} /> Disparo falhou · {envioErro}.
                  </p>
                )}
              </div>
            )}
          </div>


          {/* ── RODAPÉ ── */}
          <footer className="shrink-0 px-6 sm:px-8 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ background: T.card, borderTop: `1px solid ${T.line}` }}>
            {envioFase === "resultado" ? (
              <button
                onClick={() => setEnvioFase("revisao")}
                disabled={bundleACorrer}
                className="text-[14px] font-medium rounded-lg disabled:opacity-50 w-full sm:w-auto"
                style={{ color: T.muted, height: 48, padding: "0 20px" }}>
                ← Voltar à revisão
              </button>
            ) : (envioFase === "confirmacao" || envioFase === "confirmar-disparo") ? (
              <button
                onClick={() => setEnvioFase(envioFase === "confirmar-disparo" ? (isReal ? "confirmacao" : "revisao") : "revisao")}
                disabled={enviarM.isPending}
                className="text-[14px] font-medium rounded-lg disabled:opacity-50 w-full sm:w-auto"
                style={{ color: T.muted, height: 48, padding: "0 20px" }}>
                ← Voltar
              </button>
            ) : (
              <button onClick={() => { setModal(null); resetEnvioModal(); }} disabled={enviarM.isPending}
                className="text-[14px] font-medium rounded-lg disabled:opacity-50 w-full sm:w-auto"
                style={{ color: T.muted, height: 48, padding: "0 20px" }}>
                Cancelar
              </button>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center">
              {envioFase === "checklist" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (itensEmFalta.length > 0) {
                      try {
                        await supabase.from("nl_audit_log").insert({
                          quem: nomeExibicao,
                          accao: "aprovar_com_pendentes",
                          detalhe: `Fase 1 aprovada com ${itensEmFalta.length} pendentes: ${itensEmFalta.map(i => i.rotulo).join(", ")}`,
                        });
                      } catch { /* noop */ }
                    }
                    setEnvioFase("verificar-links");
                  }}
                  className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-lg w-full sm:w-auto"
                  style={{ height: 48, padding: "0 20px", background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}
                >
                  {itensEmFalta.length > 0 ? "Aprovar mesmo assim →" : "Continuar →"}
                </button>
              )}
              {envioFase === "verificar-links" && (
                <button
                  type="button"
                  onClick={() => setEnvioFase("revisao")}
                  disabled={verificarLinksM.isPending || (!!linksResumo && linksResumo.quebrado > 0)}
                  title={
                    verificarLinksM.isPending ? "A verificar…" :
                    linksResumo && linksResumo.quebrado > 0 ? "Resolve os quebrados primeiro" :
                    linksResumo && linksResumo.suspeito > 0 ? "Continuar mesmo com suspeitos" :
                    "Continuar para revisão"
                  }
                  className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-lg w-full sm:w-auto disabled:opacity-40"
                  style={{ height: 48, padding: "0 20px", background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}
                >
                  Continuar →
                </button>
              )}
              {/* Fase revisão · 3 acções distintas: só site, só email, publicar tudo. */}
              {envioFase === "revisao" && (<>
                <button
                  type="button"
                  onClick={() => publicarWpM.mutate()}
                  disabled={publicarWpM.isPending || enviarM.isPending || temBloqueio}
                  title={temBloqueio ? "Resolve os bloqueios primeiro" : "Escreve/actualiza apenas a página no WordPress. Não toca no email."}
                  className="inline-flex items-center justify-center gap-2 text-[13.5px] font-semibold rounded-lg w-full sm:w-auto disabled:opacity-40"
                  style={{ height: 48, padding: "0 16px", background: "#0EA5A415", color: "#0EA5A4", border: "1.5px solid #0EA5A455" }}>
                  {publicarWpM.isPending
                    ? <><Loader2 size={14} className="animate-spin" /> A escrever…</>
                    : <><Globe size={14} /> Só site</>}
                </button>

                <button
                  type="button"
                  onClick={() => { if (isReal) { void registarAudit(nomeExibicao, `Passou revisão · edição #${edicao.numero}`); setEnvioFase("confirmacao"); } else { setEnvioFase("confirmar-disparo"); } }}
                  disabled={enviarM.isPending || !podeAvancar}
                  title={bloqueioCurador ? "Precisas de um admin" : temBloqueio ? "Resolve os bloqueios primeiro" : listasEscolhidas.length === 0 ? "Escolhe pelo menos uma lista" : "Envia só o email, não toca no WordPress."}
                  className="inline-flex items-center justify-center gap-2 text-[13.5px] font-semibold rounded-lg w-full sm:w-auto disabled:opacity-40"
                  style={{ height: 48, padding: "0 16px", background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}>
                  <Mail size={14} /> {isReal ? "Só email" : "Só email (teste)"}
                </button>

                <button
                  type="button"
                  onClick={handlePublicarTudo}
                  disabled={bundlePending || enviarM.isPending || !podeAvancar}
                  title={bloqueioCurador ? "Precisas de um admin" : temBloqueio ? "Resolve os bloqueios primeiro" : listasEscolhidas.length === 0 ? "Escolhe pelo menos uma lista" : isReal ? "Escreve a página no site E prepara o envio do email." : "Página no site + rascunho na E-goi + email de teste."}
                  className="inline-flex items-center justify-center gap-2 text-[15px] font-bold rounded-lg text-white disabled:opacity-40 w-full sm:w-auto"
                  style={{ backgroundImage: GRAD_MARCA, height: 48, padding: "0 22px", boxShadow: "0 6px 20px -8px rgba(139,92,246,0.55)" }}>
                  {bundlePending
                    ? <><Loader2 size={15} className="animate-spin" /> A publicar…</>
                    : <>🚀 {isReal ? "Publicar tudo" : "Publicar tudo (teste)"}</>}
                </button>
              </>)}

              {envioFase === "resultado" && (
                <button
                  type="button"
                  onClick={() => { setModal(null); resetEnvioModal(); }}
                  disabled={bundleACorrer}
                  className="inline-flex items-center justify-center gap-2 text-[15px] font-bold rounded-lg text-white disabled:opacity-40 w-full sm:w-auto"
                  style={{ backgroundImage: GRAD_MARCA, height: 48, padding: "0 22px" }}>
                  Fechar
                </button>
              )}

              {/* Passo confirmação (modo real, número escrito): actualizar rascunho ou avançar para disparo */}
              {envioFase === "confirmacao" && (<>
                <button
                  type="button"
                  onClick={() => rascunhoM.mutate()}
                  disabled={enviarM.isPending || !numOk}
                  className="inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-lg w-full sm:w-auto disabled:opacity-40"
                  style={{ height: 48, padding: "0 16px", background: T.primarySoft, color: T.primary, border: `1.5px solid ${T.primary}55` }}>
                  {rascunhoM.isPending ? <><Loader2 size={16} className="animate-spin" /> A criar…</> : <>📝 Actualizar rascunho E-goi</>}
                </button>
                <button
                  type="button"
                  onClick={() => setEnvioFase("confirmar-disparo")}
                  disabled={enviarM.isPending || !numOk}
                  className="inline-flex items-center justify-center gap-2 text-[15px] font-bold rounded-lg text-white disabled:opacity-40 w-full sm:w-auto"
                  style={{ backgroundImage: GRAD_MARCA, height: 48, padding: "0 22px", boxShadow: "0 6px 20px -8px rgba(139,92,246,0.55)" }}>
                  🚀 Envio final
                </button>
              </>)}

              {/* Passo confirmar-disparo: confirmação extra */}
              {envioFase === "confirmar-disparo" && (
                <button
                  type="button"
                  onClick={() => disparoM.mutate()}
                  disabled={enviarM.isPending}
                  className="inline-flex items-center justify-center gap-2 text-[15px] font-bold rounded-lg text-white disabled:opacity-40 w-full sm:w-auto"
                  style={{ background: "#DC2626", height: 48, padding: "0 24px", boxShadow: "0 6px 20px -8px rgba(220,38,38,0.45)" }}>
                  {enviarM.isPending ? <><Loader2 size={16} className="animate-spin" /> A enviar…</> : <><Send size={16} /> Sim, enviar agora</>}
                </button>
              )}
            </div>
          </footer>

        </Modal>
        );
      })()}




      {modal === "adicionar" && (
        <AdicionarNoticias
          edicaoId={edicaoId}
          isAdmin={isAdmin}
          nomeExibicao={nomeExibicao}
          notify={notify}
          onFechar={() => setModal(null)}
          onNovosPendentes={(ids) => setNovosPendentesIds(new Set(ids))}
          onVerPendentes={() => pendentesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}




      {modal === "html" && (() => {
        const listaTeste = (listasEgoiQ.data ?? []).find((l) => l.tipo === "teste" && l.activa);
        const podeInteragir = htmlReal.estado === "ok" && !!htmlReal.html;
        const testeDesactivado = !podeInteragir || bloqueado || !listaTeste || testeM.isPending;
        const testeTitulo = bloqueado
          ? "Edição enviada — envio de teste bloqueado"
          : !listaTeste
            ? "Cria uma lista de teste em Definições → E-goi"
            : "Enviar para a lista de teste";
        return (
          <Modal wide chromeless onClose={() => setModal(null)}>
            <div className="flex flex-col max-h-[92vh]">
              {/* Cabeçalho */}
              <header className="px-6 pt-5 pb-4 shrink-0" style={{ borderBottom: `1px solid ${T.line}`, background: T.shell }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg" style={{ color: T.ink }}>HTML real · Edição #{edicao.numero}</h3>
                    <p className="text-[12px] mt-1" style={{ color: T.muted }}>
                      Construído a partir do estado actual da edição. É este o HTML que sai no envio.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]" style={{ color: T.faint }}>
                      <span><strong style={{ color: T.muted }}>{aprovadas.length}</strong> notícias</span>
                      <span>·</span>
                      <span><strong style={{ color: T.muted }}>{seccoesActivas.length}</strong> secções activas</span>
                      {assunto?.trim() && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[380px]">Assunto: <em style={{ color: T.muted }}>«{assunto.trim()}»</em></span>
                        </>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => setModal(null)} className="p-1 rounded-md shrink-0" style={{ color: T.muted }} aria-label="Fechar">
                    <X size={18} />
                  </button>
                </div>
              </header>

              {/* Corpo — iframe com moldura de email */}
              <div className="flex-1 overflow-y-auto" style={{ background: "#EEEEF1" }}>
                {htmlReal.estado === "load" && (
                  <div className="flex items-center justify-center gap-2 py-24" style={{ color: T.muted }}>
                    <Loader2 size={16} className="animate-spin" /> A gerar HTML…
                  </div>
                )}
                {htmlReal.estado === "erro" && (
                  <div className="m-6 px-4 py-4 rounded-lg text-sm" style={{ background: T.dangerSoft, color: T.danger }}>
                    ✕ Não consegui obter o HTML real · {htmlReal.erro}
                    <button type="button" onClick={abrirHtmlReal} className="ml-3 underline font-semibold">Tentar de novo</button>
                  </div>
                )}
                {htmlReal.estado === "ok" && htmlReal.html && (
                  <div className="p-4 sm:p-6 flex justify-center">
                    <iframe title="HTML real da newsletter" srcDoc={htmlReal.html}
                      sandbox="allow-same-origin"
                      className="w-full rounded-lg bg-white"
                      style={{ maxWidth: 720, height: "68vh", border: `1px solid ${T.line}`, boxShadow: "0 4px 20px rgba(16,24,40,0.08)" }} />
                  </div>
                )}
              </div>

              {/* Rodapé sticky com acções */}
              <footer className="px-6 py-3.5 shrink-0 flex items-center gap-2 flex-wrap"
                style={{ borderTop: `1px solid ${T.line}`, background: T.shell }}>
                {htmlFeedback && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-md"
                    style={{
                      background: htmlFeedback.tipo === "ok" ? `${T.ok}14` : T.dangerSoft,
                      color: htmlFeedback.tipo === "ok" ? T.ok : T.danger,
                    }}>
                    {htmlFeedback.tipo === "ok" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {htmlFeedback.texto}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={copiarHtml} disabled={!podeInteragir}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[13px] font-semibold disabled:opacity-40"
                    style={{ background: "#FFFFFF", color: T.ink, border: `1px solid ${T.line}` }}
                    title="Copiar HTML para a área de transferência">
                    <Copy size={14} /> Copiar
                  </button>
                  <button type="button" onClick={enviarTesteDoModal} disabled={testeDesactivado}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg text-[13px] font-semibold disabled:opacity-40"
                    style={{ background: T.primarySoft, color: T.primary, border: `1px solid ${T.primary}33` }}
                    title={testeTitulo}>
                    {testeM.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {testeM.isPending ? "A enviar…" : "Enviar teste"}
                  </button>
                  <button type="button" onClick={descarregarHtml} disabled={!podeInteragir}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-bold text-white disabled:opacity-40"
                    style={{ background: T.primary, boxShadow: "0 2px 8px rgba(99,102,241,0.28)" }}
                    title="Descarregar .html (⌘/Ctrl + S)">
                    <Download size={14} /> Descarregar .html
                    <span className="hidden sm:inline text-[10px] font-medium opacity-75 ml-1">⌘S</span>
                  </button>
                </div>
              </footer>
            </div>
          </Modal>
        );
      })()}


      {modal === "fontes" && (
        <Fontes isAdmin={isAdmin} nomeExibicao={nomeExibicao} notify={notify} onFechar={() => setModal(null)} />
      )}



      {modal === "limpar-antigas" && (
        <Modal onClose={() => { if (!limparAntigas.isPending) setModal(null); }} titulo="Limpar pendentes antigas">
          <p className="text-sm mb-3" style={{ color: T.ink }}>
            Vais marcar como <strong>rejeitadas</strong> todas as notícias pendentes com mais de <strong>14 dias</strong>. Nada é apagado da base de dados; podem sempre ser devolvidas depois.
          </p>
          <p className="text-sm mb-4" style={{ color: T.muted }}>
            Notícias afectadas: <strong style={{ color: T.ink }}>{antigasCount}</strong>
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} disabled={limparAntigas.isPending}
              className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              style={{ background: "#F2F4F7", color: T.ink }}>
              Cancelar
            </button>
            <button onClick={() => limparAntigas.mutate()} disabled={limparAntigas.isPending || antigasCount === 0}
              className="text-sm font-bold px-4 py-2 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: T.warn }}>
              {limparAntigas.isPending && <Loader2 size={14} className="animate-spin" />}
              Rejeitar {antigasCount}
            </button>
          </div>
        </Modal>
      )}



      {seccaoModal && (
        <SeccaoModal
          modo={seccaoModal.modo}
          inicial={seccaoModal.modo === "editar" ? seccaoModal.seccao : null}
          aGuardar={criarPersonalizada.isPending || guardarPersonalizada.isPending}
          onFechar={() => setSeccaoModal(null)}
          onGuardar={(campos) => {
            if (seccaoModal.modo === "editar") {
              guardarPersonalizada.mutate({ id: seccaoModal.seccao.id, campos });
            } else {
              criarPersonalizada.mutate(campos);
            }
          }}
        />
      )}


      {erroModal && (
        <Modal titulo="" onClose={() => setErroModal(null)} size="lg" chromeless>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${T.danger}15`, color: T.danger }}>
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg" style={{ color: T.ink }}>{erroModal.titulo}</h3>
                <p className="text-sm mt-1 leading-relaxed break-words" style={{ color: T.muted }}>
                  {erroModal.mensagem}
                </p>
              </div>
              <button type="button" onClick={() => setErroModal(null)} className="p-1 rounded-md shrink-0"
                style={{ color: T.muted }} aria-label="Fechar"><X size={18} /></button>
            </div>
            {erroModal.detalhe && erroModal.detalhe !== erroModal.mensagem && (
              <details className="rounded-lg" style={{ background: "#F9FAFB", border: `1px solid ${T.line}` }}>
                <summary className="cursor-pointer text-[12px] font-semibold px-3 py-2 select-none"
                  style={{ color: T.muted }}>Ver detalhe técnico</summary>
                <pre className="text-[11.5px] leading-relaxed px-3 pb-3 whitespace-pre-wrap break-all max-h-64 overflow-auto"
                  style={{ color: T.ink, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{erroModal.detalhe}</pre>
              </details>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              {erroModal.detalhe && (
                <button type="button"
                  onClick={() => { void navigator.clipboard.writeText(erroModal.detalhe ?? erroModal.mensagem); notify("Detalhe copiado"); }}
                  className="h-9 px-3 rounded-md text-[13px] font-semibold"
                  style={{ background: "#F2F4F7", color: T.ink, border: `1px solid ${T.line}` }}>
                  Copiar detalhe
                </button>
              )}
              <button type="button" onClick={() => setErroModal(null)}
                className="h-9 px-4 rounded-md text-[13px] font-semibold text-white"
                style={{ background: T.ink }}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && (() => {
        const erro = toastMeta?.tipo === "erro";
        const cor = erro ? T.danger : T.ok;
        return (
          <div
            className="fixed z-50 left-1/2 -translate-x-1/2 top-4 sm:top-auto sm:bottom-5 w-[calc(100vw-1.5rem)] max-w-[26rem] sm:w-auto flex items-center gap-2.5 text-[15px] sm:text-sm font-semibold px-4 py-3 sm:py-2.5 rounded-xl shadow-2xl anim-rise"
            role="status" aria-live="polite"
            style={{ background: T.card, color: T.ink, border: `1px solid ${cor}`, boxShadow: `0 12px 32px -12px ${cor}55` }}>
            {erro ? <AlertTriangle size={18} style={{ color: cor }} /> : <CheckCircle2 size={18} style={{ color: cor }} />}
            <span className="flex-1 leading-snug">{toast}</span>
            {toastMeta?.accao && (
              <button onClick={() => { toastMeta.accao?.fn(); setToast(null); setToastMeta(null); }}
                className="shrink-0 h-9 px-3 rounded-lg text-[14px] font-bold"
                style={{ background: T.primarySoft, color: T.primary }}>
                {toastMeta.accao.rotulo}
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
