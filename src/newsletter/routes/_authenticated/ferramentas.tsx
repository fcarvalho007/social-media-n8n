import { createFileRoute } from "@/newsletter/shim/router";
import { useServerFn } from "@/newsletter/shim/start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Wrench, Loader2, ExternalLink, Copy, Check, X, Archive, Mail, Trash2,
  RefreshCw, Plus, Settings2, Play, Power, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  listarFerramentas, actualizarEstadoFerramenta, apagarFerramenta,
  aprovarFerramentaParaRascunho, rejeitarFerramentaComBan, listarEdicoesDestinoFerramenta,
  type FerramentaSugerida, type FiltroEstadoFerramenta,
} from "@/newsletter/lib/ferramentas.functions";
import {
  listarFontesDirectorios, criarFonteDirectorio, actualizarFonteDirectorio,
  apagarFonteDirectorio, correrCuradoriaFerramentasAgora, alternarDirectoriosEmLote,
  type FonteDirectorio,
} from "@/newsletter/lib/curadoria-ferramentas.functions";
import { useSessao } from "@/newsletter/features/newsletter/useSessao";

const T = {
  bg: "#F7F8FA", card: "#FFFFFF", line: "#E4E7EC", lineStrong: "#D0D5DD",
  ink: "#101828", muted: "#667085", faint: "#98A2B3",
  primary: "#6366F1", ok: "#12B76A", warn: "#F79009", danger: "#B42318",
};

const CORES_MAP: Record<string, { bg: string; border: string; ink: string }> = {
  indigo:   { bg: "#EEF2FF", border: "#C7D2FE", ink: "#4338CA" },
  verde:    { bg: "#ECFDF3", border: "#A6F4C5", ink: "#027A48" },
  laranja:  { bg: "#FEF6EE", border: "#F9DBAF", ink: "#B93815" },
  cinzento: { bg: "#F2F4F7", border: "#D0D5DD", ink: "#475467" },
};

const searchSchema = z.object({
  estado: fallback(z.string(), "pendente").default("pendente"),
});

export const Route = createFileRoute("/_authenticated/ferramentas")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Ferramentas sugeridas — Digital Sprint" },
      { name: "description", content: "Directório de ferramentas capturadas de newsletters e directórios especializados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FerramentasPage,
});

function fmtData(iso: string) {
  try { return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return iso; }
}

type DestinoEdicao = { id: string; numero: number; template_version: string; livres: number };

function rotuloFormato(v: string | null | undefined) {
  return (v ?? "classico") === "revista" ? "Revista" : "Clássico";
}

function FerramentasPage() {
  const search = Route.useSearch();
  const { isAdmin } = useSessao();
  const estado = (["pendente", "aprovada", "rejeitada", "arquivada", "todas"].includes(search.estado)
    ? search.estado : "pendente") as FiltroEstadoFerramenta;

  const listar = useServerFn(listarFerramentas);
  const actualizar = useServerFn(actualizarEstadoFerramenta);
  const apagar = useServerFn(apagarFerramenta);
  const aprovar = useServerFn(aprovarFerramentaParaRascunho);
  const listarDestinos = useServerFn(listarEdicoesDestinoFerramenta);
  const rejeitar = useServerFn(rejeitarFerramentaComBan);
  const correrAgora = useServerFn(correrCuradoriaFerramentasAgora);
  const qc = useQueryClient();

  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  const [showFontes, setShowFontes] = useState(false);

  const query = useQuery({
    queryKey: ["ferramentas", estado],
    queryFn: () => listar({ data: { estado } }),
    staleTime: 15_000,
  });

  const destinosQ = useQuery({
    queryKey: ["edicoes-destino-ferramenta"],
    queryFn: () => listarDestinos({ data: {} }),
    staleTime: 30_000,
  });

  const mArquivar = useMutation({
    mutationFn: (id: string) =>
      actualizar({ data: { id, estado: "arquivada" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ferramentas"] }),
  });
  const mAprovar = useMutation({
    mutationFn: (v: { id: string; edicao_id?: string }) => aprovar({ data: v }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ferramentas"] });
      qc.invalidateQueries({ queryKey: ["edicoes-destino-ferramenta"] });
      if (r.ok) {
        setFeedback({
          tipo: "ok",
          msg: `Adicionada à edição #${r.edicao_numero} (${rotuloFormato(r.template_version)}) no lugar ${r.posicao}.`,
        });
      } else {
        setFeedback({ tipo: "erro", msg: r.motivo });
      }
    },
    onError: (e: Error) => setFeedback({ tipo: "erro", msg: e.message }),
  });
  const mRejeitar = useMutation({
    mutationFn: (id: string) => rejeitar({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ferramentas"] });
      setFeedback({ tipo: "ok", msg: r.dominio ? `Rejeitada. Domínio ${r.dominio} banido.` : "Rejeitada." });
    },
  });
  const mDel = useMutation({
    mutationFn: (id: string) => apagar({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ferramentas"] }),
  });

  const mCorrer = useMutation({
    mutationFn: () => correrAgora({ data: {} }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["ferramentas"] });
      if (r.ok) setFeedback({ tipo: "ok", msg: `Recolha concluída: ${r.inseridas} novas de ${r.candidatos} candidatos (${r.descartadas_por_ia} descartadas por IA).` });
      else setFeedback({ tipo: "erro", msg: r.mensagem ?? "Falha na recolha." });
    },
    onError: (e: Error) => setFeedback({ tipo: "erro", msg: e.message }),
  });

  const ferramentas = query.data?.ferramentas ?? [];
  const c = query.data?.contagens ?? { total: 0, pendente: 0, aprovada: 0, rejeitada: 0, arquivada: 0 };

  const setEstado = (e: FiltroEstadoFerramenta) => {
    const url = new URL(window.location.href);
    url.searchParams.set("estado", e);
    window.history.pushState({}, "", url.toString());
    qc.invalidateQueries({ queryKey: ["ferramentas"] });
  };

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6" style={{ background: T.bg }}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight flex items-center gap-2" style={{ color: T.ink }}>
            <Wrench size={20} /> Ferramentas sugeridas
          </h1>
          <p className="text-[13px] mt-1 max-w-2xl" style={{ color: T.muted }}>
            Captura automática a partir de newsletters e directórios (Toolify, Futurepedia, TAAFT).
            A IA filtra o que interessa a marketing e propõe descrição pt-PT e cor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mCorrer.mutate()}
            disabled={mCorrer.isPending}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg"
            style={{ background: T.primary, color: "#fff", opacity: mCorrer.isPending ? 0.7 : 1 }}
          >
            {mCorrer.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Correr recolha agora
          </button>
          <button
            type="button"
            onClick={() => setShowFontes(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold h-9 px-3 rounded-lg"
            style={{ background: T.card, color: T.ink, border: `1px solid ${T.lineStrong}` }}
          >
            <Settings2 size={13} /> Fontes
          </button>
        </div>
      </header>

      {feedback && (
        <div
          role="status"
          className="rounded-[10px] px-3 py-2 mb-3 text-[13px] flex items-center justify-between gap-3"
          style={{
            background: feedback.tipo === "ok" ? `${T.ok}12` : `${T.danger}12`,
            color: feedback.tipo === "ok" ? T.ok : T.danger,
            border: `1px solid ${feedback.tipo === "ok" ? T.ok : T.danger}30`,
          }}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <div className="rounded-[12px] p-2 mb-4 inline-flex flex-wrap gap-1" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        {([
          ["pendente", `Pendentes (${c.pendente})`],
          ["aprovada", `Aprovadas (${c.aprovada})`],
          ["rejeitada", `Rejeitadas (${c.rejeitada})`],
          ["arquivada", `Arquivadas (${c.arquivada})`],
          ["todas", `Todas (${c.total})`],
        ] as const).map(([v, label]) => {
          const activo = estado === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setEstado(v as FiltroEstadoFerramenta)}
              className="text-[12.5px] font-semibold h-8 px-3 rounded-lg transition-colors"
              style={{ background: activo ? "#EEF2FF" : "transparent", color: activo ? T.primary : T.muted }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {query.isLoading && (
        <div className="flex items-center gap-2 text-[13px] py-10 justify-center" style={{ color: T.muted }}>
          <Loader2 size={16} className="animate-spin" /> A carregar…
        </div>
      )}

      {!query.isLoading && ferramentas.length === 0 && (
        <div className="text-[14px] py-16 text-center rounded-[14px]"
          style={{ background: T.card, border: `1px dashed ${T.lineStrong}`, color: T.muted }}>
          Nenhuma ferramenta neste estado. Corre a recolha ou aguarda a próxima newsletter.
        </div>
      )}

      {ferramentas.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {ferramentas.map((f) => (
            <FerramentaCard
              key={f.id}
              f={f}
              isAdmin={isAdmin}
              destinos={destinosQ.data ?? []}
              onAprovar={(edicaoId) => mAprovar.mutate({ id: f.id, edicao_id: edicaoId })}
              onRejeitar={() => mRejeitar.mutate(f.id)}
              onArquivar={() => mArquivar.mutate(f.id)}
              onApagar={() => {
                if (confirm(`Apagar "${f.nome}"? Esta acção é irreversível.`)) mDel.mutate(f.id);
              }}
              pendente={
                (mAprovar.isPending && mAprovar.variables?.id === f.id) ||
                (mRejeitar.isPending && mRejeitar.variables === f.id) ||
                (mArquivar.isPending && mArquivar.variables === f.id)
              }
            />
          ))}
        </ul>
      )}

      {showFontes && <ModalFontes onClose={() => setShowFontes(false)} />}
    </main>
  );
}

function FerramentaCard({ f, isAdmin, destinos, onAprovar, onRejeitar, onArquivar, onApagar, pendente }: {
  f: FerramentaSugerida;
  isAdmin: boolean;
  destinos: DestinoEdicao[];
  onAprovar: (edicaoId?: string) => void;
  onRejeitar: () => void;
  onArquivar: () => void;
  onApagar: () => void;
  pendente: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(f.url); setCopiado(true); setTimeout(() => setCopiado(false), 1200); }
    catch { /* noop */ }
  };

  const chipEstado = (() => {
    switch (f.estado) {
      case "aprovada": return { label: "Aprovada", cor: T.ok, bg: `${T.ok}18` };
      case "rejeitada": return { label: "Rejeitada", cor: T.danger, bg: `${T.danger}14` };
      case "arquivada": return { label: "Arquivada", cor: T.muted, bg: `${T.faint}22` };
      default: return { label: "Pendente", cor: T.warn, bg: `${T.warn}18` };
    }
  })();

  let dominio = "";
  try { dominio = new URL(f.url).hostname.replace(/^www\./, ""); } catch { /* noop */ }

  const paleta = CORES_MAP[(f.cor ?? "indigo").toLowerCase()] ?? CORES_MAP.indigo;

  return (
    <li className="rounded-[14px] p-4 flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
      {/* Mini-prévia com o mesmo aspecto que a ferramenta terá na newsletter */}
      <div
        className="rounded-[12px] p-3 flex items-start gap-3"
        style={{ background: paleta.bg, border: `1px solid ${paleta.border}` }}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 40, height: 40, background: "#fff", fontSize: 22 }}
          aria-hidden
        >{f.emoji ?? "🛠️"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15px] font-semibold truncate" style={{ color: paleta.ink }}>{f.nome}</h3>
            <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide"
              style={{ background: chipEstado.bg, color: chipEstado.cor }}>
              {chipEstado.label}
            </span>
          </div>
          {f.descricao && (
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: paleta.ink, opacity: 0.9 }}>{f.descricao}</p>
          )}
          <a href={f.url} target="_blank" rel="noopener noreferrer"
            className="text-[12px] mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: paleta.ink }}>
            {dominio || f.url} <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="text-[11.5px] flex items-center gap-2 flex-wrap" style={{ color: T.faint }}>
        {f.categoria && (
          <span className="px-1.5 py-0.5 rounded" style={{ background: `${T.primary}12`, color: T.primary }}>
            {f.categoria}
          </span>
        )}
        {f.estado === "aprovada" && f.edicao_aprovada_numero != null && (
          <a
            href="/"
            className="px-1.5 py-0.5 rounded font-semibold hover:underline"
            style={{ background: `${T.ok}14`, color: T.ok, border: `1px solid ${T.ok}30` }}
            title="Ir para o editor"
          >
            → Edição #{f.edicao_aprovada_numero}
          </a>
        )}
        {f.remetente && <span className="inline-flex items-center gap-1"><Mail size={10} /> {f.remetente}</span>}
        <span>· {fmtData(f.criado_em)}</span>
      </div>

      {f.descricao_original && f.descricao_original !== f.descricao && (
        <details className="text-[11.5px]" style={{ color: T.faint }}>
          <summary className="cursor-pointer hover:underline">Ver descrição original</summary>
          <p className="mt-1 leading-relaxed">{f.descricao_original}</p>
        </details>
      )}

      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t" style={{ borderColor: T.line }}>
        {f.estado === "pendente" && (
          <>
            <BotaoEnviarParaEdicao
              destinos={destinos} pendente={pendente} onAprovar={onAprovar}
              rotulo="Aprovar → edição" cor={T.ok}
            />
            <button
              onClick={onArquivar}
              disabled={pendente}
              className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-3 rounded-lg"
              style={{ background: T.card, color: T.muted, border: `1px solid ${T.lineStrong}` }}
              title="Guardar no arquivo para usar depois"
            >
              <Archive size={12} /> Guardar
            </button>
            <button
              onClick={onRejeitar}
              disabled={pendente}
              className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-3 rounded-lg"
              style={{ background: T.card, color: T.danger, border: `1px solid ${T.lineStrong}` }}
              title="Rejeitar e banir por domínio e por nome"
            >
              <X size={12} /> Rejeitar
            </button>
          </>
        )}
        {f.estado === "arquivada" && (
          <BotaoEnviarParaEdicao
            destinos={destinos} pendente={pendente} onAprovar={onAprovar}
            rotulo="Usar na edição" cor={T.primary}
          />
        )}
        <button
          onClick={copiar}
          className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-3 rounded-lg"
          style={{ background: T.card, color: T.muted, border: `1px solid ${T.lineStrong}` }}
        >
          <Copy size={12} /> {copiado ? "Copiado" : "Copiar URL"}
        </button>
        {isAdmin && (
          <button
            onClick={onApagar}
            className="ml-auto inline-flex items-center justify-center h-8 w-8 rounded-lg"
            style={{ background: T.card, color: T.danger, border: `1px solid ${T.lineStrong}` }}
            title="Apagar"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </li>
  );
}

/** Botão dividido: acção rápida (edição em rascunho mais recente) + escolha
 *  explícita da edição Clássico/Revista que recebe a ferramenta. */
function BotaoEnviarParaEdicao({ destinos, pendente, onAprovar, rotulo, cor }: {
  destinos: DestinoEdicao[];
  pendente: boolean;
  onAprovar: (edicaoId?: string) => void;
  rotulo: string;
  cor: string;
}) {
  return (
    <span className="inline-flex items-stretch rounded-lg overflow-hidden" style={{ opacity: pendente ? 0.7 : 1 }}>
      <button
        onClick={() => onAprovar()}
        disabled={pendente}
        className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-3"
        style={{ background: cor, color: "#fff" }}
        title="Inserir na edição em rascunho mais recente"
      >
        <Check size={12} /> {rotulo}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            disabled={pendente}
            className="inline-flex items-center justify-center h-8 w-7"
            style={{ background: cor, color: "#fff", borderLeft: "1px solid rgba(255,255,255,0.35)" }}
            aria-label="Escolher a edição de destino"
            title="Escolher a edição de destino"
          >
            <ChevronDown size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-[12px]">Enviar para</DropdownMenuLabel>
          {destinos.length === 0 && (
            <div className="px-2 py-2 text-[12.5px] text-muted-foreground">
              Não há edições em rascunho. Cria uma no editor primeiro.
            </div>
          )}
          {destinos.map((d) => (
            <DropdownMenuItem
              key={d.id}
              disabled={d.livres === 0}
              onSelect={() => onAprovar(d.id)}
              className="flex items-center justify-between gap-3 text-[13px]"
            >
              <span className="font-medium">
                Edição #{d.numero} · {rotuloFormato(d.template_version)}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {d.livres === 0 ? "sem lugares" : `${d.livres} de 2 livres`}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}



function ModalFontes({ onClose }: { onClose: () => void }) {
  const listar = useServerFn(listarFontesDirectorios);
  const criar = useServerFn(criarFonteDirectorio);
  const actualizar = useServerFn(actualizarFonteDirectorio);
  const apagar = useServerFn(apagarFonteDirectorio);
  const correr = useServerFn(correrCuradoriaFerramentasAgora);
  const alternarLote = useServerFn(alternarDirectoriosEmLote);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["fontes_directorios"], queryFn: () => listar() });
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [confirmToggle, setConfirmToggle] = useState(false);
  type Resultado =
    | { tipo: "sucesso"; inseridas: number; candidatos: number; ms: number; razao?: string }
    | { tipo: "erro"; msg: string };
  const [resultados, setResultados] = useState<Record<string, Resultado>>({});

  const mCriar = useMutation({
    mutationFn: () => criar({ data: { nome, url_listagem: url } }),
    onSuccess: () => { setNome(""); setUrl(""); qc.invalidateQueries({ queryKey: ["fontes_directorios"] }); },
  });
  const mAct = useMutation({
    mutationFn: (vars: { id: string; activa?: boolean; url_listagem?: string }) => actualizar({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fontes_directorios"] }),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => apagar({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fontes_directorios"] }),
  });
  const mCorrer = useMutation({
    mutationFn: async (id: string) => {
      const t0 = Date.now();
      const res = await correr({ data: { forcarFontes: [id] } });
      return { id, res: { ...res, ms: Date.now() - t0 } };
    },
    onSuccess: ({ id, res }) => {
      const razoes = (res as unknown as { razoesScrape?: Record<string, string> }).razoesScrape ?? {};
      const razao = razoes[id];
      setResultados((s) => ({
        ...s,
        [id]: {
          tipo: "sucesso",
          inseridas: res.inseridas ?? 0,
          candidatos: (res as { candidatos?: number }).candidatos ?? 0,
          ms: (res as { ms: number }).ms,
          razao,
        },
      }));
      qc.invalidateQueries({ queryKey: ["fontes_directorios"] });
      qc.invalidateQueries({ queryKey: ["ferramentas"] });
    },
    onError: (e: unknown, id) => {
      setResultados((s) => ({ ...s, [id]: { tipo: "erro", msg: (e as Error).message.slice(0, 140) } }));
    },
  });

  const fontes = q.data ?? [];
  const todasActivas = fontes.length > 0 && fontes.every((f) => f.activa);
  const mLote = useMutation({
    mutationFn: async (activa: boolean) => alternarLote({ data: { ids: fontes.map((f) => f.id), activa } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fontes_directorios"] }); setConfirmToggle(false); },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(16,24,40,0.5)" }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-[16px] overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.line}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.line }}>
          <h2 className="text-[16px] font-semibold" style={{ color: T.ink }}>Fontes de directórios</h2>
          <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </header>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {fontes.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-[12px]" style={{ color: T.muted }}>
                {fontes.length} directório{fontes.length !== 1 ? "s" : ""} · {fontes.filter((f) => f.activa).length} activo{fontes.filter((f) => f.activa).length !== 1 ? "s" : ""}
              </div>
              {!confirmToggle ? (
                <button
                  onClick={() => setConfirmToggle(true)}
                  disabled={mLote.isPending}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold h-8 px-3 rounded-lg"
                  style={{
                    background: todasActivas ? "#FEF3F2" : "#EEF4FF",
                    color: todasActivas ? T.danger : T.primary,
                    border: `1px solid ${todasActivas ? "#FECDCA" : "#C7D7FE"}`,
                  }}
                >
                  <Power size={12} />
                  {todasActivas ? "Desactivar todas" : "Activar todas"}
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[11px]" style={{ color: T.muted }}>Confirmar {fontes.length}?</span>
                  <button
                    onClick={() => mLote.mutate(!todasActivas)}
                    disabled={mLote.isPending}
                    className="text-[12px] font-semibold h-8 px-3 rounded-lg"
                    style={{ background: T.primary, color: "#fff" }}
                  >
                    {mLote.isPending ? "…" : "Sim"}
                  </button>
                  <button onClick={() => setConfirmToggle(false)} className="text-[12px] h-8 px-2 rounded-lg" style={{ color: T.muted }}>Não</button>
                </div>
              )}
            </div>
          )}
          {q.isLoading && <div className="text-[13px]" style={{ color: T.muted }}>A carregar…</div>}
          {q.data && q.data.length === 0 && (
            <div className="text-[13px]" style={{ color: T.muted }}>Sem fontes configuradas.</div>
          )}
          {fontes.map((f: FonteDirectorio) => {
            const aCorrer = mCorrer.isPending && mCorrer.variables === f.id;
            const r = resultados[f.id];
            return (
              <div key={f.id} className="rounded-[10px] p-3" style={{ border: `1px solid ${T.line}` }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate" style={{ color: T.ink }}>{f.nome}</div>
                    <a href={f.url_listagem ?? f.url_feed} target="_blank" rel="noopener noreferrer"
                      className="text-[11.5px] hover:underline" style={{ color: T.primary }}>
                      {f.url_listagem ?? f.url_feed}
                    </a>
                    {f.ultima_recolha && (
                      <div className="text-[11px] mt-0.5" style={{ color: T.faint }}>
                        Última recolha: {new Date(f.ultima_recolha).toLocaleString("pt-PT")}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: T.ink }}>
                    <input
                      type="checkbox"
                      checked={f.activa}
                      onChange={(e) => mAct.mutate({ id: f.id, activa: e.target.checked })}
                    />
                    Activa
                  </label>
                  <button
                    onClick={() => mCorrer.mutate(f.id)}
                    disabled={aCorrer}
                    title="Correr esta fonte agora"
                    className="inline-flex items-center gap-1 text-[12px] font-semibold h-8 px-2.5 rounded-lg"
                    style={{ background: "#EEF4FF", color: T.primary, border: "1px solid #C7D7FE", opacity: aCorrer ? 0.6 : 1 }}
                  >
                    {aCorrer ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    {aCorrer ? "A correr…" : "Correr"}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Apagar "${f.nome}"?`)) mDel.mutate(f.id); }}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg"
                    style={{ background: T.card, color: T.danger, border: `1px solid ${T.lineStrong}` }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {r && (
                  <div className="mt-2 text-[11.5px] font-medium rounded-md px-2 py-1.5"
                    style={{
                      background: r.tipo === "erro" ? "#FEF3F2" : r.tipo === "sucesso" && r.inseridas > 0 ? "#ECFDF3" : "#F2F4F7",
                      color: r.tipo === "erro" ? T.danger : r.tipo === "sucesso" && r.inseridas > 0 ? T.ok : T.muted,
                    }}
                  >
                    {r.tipo === "erro" ? `Erro: ${r.msg}` :
                      r.inseridas > 0
                        ? `+${r.inseridas} nova(s) · ${r.candidatos} candidato(s) · ${(r.ms / 1000).toFixed(1)}s`
                        : `Sem novas — ${r.candidatos} candidato(s), ${(r.ms / 1000).toFixed(1)}s${r.razao ? ` · ${r.razao}` : ""}`}
                  </div>
                )}
              </div>
            );
          })}
          <div className="rounded-[10px] p-3 space-y-2" style={{ border: `1px dashed ${T.lineStrong}` }}>
            <div className="text-[13px] font-semibold" style={{ color: T.ink }}>Adicionar nova fonte</div>
            <input
              type="text"
              value={nome}
              placeholder="Nome (ex: Futurepedia — Marketing)"
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px]"
              style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
            />
            <input
              type="url"
              value={url}
              placeholder="https://..."
              onChange={(e) => setUrl(e.target.value)}
              className="w-full h-9 px-3 rounded-lg text-[13px]"
              style={{ background: "#fff", border: `1px solid ${T.line}`, color: T.ink }}
            />
            <button
              type="button"
              disabled={!nome.trim() || !/^https?:\/\//i.test(url) || mCriar.isPending}
              onClick={() => mCriar.mutate()}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold h-9 px-3 rounded-lg"
              style={{
                background: T.primary, color: "#fff",
                opacity: (!nome.trim() || !/^https?:\/\//i.test(url) || mCriar.isPending) ? 0.5 : 1,
              }}
            >
              <Plus size={12} /> Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
