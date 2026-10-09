// Editor do formato Novo (template_version = "revista"). Reproduz a hierarquia
// da própria newsletter: Crónica → A Atualidade (Destaques + Radar + Só site) →
// Esta semana recomendo → blocos operacionais → Definições e registo.
// A pré-visualização usa o mesmo composer/renderer do envio (fonte única).

import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITES_REVISTA, NOTAS_REVISTA, ROTULOS_REVISTA } from "@/newsletter/lib/newsletter-engine/revista/rotulos";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/newsletter/shim/start";
import {
  Inbox, Sparkles, Settings2, PenLine,
  Layers, Wrench, Mic, Briefcase, Megaphone, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Plus, Trash2,
} from "lucide-react";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { FitaFases, type Fase, type EstadoFase } from "./FitaFases";
import { BlocoEdicao, type ResumoBloco } from "./BlocoEdicao";
import { Ranhuras } from "./Ranhuras";
import { PainelBloqueios, type Bloqueio } from "./PainelBloqueios";
import { toast } from "sonner";
import { Preview, type PreviewDestino } from "../Preview";
import { Pendentes } from "../partilhado/Pendentes";
import { AcompanhamentoFila, FilaEntrada } from "../partilhado/FilaEntrada";

import { usePendentes } from "../partilhado/usePendentes";
import { Podcast } from "../partilhado/Podcast";
import {
  VALORES_LIVRO, VALORES_PROMOCAO, VALORES_SERVICOS,
  PODCAST_PROGRAMA, PODCAST_ETIQUETA, PODCAST_CTA, temaDoEpisodio,
} from "./valores-habituais";

import { EnvioNewsletter } from "../partilhado/EnvioNewsletter";
import { LimparAntigas } from "../partilhado/LimparAntigas";
import { AdicionarNoticias } from "../partilhado/modais/AdicionarNoticias";
import { Fontes } from "../partilhado/modais/Fontes";
import { AssuntoField } from "../AssuntoField";
import { useAutoSave, type AutoSaveApi } from "../useAutoSave";
import { ModalLinks } from "../ModalLinks";
import PainelDestinos from "./PainelDestinos";
import { CabecalhoRevista, type EstadoEdicao } from "./CabecalhoRevista";
import { verificarLinksEdicao, type ItemLink, type ResumoLinks } from "@/newsletter/lib/verificar-links.functions";
import { prontidaoRevistaFn } from "@/newsletter/lib/destinos.functions";
import { rotuloWorkflow } from "@/newsletter/lib/newsletter-engine/revista/prontidao-rotulos";
import { plural, faltam } from "@/newsletter/lib/plural";
import { recortar } from "@/newsletter/lib/recortar";
import {
  excertoDaCronica, paragrafosCronica as dividirParagrafos, posicaoValida, sequenciaCronica,
  editarParagrafos, contarPalavras, EXCERTO_PALAVRAS_MIN, EXCERTO_PALAVRAS_MAX, type OperacaoParagrafo,
} from "@/newsletter/lib/newsletter-engine/revista/sequencia-cronica";

import { CronicaEditor } from "../CronicaEditor";
import { ImagemCronica } from "./ImagemCronica";
import { PropostaApresentacao } from "./PropostaApresentacao";
import { PropostaPecasCronica } from "./PropostaPecasCronica";
import { FerramentasSemana } from "../FerramentasSemana";
import { normalizarConteudoCronica } from "../sanitizeHtml";
import { useSessao } from "../useSessao";
import { Atualidade, ResumoOrdem, type PapelDerivado, type SeloBrief } from "./Atualidade";
import { BriefsDaEdicao } from "./BriefsDaEdicao";
import { ReverLeituras } from "./ReverLeituras";
import { estadoBriefsDaEdicaoFn, sincronizarBriefPapelFn } from "@/newsletter/lib/brief.functions";
import {
  apagarNoticia, atualizarAssunto, atualizarCronica, atualizarNoticia, escolherEpisodio, getConfig, getEdicaoPorId,
  listarAuditRecente, listarEpisodios, listarFerramentas, registarAudit, reordenarNoticias,
  sincronizarPodcastRss, type Episodio,
} from "../data";
import {
  actualizarItem, adicionarItem, getAprovadasDaEdicao, getConfigRevista, getItensRevista,
  guardarConfigRevista, moverItemPapel, removerItem, reordenarItens,
  type ConfigRevista, type ItemRevista, type PapelRevista,
} from "./data-revista";


/** Separador subtil entre grupos de secções — apenas orientação visual. */
function Grupo({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}


const CHAVE_SUBGRUPOS = "revista:subgrupos";

function Subgrupo({ titulo, nota, children, id, resumo }: {
  titulo: string; nota?: string; children: React.ReactNode;
  /** Com id, o subgrupo é dobrável e o estado fica guardado neste browser. */
  id?: string; resumo?: string;
}) {
  const [aberto, setAberto] = useState(true);
  useEffect(() => {
    if (!id) return;
    try {
      const m = JSON.parse(localStorage.getItem(CHAVE_SUBGRUPOS) ?? "{}") as Record<string, boolean>;
      if (typeof m[id] === "boolean") setAberto(m[id]);
    } catch { /* ignora estado inválido */ }
  }, [id]);
  const alternar = () => {
    const novo = !aberto;
    setAberto(novo);
    if (!id) return;
    try {
      const m = JSON.parse(localStorage.getItem(CHAVE_SUBGRUPOS) ?? "{}") as Record<string, boolean>;
      localStorage.setItem(CHAVE_SUBGRUPOS, JSON.stringify({ ...m, [id]: novo }));
    } catch { /* ignora */ }
  };
  const cabecalho = (
    <>
      <p className="text-[13px] font-semibold uppercase tracking-wide text-foreground">{titulo}</p>
      {aberto ? (nota && <p className="mt-0.5 text-[13px] text-muted-foreground">{nota}</p>)
        : (resumo && <p className="mt-0.5 text-[13px] text-muted-foreground">{resumo}</p>)}
    </>
  );
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      {id ? (
        <button type="button" onClick={alternar} aria-expanded={aberto} className="flex w-full items-start justify-between gap-3 text-left">
          <span className="min-w-0">{cabecalho}</span>
          <span className="mt-0.5 shrink-0 text-muted-foreground">{aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
        </button>
      ) : <div>{cabecalho}</div>}
      {aberto && children}
    </div>
  );
}

/** Caixa de texto de um parágrafo do excerto; grava ao sair do campo. */
function ParagrafoEditavel({ texto, bloqueado, onCommit }: { texto: string; bloqueado: boolean; onCommit: (t: string) => void }) {
  const [valor, setValor] = useState(texto);
  useEffect(() => setValor(texto), [texto]);
  return (
    <textarea
      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-[14px] leading-6 text-foreground outline-none transition focus:border-primary"
      rows={Math.min(8, Math.max(2, Math.ceil(valor.length / 70)))}
      value={valor} disabled={bloqueado} aria-label="Texto do parágrafo"
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => { const t = valor.replace(/\s*\n+\s*/g, " ").trim(); if (t && t !== texto) onCommit(t); else setValor(texto); }}
    />
  );
}

/** Aviso curto e explicativo junto a um campo — substitui indicadores ambíguos. */
function AvisoCampo({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return <p className="mt-1 text-[12px] font-medium text-estado-falta">{texto}</p>;
}

/** Indicador discreto e honesto do autosave de um campo. */
function EstadoGravacao({ api }: { api: AutoSaveApi }) {
  if (api.estado === "a-guardar") {
    return <p className="mt-1 text-[12px] text-muted-foreground">A guardar…</p>;
  }
  if (api.estado === "guardado") {
    return <p className="mt-1 text-[12px] font-semibold text-estado-pronto">Guardado</p>;
  }
  if (api.estado === "erro") {
    return (
      <p className="mt-1 text-[12px] font-semibold text-destructive">
        Erro ao guardar{api.err ? ` — ${api.err}` : ""}{" "}
        <button type="button" className="underline" onClick={() => { void api.repetir(); }}>
          Tentar novamente
        </button>
      </p>
    );
  }
  return null;
}

const TIPOS = ["Podcast", "Ferramenta", "Manual", "Livro", "Curso", "Recurso", "Evento", "Outro"];


/* ─── primitivos ─── */

/** Onde é que o campo aparece — a dúvida mais frequente do editor. */
type Destino = "email" | "site" | "ambos";
const DESTINO_ROTULO: Record<Destino, string> = {
  email: "Só email",
  site: "Só site",
  ambos: "Email + site",
};
const DESTINO_CLASSE: Record<Destino, string> = {
  email: "border-indigo-200 bg-indigo-50 text-indigo-700",
  site: "border-sky-200 bg-sky-50 text-sky-700",
  ambos: "border-estado-pronto-borda bg-estado-pronto-suave text-estado-pronto",
};

function SeloDestino({ destino }: { destino: Destino }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DESTINO_CLASSE[destino]}`}>
      {DESTINO_ROTULO[destino]}
    </span>
  );
}

function Campo({
  etiqueta, valor, onChange, area, dica, mono, linhas = 4, destino, id,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void;
  area?: boolean; dica?: string; mono?: boolean; linhas?: number; destino?: Destino;
  id?: string;
}) {
  const cls = `w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition focus:border-primary ${mono ? "font-mono text-[13px]" : ""}`;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">{etiqueta}</span>
        {destino && <SeloDestino destino={destino} />}
      </span>
      {area
        ? <textarea id={id} className={cls} rows={linhas} value={valor} onChange={(e) => onChange(e.target.value)} />
        : <input id={id} className={cls} value={valor} onChange={(e) => onChange(e.target.value)} />}
      {dica && <span className="mt-1.5 block text-[12px] text-muted-foreground">{dica}</span>}
    </label>
  );
}


/* ─── peças móveis da crónica ─── */

type PecaMovel = "lede" | "pull_quote" | "momento";

const NOME_PECA: Record<PecaMovel, string> = {
  lede: "Lede / tese editorial",
  pull_quote: "Frase de destaque",
  momento: "Momento editorial",
};

/** Tipo editorial de cada peça, para leitura rápida da sequência. */
type TipoPeca = "abertura" | "corpo" | "enriquecimento";

const TIPO_DE: Record<PecaMovel, TipoPeca> = {
  lede: "abertura",
  pull_quote: "enriquecimento",
  momento: "enriquecimento",
};

const TIPO_ESTILO: Record<TipoPeca, { txt: string; cls: string }> = {
  abertura: { txt: "Abertura", cls: "border-amber-200 bg-amber-50 text-amber-700" },
  corpo: { txt: "Corpo", cls: "border-border bg-muted text-muted-foreground" },
  enriquecimento: { txt: "Enriquecimento", cls: "border-violet-200 bg-violet-50 text-violet-700" },
};

function SeloTipo({ tipo }: { tipo: TipoPeca }) {
  const m = TIPO_ESTILO[tipo];
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${m.cls}`}>
      {m.txt}
    </span>
  );
}

/** Etiqueta de estado de cada peça: activa, vazia ou desligada. */
function EstadoPeca({ estado }: { estado: "activa" | "vazia" | "desligada" }) {
  const mapa = {
    activa: { txt: "Entra", cls: "bg-primary/10 text-primary" },
    vazia: { txt: "Vazia", cls: "bg-muted text-muted-foreground" },
    desligada: { txt: "Desligada", cls: "bg-muted text-muted-foreground" },
  }[estado];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${mapa.cls}`}>{mapa.txt}</span>
  );
}

/**
 * Ordem visual da crónica no email e na versão web: os parágrafos do excerto
 * são fixos, as peças de enriquecimento — lede incluída — sobem e descem
 * entre eles.
 */
/** Identificador do campo do excerto, alvo dos atalhos «Editar» dos parágrafos. */
const ID_EXCERTO = "revista-cronica-excerto";

function OrdemPecasCronica({
  cfg, editar, bloqueado, avisoLede, irParaParagrafo, cronicaHtml,
}: {
  cfg: ConfigRevista; editar: (p: Partial<ConfigRevista>) => void;
  cronicaHtml: string;
  bloqueado: boolean; avisoLede: string | null;
  irParaParagrafo: (indice: number) => void;
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const alternar = (k: PecaMovel) => setAbertas((a) => ({ ...a, [k]: !a[k] }));

  // Mesmo texto que o email e a web: excerto, ou início da crónica se vazio.
  const excertoVazio = !cfg.cronica_excerto.trim();
  const excertoEfectivo = excertoVazio ? excertoDaCronica(cronicaHtml) : cfg.cronica_excerto;
  const total = dividirParagrafos(excertoEfectivo).length;
  const posLede = posicaoValida(cfg.cronica_lede_posicao ?? 0, total);
  const posQuote = posicaoValida(cfg.pull_quote_posicao, total);
  const posMomento = posicaoValida(cfg.momento_posicao, total);

  const posicaoDe = (peca: PecaMovel) =>
    peca === "lede" ? posLede : peca === "pull_quote" ? posQuote : posMomento;

  const mover = (peca: PecaMovel, delta: number) => {
    const actual = posicaoDe(peca);
    const nova = Math.min(total, Math.max(0, actual + delta));
    if (nova === actual) return;
    editar(
      peca === "pull_quote" ? { pull_quote_posicao: nova }
        : peca === "momento" ? { momento_posicao: nova }
          : { cronica_lede_posicao: nova },
    );
  };

  const seq = sequenciaCronica({
    excerto: excertoEfectivo,
    lede: true,
    ledePos: posLede,
    pullQuote: true,
    pullQuotePos: posQuote,
    momento: true,
    momentoPos: posMomento,
    imagem: false,
    imagemPos: -1,
  });

  const estadoDe = (peca: PecaMovel): "activa" | "vazia" | "desligada" =>
    peca === "lede" ? (cfg.cronica_lede.trim() ? "activa" : "vazia")
      : peca === "pull_quote" ? (cfg.pull_quote.trim() ? "activa" : "vazia")
        : (cfg.momento_activo ? "activa" : "desligada");

  /** Cartão de uma peça móvel: faixa de identificação + campos dobráveis. */
  const CartaoPeca = ({
    peca, ordinal, resumo, children,
  }: { peca: PecaMovel; ordinal: number; resumo: string; children: React.ReactNode }) => {
    const estado = estadoDe(peca);
    const activa = estado === "activa";
    const pos = posicaoDe(peca);
    const aberta = !!abertas[peca];
    return (
      <div
        className={`rounded-xl border transition ${
          activa ? "border-primary/40 bg-primary/[0.05]" : "border-dashed border-border bg-muted/25 opacity-90"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-background text-[11px] font-bold text-muted-foreground ring-1 ring-border">
            {ordinal}
          </span>
          <button
            type="button"
            onClick={() => alternar(peca)}
            aria-expanded={aberta}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <SeloTipo tipo={TIPO_DE[peca]} />
            <span className="truncate text-[13px] font-semibold text-foreground">{NOME_PECA[peca]}</span>
            <EstadoPeca estado={estado} />
            <span className="text-muted-foreground">{aberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
          </button>
          <span className="flex shrink-0 items-center gap-1.5">
            {aberta && (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {ordinal} de {seq.length}
              </span>
            )}
            <button
              type="button" disabled={bloqueado || pos <= 0}
              onClick={() => mover(peca, -1)}
              aria-label={`Subir ${NOME_PECA[peca]}`}
              className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button" disabled={bloqueado || pos >= total}
              onClick={() => mover(peca, 1)}
              aria-label={`Descer ${NOME_PECA[peca]}`}
              className="rounded-lg border border-border bg-background p-2 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </span>
        </div>
        {!aberta && (
          <p className="px-3 pb-2.5 text-[12.5px] leading-5 text-muted-foreground">{resumo}</p>
        )}
        {aberta && <div className="border-t border-border/60 px-3 py-3">{children}</div>}
      </div>
    );
  };

  /** Aplica a operação; com excerto vazio, materializa primeiro o início da crónica. */
  const aplicar = (o: OperacaoParagrafo) => {
    const r = editarParagrafos(
      { paragrafos: dividirParagrafos(excertoEfectivo), ledePos: posLede, quotePos: posQuote, momentoPos: posMomento },
      o,
    );
    editar({
      cronica_excerto: r.paragrafos.join("\n\n"),
      cronica_lede_posicao: r.ledePos,
      pull_quote_posicao: r.quotePos,
      momento_posicao: r.momentoPos,
    });
  };

  const palavras = contarPalavras(excertoEfectivo);
  const caracteres = excertoEfectivo.replace(/\s+/g, " ").trim().length;
  const dentro = palavras >= EXCERTO_PALAVRAS_MIN && palavras <= EXCERTO_PALAVRAS_MAX;

  const montarExcerto = () => {
    if (!excertoVazio && !window.confirm("Substituir o excerto personalizado pelo início da crónica?")) return;
    const auto = excertoDaCronica(cronicaHtml);
    editar({ cronica_excerto: auto });
  };

  let ordinal = 0;

  return (
    <div className="space-y-2.5">
      <p className="text-[12px] text-muted-foreground">
        Ordem exacta da crónica no email e na versão web. Abre um parágrafo para o editar; sobe, desce,
        apaga ou acrescenta parágrafos e peças com os botões.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-1 text-[12px] font-semibold ${dentro ? "bg-estado-pronto/10 text-estado-pronto" : "bg-estado-falta/10 text-estado-falta"}`}>
          {palavras} palavras · {caracteres} caracteres
        </span>
        <span className="text-[12px] text-muted-foreground">
          Recomendado {EXCERTO_PALAVRAS_MIN}–{EXCERTO_PALAVRAS_MAX} palavras (cerca de 600 caracteres)
        </span>
        <button
          type="button" disabled={bloqueado || !cronicaHtml.trim()}
          onClick={montarExcerto}
          className="ml-auto rounded-lg border border-border bg-background px-2.5 py-1 text-[12px] font-semibold text-foreground transition hover:bg-muted disabled:opacity-40"
        >
          Montar excerto a partir da crónica
        </button>
      </div>

      {seq.map((peca, i) => {
        ordinal += 1;
        const n = ordinal;

        if (peca.tipo === "paragrafo") {
          const idx = peca.indice - 1;
          const aberto = !!abertas[`p${idx}`];
          const btn = "rounded-lg border border-border bg-background p-1.5 text-muted-foreground transition hover:text-foreground disabled:opacity-30";
          return (
            <div key={`p-${i}`} className="rounded-lg border border-border/50 bg-background/50 px-3 py-2.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-background text-[11px] font-bold text-muted-foreground ring-1 ring-border">
                  {n}
                </span>
                <button
                  type="button" aria-expanded={aberto}
                  onClick={() => setAbertas((a) => ({ ...a, [`p${idx}`]: !a[`p${idx}`] }))}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <SeloTipo tipo="corpo" />
                  <span className="text-[13px] font-semibold text-foreground">Parágrafo {peca.indice}</span>
                  <span className="text-muted-foreground">{aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                </button>
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" className={btn} disabled={bloqueado || idx <= 0} aria-label={`Subir parágrafo ${peca.indice}`} onClick={() => aplicar({ op: "mover", indice: idx, delta: -1 })}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className={btn} disabled={bloqueado || idx >= total - 1} aria-label={`Descer parágrafo ${peca.indice}`} onClick={() => aplicar({ op: "mover", indice: idx, delta: 1 })}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className={btn} disabled={bloqueado} aria-label={`Apagar parágrafo ${peca.indice}`} onClick={() => aplicar({ op: "apagar", indice: idx })}><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
              {aberto ? (
                <div className="space-y-2">
                  <ParagrafoEditavel
                    texto={peca.texto} bloqueado={bloqueado}
                    onCommit={(t) => aplicar({ op: "editar", indice: idx, texto: t })}
                  />
                  <button
                    type="button" disabled={bloqueado}
                    onClick={() => aplicar({ op: "inserir", indice: idx + 1, texto: "Novo parágrafo." })}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> Parágrafo abaixo
                  </button>
                </div>
              ) : (
                <p className="text-[12.5px] leading-5 text-muted-foreground">{peca.texto}</p>
              )}
            </div>
          );
        }


        if (peca.tipo === "lede") {
          return (
            <CartaoPeca
              key="lede" peca="lede" ordinal={n}
              resumo={cfg.cronica_lede.trim() ? recortar(cfg.cronica_lede.trim(), 110) : "Por escrever."}
            >
              <Campo
                etiqueta="Lede / tese editorial" area linhas={3}
                valor={cfg.cronica_lede} onChange={(v) => editar({ cronica_lede: v })}
                dica="Aparece em Georgia, a abrir a crónica."
              />
              <AvisoCampo texto={avisoLede} />
            </CartaoPeca>
          );
        }

        if (peca.tipo === "pull_quote") {
          return (
            <CartaoPeca
              key="quote" peca="pull_quote" ordinal={n}
              resumo={cfg.pull_quote.trim() ? `«${recortar(cfg.pull_quote.trim(), 100)}»` : "Por escrever."}
            >
              <textarea
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none transition focus:border-primary"
                rows={2} value={cfg.pull_quote} disabled={bloqueado}
                aria-label="Frase de destaque"
                onChange={(e) => editar({ pull_quote: e.target.value })}
              />
            </CartaoPeca>
          );
        }

        return (
          <CartaoPeca
            key="momento" peca="momento" ordinal={n}
            resumo={cfg.momento_activo
              ? [cfg.momento_valor.trim(), cfg.momento_descricao.trim()].filter(Boolean).join(" — ") || "Por preencher."
              : "Não entra nesta edição."}
          >
            <label className="flex items-center gap-3 text-[14px] text-foreground">
              <input
                type="checkbox" checked={cfg.momento_activo} disabled={bloqueado}
                onChange={(e) => editar({ momento_activo: e.target.checked })}
                className="h-5 w-5 accent-[hsl(var(--primary))]"
              />
              Mostrar o bloco nesta edição
            </label>
            <fieldset
              disabled={!cfg.momento_activo || bloqueado}
              className={cfg.momento_activo ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-50"}
            >
              <Campo etiqueta="Etiqueta" valor={cfg.momento_etiqueta} onChange={(v) => editar({ momento_etiqueta: v })} />
              <Campo etiqueta="Valor protagonista" valor={cfg.momento_valor} onChange={(v) => editar({ momento_valor: v })} />
              <Campo etiqueta="Descrição" area linhas={2} valor={cfg.momento_descricao} onChange={(v) => editar({ momento_descricao: v })} />
            </fieldset>
          </CartaoPeca>
        );
      })}

      <button
        type="button" disabled={bloqueado}
        onClick={() => aplicar({ op: "inserir", indice: total, texto: "Novo parágrafo." })}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[12.5px] font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar parágrafo
      </button>

      {excertoVazio ? (
        <p className="text-[12px] text-muted-foreground">
          A usar o início da crónica (excerto vazio). Ao editar um parágrafo, passa a ser um excerto personalizado.
        </p>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          Excerto personalizado.
          <button
            type="button" disabled={bloqueado}
            onClick={() => { if (window.confirm("Voltar ao início automático da crónica? O excerto personalizado é apagado.")) editar({ cronica_excerto: "" }); }}
            className="font-semibold text-foreground underline underline-offset-2 disabled:opacity-40"
          >
            Voltar ao início da crónica
          </button>
        </p>
      )}
    </div>
  );
}


/* ─── editor ─── */





export default function EditorRevista({
  edicaoId, numero, selo,
}: { edicaoId: string; numero: number; selo?: React.ReactNode }) {

  const qc = useQueryClient();
  const [folds, setFolds] = useState<Record<string, boolean>>({});
  const alternar = (id: string) => setFolds((f) => ({ ...f, [id]: !(f[id] ?? false) }));
  /** Garante que a abertura inicial só é decidida uma vez por edição. */
  const foldsIniciados = useRef<string | null>(null);
  const [aba, setAba] = useState<"editor" | "preview">("editor");
  const [destino, setDestino] = useState<PreviewDestino>("email");
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  const [mostrarTodosEpisodios, setMostrarTodosEpisodios] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [aPrepararEnvio, setAPrepararEnvio] = useState(false);

  // Estado global do workflow multicanal (Fase E3). Sem listas escolhidas:
  // aqui só se quer o estado, não a validação do envio.
  const prontidaoQ = useQuery({
    queryKey: ["prontidao-workflow", edicaoId],
    queryFn: () => prontidaoRevistaFn({ data: { edicao_id: edicaoId } }),
    enabled: !!edicaoId,
    staleTime: 30_000,
  });
  const notificar = (m: string, opts?: { tipo?: "ok" | "erro" }) =>
    opts?.tipo === "erro" ? toast.error(m) : toast.success(m);

  const { nomeExibicao, isAdmin, papel } = useSessao();
  const edicaoQ = useQuery({ queryKey: ["edicao", edicaoId], queryFn: () => getEdicaoPorId(edicaoId) });
  const bloqueado = edicaoQ.data?.estado === "enviada";
  const episodiosQ = useQuery({ queryKey: ["episodios"], queryFn: listarEpisodios });
  const feedQ = useQuery({ queryKey: ["config", "podcast_rss_url"], queryFn: () => getConfig("podcast_rss_url") });
  const ferramentasQ = useQuery({ queryKey: ["ferramentas", edicaoId], queryFn: () => listarFerramentas(edicaoId) });
  const auditQ = useQuery({ queryKey: ["audit"], queryFn: () => listarAuditRecente(8) });

  /** Registo de actividade — mesma infra-estrutura do formato Clássico. */
  const registar = (accao: string, detalhe?: unknown) => {
    void registarAudit(nomeExibicao || "Editor", accao, detalhe)
      .then(() => { qc.invalidateQueries({ queryKey: ["audit"] }); void auditQ; })
      .catch(() => { /* auditoria não-crítica */ });
  };

  /* ─── Briefs da edição (Fase 2C: ainda sem publicação pública) ─── */
  const estadoBriefs = useServerFn(estadoBriefsDaEdicaoFn);
  const sincronizarPapelBrief = useServerFn(sincronizarBriefPapelFn);
  const briefsQ = useQuery({
    queryKey: ["briefs", edicaoId],
    queryFn: () => estadoBriefs({ data: { edicaoId } }),
    enabled: !!edicaoId,
  });
  const briefs = briefsQ.data ?? [];
  const recarregarBriefs = () => { void qc.invalidateQueries({ queryKey: ["briefs", edicaoId] }); };
  const selosBrief = useMemo(() => {
    const m = new Map<string, SeloBrief>();
    for (const b of briefs) {
      if (!b.noticiaId) continue;
      m.set(b.noticiaId, { rotulo: b.rotulo, precisaAtencao: b.precisaAtencao, papel: b.papel });
    }
    return m;
  }, [briefs]);
  /** Acompanha a escolha do papel; a geração continua a ser sempre manual. */
  const sincronizarBrief = (noticiaId: string, papel: "destaque" | "radar" | null) => {
    void sincronizarPapelBrief({ data: { edicaoId, noticiaId, papel } })
      .then(recarregarBriefs)
      .catch(() => { /* o Brief não pode travar a escolha editorial */ });
  };
  const accoesBriefs = { recarregar: recarregarBriefs, registar };
  // Opening an edition is read-only; never synchronize Briefs on mount.

  /* ─── Verificação de links (partilhada com o Clássico) ─── */
  const [modalLinks, setModalLinks] = useState(false);
  const [linksItems, setLinksItems] = useState<ItemLink[] | null>(null);
  const [linksResumo, setLinksResumo] = useState<ResumoLinks | null>(null);
  const [linksEm, setLinksEm] = useState<string | null>(null);
  const verificarLinksFn = useServerFn(verificarLinksEdicao);
  const mLinks = useMutation({
    mutationFn: (forcar: boolean) => verificarLinksFn({ data: { edicao_id: edicaoId, forcar } }),
    onSuccess: (r) => {
      setLinksItems(r.items);
      setLinksResumo(r.resumo);
      setLinksEm(r.verificado_em);
      if (!r.cache) registar("Verificou links da edição Revista", { edicao: numero, ...r.resumo });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const abrirLinks = () => { setModalLinks(true); if (!linksItems) mLinks.mutate(false); };

  const mSincronizarPodcast = useMutation({
    mutationFn: sincronizarPodcastRss,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["episodios"] }); toast.success(`${r.novos} episódio(s) novo(s)`); },
    onError: (e: Error) => toast.error(e.message),
  });
  /** Patch de «Esta semana recomendo» a partir de um episódio — usado pelo botão e pelo preenchimento automático. */
  function patchDoPodcast(ep: Episodio): Partial<ConfigRevista> {
    return {
      recomendacao_tipo: "Podcast",
      recomendacao_titulo: ep.titulo,
      recomendacao_url: ep.url ?? "",
      recomendacao_meta: ep.codigo ?? "",
    };
  }

  /**
   * Patch do bloco amarelo do podcast a partir do episódio escolhido. Trocar
   * de episódio substitui sempre o conteúdo do bloco: caso contrário a
   * pré-visualização continuaria a mostrar o episódio anterior.
   */
  function patchBlocoPodcast(ep: Episodio): Partial<ConfigRevista> {
    return {
      podcast_activo: true,
      podcast_etiqueta: (cfg?.podcast_etiqueta ?? "").trim() || PODCAST_ETIQUETA,
      podcast_programa: (cfg?.podcast_programa ?? "").trim() || PODCAST_PROGRAMA,
      podcast_tema: temaDoEpisodio(ep.titulo),
      podcast_url: ep.url ?? "",
      podcast_cta: (cfg?.podcast_cta ?? "").trim() || PODCAST_CTA,
    };
  }

  const mEscolherEp = useMutation({
    mutationFn: (ep: Episodio) => escolherEpisodio(edicaoId, ep.id),
    onSuccess: (_d, ep) => {
      registar(`Escolheu o podcast «${ep.titulo.slice(0, 40)}»`);
      if (!bloqueado) {
        // Trocar de episódio actualiza sempre o bloco do podcast e, quando a
        // recomendação da semana é um podcast (ou ainda está vazia), também
        // «Esta semana recomendo». Gravado de imediato para a
        // pré-visualização mudar sem esperar pela gravação automática.
        const tipo = (cfg?.recomendacao_tipo ?? "").trim().toLowerCase();
        const vazia = !(cfg?.recomendacao_titulo ?? "").trim() && !(cfg?.recomendacao_url ?? "").trim();
        const tocaRecomendacao = vazia || tipo === "podcast";
        editarJa({ ...(tocaRecomendacao ? patchDoPodcast(ep) : {}), ...patchBlocoPodcast(ep) });
        toast.success(tocaRecomendacao
          ? "Episódio actualizado no bloco do podcast e em «Esta semana recomendo»."
          : "Bloco do podcast actualizado com este episódio.");
      }
      qc.invalidateQueries({ queryKey: ["edicao", edicaoId] }); bump();
    },
    onError: (e: Error) => toast.error(e.message),
  });



  // Assunto do email — mesmo campo, validação e sugestões do Editor Clássico.
  const [assunto, setAssunto] = useState("");
  const [modalLimpar, setModalLimpar] = useState(false);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [modalFontes, setModalFontes] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAssunto(edicaoQ.data?.assunto ?? ""); }, [edicaoQ.data?.id]);

  const assuntoAS = useAutoSave(
    assunto,
    async (v) => { await atualizarAssunto(edicaoId, v); },
    { enabled: !bloqueado },
  );


  const propsPendentes = usePendentes({
    edicaoId, bloqueado: !!bloqueado, nomeExibicao: nomeExibicao || "Editor", notify: notificar,
    onLimparAntigas: () => setModalLimpar(true),
    onAdicionarNoticias: () => setModalAdicionar(true),
    onAbrirFontes: () => setModalFontes(true),
  });



  /** Leva o utilizador ao campo do excerto, com o cursor no parágrafo pedido. */
  const irParaParagrafo = (indice: number) => {
    const el = document.getElementById(ID_EXCERTO) as HTMLTextAreaElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const partes = el.value.split(/\n\s*\n/);
    const inicio = partes.slice(0, Math.max(0, indice - 1)).join("\n\n").length
      + (indice > 1 ? 2 : 0);
    const fim = inicio + (partes[indice - 1]?.length ?? 0);
    el.focus({ preventScroll: true });
    el.setSelectionRange(inicio, fim);
    el.classList.add("ring-2", "ring-primary");
    window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1200);
  };

  const cfgQ = useQuery({ queryKey: ["revista-config", edicaoId], queryFn: () => getConfigRevista(edicaoId) });
  const itensQ = useQuery({ queryKey: ["revista-itens", edicaoId], queryFn: () => getItensRevista(edicaoId) });
  const aprovadasQ = useQuery({ queryKey: ["revista-aprovadas", edicaoId], queryFn: () => getAprovadasDaEdicao(edicaoId) });

  // Estado local do formulário com gravação com atraso (800 ms).
  // Hidrata uma vez por edição: mudar de edição volta a carregar do servidor
  // em vez de reaproveitar o formulário anterior.
  const [cfg, setCfg] = useState<ConfigRevista | null>(null);
  const [cfgHidratada, setCfgHidratada] = useState<string | null>(null);
  useEffect(() => {
    if (!cfgQ.data || cfgQ.data.edicao_id !== edicaoId) return;
    if (cfgHidratada === edicaoId) return;
    setCfg(cfgQ.data);
    setCfgHidratada(edicaoId);
  }, [cfgQ.data, edicaoId, cfgHidratada]);

  const guardar = useMutation({
    mutationFn: ({ alvo, patch }: { alvo: string; patch: Partial<ConfigRevista> }) =>
      guardarConfigRevista(alvo, patch),
    onSuccess: (_d, { alvo, patch }) => {
      // Registo agregado: uma entrada por gravação, não por tecla.
      const campos = Object.keys(patch);
      if (campos.some((c) => c.startsWith("promocao_"))) registar("Alterou a promoção de abertura");
      else if (campos.some((c) => c.startsWith("recomendacao_"))) registar("Alterou «Esta semana recomendo»");
      else if (campos.some((c) => c.startsWith("cronica_") || c === "pull_quote")) registar("Alterou a apresentação da crónica");
      else if (campos.some((c) => c.startsWith("momento_"))) registar("Alterou o momento editorial");
      qc.invalidateQueries({ queryKey: ["revista-config", alvo] }); bump();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // O patch guarda o `edicao_id` de origem: uma gravação atrasada nunca cai
  // numa edição diferente daquela onde o texto foi escrito.
  const [pendente, setPendente] = useState<{ alvo: string; patch: Partial<ConfigRevista> } | null>(null);
  useEffect(() => {
    if (!pendente) return;
    const t = window.setTimeout(() => { guardar.mutate(pendente); setPendente(null); }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente]);
  const editar = (patch: Partial<ConfigRevista>) => {
    if (cfgHidratada !== edicaoId) return;
    setCfg((c) => (c ? { ...c, ...patch } : c));
    setPendente((p) => ({
      alvo: edicaoId,
      patch: p && p.alvo === edicaoId ? { ...p.patch, ...patch } : patch,
    }));
  };


  /** Como `editar`, mas grava já — usado quando a pré-visualização tem de mudar de imediato. */
  const editarJa = (patch: Partial<ConfigRevista>) => {
    if (cfgHidratada !== edicaoId) return;
    setCfg((c) => (c ? { ...c, ...patch } : c));
    guardar.mutate({ alvo: edicaoId, patch });
  };

  const invalidarItens = () => {
    qc.invalidateQueries({ queryKey: ["revista-itens", edicaoId] });
    bump();
  };
  const mAdicionar = useMutation({
    mutationFn: (v: { noticiaId: string; papel: PapelRevista }) => adicionarItem(edicaoId, v.noticiaId, v.papel),
    onSuccess: invalidarItens,
    onError: (e: Error) => toast.error(e.message),
  });
  const mRemover = useMutation({
    mutationFn: (id: string) => removerItem(id),
    onSuccess: invalidarItens, onError: (e: Error) => toast.error(e.message),
  });
  const mMover = useMutation({
    mutationFn: (v: { id: string; papel: PapelRevista }) => moverItemPapel(edicaoId, v.id, v.papel),
    onSuccess: invalidarItens, onError: (e: Error) => toast.error(e.message),
  });
  const mPatch = useMutation({
    mutationKey: ["revista-item-patch", edicaoId],
    mutationFn: (v: { id: string; patch: Partial<ItemRevista> }) => actualizarItem(v.id, v.patch),
    onSuccess: (_d, v) => {
      const campos = Object.keys(v.patch);
      const nomes = campos.map((c) =>
        c === "titulo_override" ? "título editorial" : c === "resumo_factual" ? "resumo factual" : "«A minha leitura»");
      registar(`Editou ${nomes.join(", ")} de um destaque`);
      invalidarItens();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mOrdem = useMutation({
    mutationFn: (ids: string[]) => reordenarItens(ids),
    onSuccess: () => { registar("Alterou a ordem das notícias no email"); invalidarItens(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const invalidarAprovadas = () => {
    qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] });
    qc.invalidateQueries({ queryKey: ["revista-itens", edicaoId] });
    bump();
  };

  /** Edição dos campos base da notícia (título, descrição, link, categoria). */
  const mPatchNoticia = useMutation({
    mutationFn: (v: { id: string; patch: Record<string, string> }) => atualizarNoticia(v.id, v.patch),
    onSuccess: (_d, v) => {
      registar(v.patch["categoria"] && Object.keys(v.patch).length === 1
        ? "Mudou a categoria de uma notícia"
        : "Editou uma notícia da edição");
      invalidarAprovadas();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Remove a notícia da edição (e o item Revista, se existir). */
  const mRemoverNoticia = useMutation({
    mutationFn: async (noticiaId: string) => {
      const item = (itensQ.data ?? []).find((i) => i.noticia_id === noticiaId);
      if (item) await removerItem(item.id);
      await apagarNoticia(noticiaId);
    },
    onSuccess: () => { registar("Removeu uma notícia da edição"); invalidarAprovadas(); toast.success("Notícia removida."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mOrdemNoticias = useMutation({
    mutationFn: (ids: string[]) => reordenarNoticias(edicaoId, ids),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] }); bump(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Crónica base (partilhada com o formato Clássico).
  //
  // Hidratação explícita: o estado local só é considerado editável depois de a
  // query da edição responder para ESTA edição. Enquanto isso, os autosaves
  // estão desligados e o valor observado é tratado como «já gravado», pelo que
  // nem o parágrafo vazio de arranque do editor rico nem a chegada dos dados
  // remotos provocam qualquer escrita.
  const cronica = edicaoQ.data?.cronica ?? null;
  const [cronicaTitulo, setCronicaTitulo] = useState("");
  const [cronicaHtml, setCronicaHtml] = useState("");
  const [cronicaLeituras, setCronicaLeituras] = useState("");
  const [edicaoHidratada, setEdicaoHidratada] = useState<string | null>(null);
  const dadosDaEdicao = edicaoQ.isSuccess && edicaoQ.data?.id === edicaoId;

  useEffect(() => {
    if (!dadosDaEdicao) return;
    setEdicaoHidratada((actual) => {
      if (actual === edicaoId) return actual;
      setCronicaTitulo(cronica?.titulo ?? "");
      setCronicaHtml(normalizarConteudoCronica(cronica?.conteudo_html ?? cronica?.conteudo ?? ""));
      setCronicaLeituras(cronica?.leituras_recomendadas ?? "");
      return edicaoId;
    });
  }, [dadosDaEdicao, edicaoId, cronica]);

  const cronicaPronta = edicaoHidratada === edicaoId;
  const podeGravarCronica = cronicaPronta && !bloqueado;

  const guardarCampoCronica = async (
    patch: Record<string, string>, ctx: string | undefined,
  ) => {
    // `ctx` é o edicao_id capturado quando a alteração foi feita: uma gravação
    // atrasada da edição anterior nunca escreve na edição actualmente aberta.
    await atualizarCronica(ctx ?? edicaoId, patch);
    registar("Alterou a crónica");
    qc.invalidateQueries({ queryKey: ["edicao", ctx ?? edicaoId] });
    bump();
  };

  const cronicaTituloAS = useAutoSave(
    cronicaTitulo,
    (v, ctx) => guardarCampoCronica({ titulo: v }, ctx),
    { enabled: podeGravarCronica, contexto: edicaoId },
  );
  const cronicaCorpoAS = useAutoSave(
    cronicaHtml,
    (v, ctx) => guardarCampoCronica({ conteudo_html: v }, ctx),
    { enabled: podeGravarCronica, contexto: edicaoId },
  );
  const cronicaLeiturasAS = useAutoSave(
    cronicaLeituras,
    (v, ctx) => guardarCampoCronica({ leituras_recomendadas: v }, ctx),
    { enabled: podeGravarCronica, contexto: edicaoId },
  );

  /** Estado agregado da gravação automática, mostrado uma só vez no cabeçalho. */
  const autosaves = [assuntoAS, cronicaTituloAS, cronicaCorpoAS, cronicaLeiturasAS];
  const gravacaoGlobal: "idle" | "a-guardar" | "guardado" | "erro" =
    autosaves.some((a) => a.estado === "erro") ? "erro"
      : autosaves.some((a) => a.estado === "a-guardar" || a.pendente) ? "a-guardar"
        : autosaves.some((a) => a.estado === "guardado") ? "guardado"
          : "idle";




  const itens = itensQ.data ?? [];
  const destaques = itens.filter((i) => i.papel === "destaque");
  const radar = itens.filter((i) => i.papel === "radar");
  const usadas = new Set(itens.map((i) => i.noticia_id));

  /**
   * Ordem no email (`revista_itens.ordem`). Reordena apenas o papel arrastado,
   * mas escreve a lista completa para não perder as posições do outro papel.
   */
  const reordenarEmail = (papel: PapelRevista, ids: string[]) => {
    const outro = papel === "destaque" ? radar : destaques;
    const novos = papel === "destaque"
      ? [...ids, ...outro.map((i) => i.id)]
      : [...outro.map((i) => i.id), ...ids];
    mOrdem.mutate(novos);
  };

  /**
   * Dá tempo às gravações automáticas dos cartões para terminarem e volta a
   * ler os dados antes de construir a checklist. Evita que o modal apresente
   * a versão anterior de um texto acabado de escrever.
   */
  const abrirEnvioActualizado = async () => {
    if (aPrepararEnvio) return;
    setAPrepararEnvio(true);
    try {
      // Os cartões disparam a gravação 800 ms após a última tecla. Depois
      // aguardamos também pelo pedido à base de dados, não apenas pelo timer.
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      while (qc.isMutating({ mutationKey: ["revista-item-patch", edicaoId] }) > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      await Promise.all([
        itensQ.refetch(),
        edicaoQ.refetch(),
        cfgQ.refetch(),
      ]);
      setModalEnvio(true);
    } catch {
      toast.error("Não foi possível atualizar a checklist. Tenta novamente.");
    } finally {
      setAPrepararEnvio(false);
    }
  };


  // Integridade (mesmas regras do composer no servidor). A lista única de
  // diagnósticos é `bloqueios`, construída mais abaixo: o cabeçalho, o painel
  // e o modal de envio leem todos daí, para nunca mostrarem contagens diferentes.
  const assuntoLimpo = assunto.trim();

  // Avisos inline explicativos junto aos campos (em vez de badges ambíguos).
  const ledeTxt = (cfg?.cronica_lede ?? "").replace(/\s+/g, " ").trim();
  const avisoLede = ledeTxt.length > 0 && !(ledeTxt.length >= 80 && ledeTxt.split(" ").filter(Boolean).length >= 12)
    ? "A lede ainda não serve de excerto — precisa de pelo menos 80 caracteres e 12 palavras."
    : null;
  const excertoTxt = (cfg?.cronica_excerto ?? "").trim();
  const avisoExcerto = !excertoTxt
    ? "Excerto por preencher — é o texto que abre a edição no email e na web."
    : excertoTxt.length < 120
      ? "Excerto muito curto — recomenda-se pelo menos um parágrafo completo."
      : null;


  const aprovadas = aprovadasQ.data ?? [];
  const porOrganizar = aprovadas.filter((n) => !usadas.has(n.id) && n.destino !== "site");
  const soSite = aprovadas.filter((n) => !usadas.has(n.id) && n.destino === "site");


  const definirPapel = (noticiaId: string, papel: PapelDerivado) => {
    if (papel === "por_organizar") return;
    const existente = itens.find((i) => i.noticia_id === noticiaId);
    const titulo = (aprovadas.find((n) => n.id === noticiaId)?.titulo ?? "notícia").slice(0, 40);
    if (papel === "so_site") {
      mPatchNoticia.mutate({ id: noticiaId, patch: { destino: "site" } });
      if (existente) {
        mRemover.mutate(existente.id);
        sincronizarBrief(noticiaId, null);
        registar(`Passou «${titulo}» a Só site`);
      }
      return;
    }
    if (existente?.papel === papel) return;
    // Nunca substituir outra notícia em silêncio: se o papel está cheio, explicar.
    if (papel === "destaque" && destaques.length >= LIMITES_REVISTA.destaquesMax) {
      toast.error(`Já tens ${LIMITES_REVISTA.destaquesMax} destaques. Passa um deles a Radar ou a Só site antes de escolher outro.`);
      return;
    }
    if (papel === "radar" && radar.length >= LIMITES_REVISTA.radarMax) {
      toast.error(`O Radar já tem ${LIMITES_REVISTA.radarMax} notícias. Liberta uma antes de acrescentar outra.`);
      return;
    }
    if (!existente && aprovadas.find((n) => n.id === noticiaId)?.destino === "site") {
      mPatchNoticia.mutate({ id: noticiaId, patch: { destino: "news" } });
    }
    registar(`Marcou «${titulo}» como ${papel === "destaque" ? "Destaque" : "Radar"}`);
    sincronizarBrief(noticiaId, papel);
    if (!existente) { mAdicionar.mutate({ noticiaId, papel }); return; }
    mMover.mutate({ id: existente.id, papel });
  };


  const contadores = [
    { rotulo: "Aprovadas", valor: String(aprovadas.length) },
    { rotulo: "Destaques", valor: `${destaques.length}/${LIMITES_REVISTA.destaquesMax}` },
    { rotulo: "Radar", valor: `${radar.length}/${LIMITES_REVISTA.radarMax}` },
    { rotulo: "Por organizar", valor: String(porOrganizar.length) },
    { rotulo: "Só site", valor: String(soSite.length) },
  ];
  const destaquesCheios = destaques.length >= LIMITES_REVISTA.destaquesMax;
  const radarCheio = radar.length >= LIMITES_REVISTA.radarMax;
  const notaLimite = destaquesCheios && radarCheio
    ? "Destaques e Radar estão no máximo — liberta um lugar para trocar."
    : destaquesCheios
      ? `Destaques no máximo (${LIMITES_REVISTA.destaquesMax}) — para trocar, passa um a Radar ou Só site.`
      : radarCheio
        ? `Radar no máximo (${LIMITES_REVISTA.radarMax}) — liberta uma entrada para acrescentar outra.`
        : null;

  /* ─── Fases de trabalho: curar → compor → publicar ─── */
  const [fase, setFase] = useState<Fase>("compor");
  const chaveFase = `revista-fase-${edicaoId}`;
  const itensCarregados = itensQ.isSuccess;
  const semItens = itens.length === 0;
  useEffect(() => {
    const guardada = sessionStorage.getItem(chaveFase);
    if (guardada === "curar" || guardada === "compor" || guardada === "publicar") setFase(guardada);
    // A new edition with no items starts at step 1, "Curar".
    else if (itensCarregados && semItens) setFase("curar");
  }, [chaveFase, itensCarregados, semItens]);
  useEffect(() => { sessionStorage.setItem(chaveFase, fase); }, [chaveFase, fase]);

  /**
   * Abertura inicial: em vez de abrir tudo, abre só o primeiro bloco por
   * resolver. A escolha do editor a partir daí fica guardada nesta sessão.
   */
  const chaveFolds = `revista-folds-${edicaoId}`;
  useEffect(() => {
    // Só decide quando a edição, a configuração e os itens já chegaram —
    // caso contrário abriria sempre a crónica por estar aparentemente vazia.
    if (!cfg || !itensQ.data || !edicaoQ.data || foldsIniciados.current === edicaoId) return;
    foldsIniciados.current = edicaoId;
    const guardados = sessionStorage.getItem(chaveFolds);
    if (guardados) {
      try {
        setFolds(JSON.parse(guardados) as Record<string, boolean>);
        return;
      } catch { /* estado corrompido: usa o cálculo abaixo */ }
    }
    const primeiro = !cfg.cronica_titulo.trim() || (cronicaHtml.match(/<p[\s>]/gi) ?? []).length === 0
      ? "cronica"
      : destaques.length < LIMITES_REVISTA.destaquesMin || radar.length < LIMITES_REVISTA.radarMin
        ? "atualidade"
        : !assunto.trim()
          ? "definicoes"
          : "cronica";
    setFolds({ [primeiro]: true });
    // Só depende da edição: é uma decisão de arranque, não uma reacção contínua.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, edicaoId, chaveFolds, itensQ.data, edicaoQ.data]);

  useEffect(() => {
    if (foldsIniciados.current !== edicaoId) return;
    sessionStorage.setItem(chaveFolds, JSON.stringify(folds));
  }, [chaveFolds, edicaoId, folds]);

  /** Salta para a fase e abre o bloco onde o problema se resolve. */
  const irPara = (f: Fase, bloco?: string, ancora?: string) => {
    setFase(f);
    setAba("editor");
    if (!bloco) return;
    setFolds((x) => ({ ...x, [bloco]: true }));
    setTimeout(() => {
      const alvo = (ancora && document.getElementById(ancora)) || document.getElementById(`bloco-${bloco}`);
      alvo?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  /** Leva directamente ao cartão de uma notícia dentro de «A Atualidade». */
  const irNoticia = (noticiaId?: string | null) =>
    irPara("compor", "atualidade", noticiaId ? `noticia-${noticiaId}` : undefined);

  const ferramentasPreenchidas = (ferramentasQ.data ?? []).filter((f) => (f.nome ?? "").trim());
  const paragrafosCronica = (cronicaHtml.match(/<p[\s>]/gi) ?? []).length;

  type BloqueioFase = Bloqueio & { fase: Fase };
  const bloqueios: BloqueioFase[] = [];
  const irDefinicoes = () => irPara("publicar", "definicoes");
  if (assuntoLimpo.length < 10) {
    bloqueios.push({
      id: "assunto-curto", fase: "publicar", nivel: "grave", ir: irDefinicoes,
      texto: assuntoLimpo
        ? `O assunto do email é «${assuntoLimpo}» — demasiado curto para valer a abertura.`
        : "O assunto do email está por escrever.",
    });
  } else if (assuntoLimpo.length > 90) {
    bloqueios.push({
      id: "assunto-longo", fase: "publicar", nivel: "grave", ir: irDefinicoes,
      texto: `O assunto tem ${assuntoLimpo.length} caracteres — corta para 90 ou menos.`,
    });
  }
  // A apresentação pode herdar o título do conteúdo da crónica, tal como a
  // composição e a pré-visualização. Só há falta quando ambos estão vazios.
  if (cfg && !cfg.cronica_titulo.trim() && !cronicaTitulo.trim()) {
    bloqueios.push({ id: "cronica-titulo", fase: "compor", nivel: "grave", texto: "Falta o título da crónica.", ir: () => irPara("compor", "cronica") });
  }
  if (cfg && !cfg.cronica_url.trim()) {
    bloqueios.push({ id: "cronica-url", fase: "compor", nivel: "grave", texto: "Falta o endereço da crónica completa.", ir: () => irPara("compor", "cronica") });
  }
  if (cfg && !cfg.preheader.trim() && !cfg.cronica_lede.trim()) {
    bloqueios.push({ id: "preheader", fase: "publicar", nivel: "grave", texto: "Falta o pré-cabeçalho — é a linha que aparece a seguir ao assunto.", ir: irDefinicoes });
  }
  if (destaques.length < LIMITES_REVISTA.destaquesMin || destaques.length > LIMITES_REVISTA.destaquesMax) {
    bloqueios.push({
      id: "destaques", fase: "compor", nivel: "grave",
      texto: destaques.length < LIMITES_REVISTA.destaquesMin
        ? `${faltam(LIMITES_REVISTA.destaquesMin - destaques.length, "destaque", "destaques")} em «${ROTULOS_REVISTA.destaques}».`
        : `Tens ${plural(destaques.length, "destaque", "destaques")} — só entram ${LIMITES_REVISTA.destaquesMax}.`,
      ir: () => irPara("compor", "atualidade"),
    });
  }
  destaques.forEach((d, i) => {
    if (!d.resumo_factual.trim()) {
      bloqueios.push({ id: `resumo-${d.id}`, fase: "compor", nivel: "aviso", texto: `Falta o resumo factual do destaque ${i + 1}.`, ir: () => irNoticia(d.noticia_id) });
    }
    if (!d.minha_leitura.trim()) {
      bloqueios.push({ id: `leitura-${d.id}`, fase: "compor", nivel: "aviso", texto: `Falta «A minha leitura» do destaque ${i + 1}.`, ir: () => irNoticia(d.noticia_id) });
    }
  });
  if (radar.length < LIMITES_REVISTA.radarMin || radar.length > LIMITES_REVISTA.radarMax) {
    bloqueios.push({
      id: "radar", fase: "compor", nivel: "grave",
      texto: radar.length < LIMITES_REVISTA.radarMin
        ? `${faltam(LIMITES_REVISTA.radarMin - radar.length, "notícia", "notícias")} no Radar.`
        : `O Radar tem ${plural(radar.length, "notícia", "notícias")} — só entram ${LIMITES_REVISTA.radarMax}.`,
      ir: () => irPara("compor", "atualidade"),
    });
  }
  if (ferramentasPreenchidas.length > 0 && cfg && !cfg.bloco_ferramentas) {
    bloqueios.push({
      id: "ferramentas-off", fase: "compor", nivel: "aviso", impedeEnvio: false,
      texto: `Tens ${plural(ferramentasPreenchidas.length, "ferramenta preenchida", "ferramentas preenchidas")}, mas o bloco está de fora desta edição.`,
      ir: () => irPara("compor", "ferramentas"),
    });
  }

  const bloqueiosCompor = bloqueios.filter((b) => b.fase === "compor");
  // Lista que o cabeçalho e o modal de envio usam: os mesmos diagnósticos,
  // sem as recomendações que não impedem o envio.
  const problemas = bloqueios.filter((b) => b.impedeEnvio !== false).map((b) => b.texto);

  const fases: EstadoFase[] = [
    {
      id: "curar", nome: "Curar", concluida: propsPendentes.pendentes.length === 0,
      linha: propsPendentes.pendentes.length === 0
        ? "Nada por decidir"
        : `${propsPendentes.pendentes.length} por decidir`,
    },
    {
      id: "compor", nome: "Compor", concluida: bloqueiosCompor.length === 0,
      linha: bloqueiosCompor.length === 0
        ? "Edição completa"
        : plural(bloqueiosCompor.length, "ponto por resolver", "pontos por resolver"),
    },
    {
      id: "publicar", nome: "Publicar", concluida: edicaoQ.data?.estado === "enviada",
      linha: edicaoQ.data?.estado === "enviada"
        ? "Edição enviada"
        : bloqueios.length === 0
          ? "Pronta a enviar"
          : plural(bloqueios.length, "ponto por resolver", "pontos por resolver"),
      bloqueada: bloqueios.length > 0 && edicaoQ.data?.estado !== "enviada",
    },
  ];


  /** Estado de um bloco opcional: ligado e preenchido, ligado e incompleto, ou fora da edição. */
  const opcional = (activo: boolean, completo: boolean, resumoLinha: string, faltaLinha: string): ResumoBloco =>
    !activo
      ? { estado: "omitido", selo: "Não entra nesta edição", linha: "Bloco desligado — não aparece no email nem na página." }
      : completo
        ? { estado: "pronto", selo: "Pronto", linha: resumoLinha }
        : { estado: "falta", selo: "Não aparece ainda", linha: `${faltaLinha} Sem isso, não entra na pré-visualização.` };


  const editorUI = (
    <div className="space-y-4">
      <FitaFases fases={fases} activa={fase} onEscolher={setFase} />

      <AcompanhamentoFila />

      {fase !== "curar" && (
        <PainelBloqueios bloqueios={fase === "publicar" ? bloqueios : bloqueiosCompor} />
      )}

      {fase === "curar" && (
        <>
          <details className="rounded-2xl border border-border bg-card p-4" open>
            <summary className="min-h-11 cursor-pointer font-semibold">Notícias aprovadas na curadoria comum</summary>
            <CuradoriaNoticias paraEdicao={{ id: edicaoId, onSelecionada: () => { void qc.invalidateQueries({ queryKey: ["revista-aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["aprovadas", edicaoId] }); void qc.invalidateQueries({ queryKey: ["pendentes"] }); } }} />
          </details>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {contadores.map((c) => (
                <span key={c.rotulo} className="text-[13px] text-muted-foreground">
                  {c.rotulo} · <strong className="font-semibold text-foreground">{c.valor}</strong>
                </span>
              ))}
            </div>
            {notaLimite && <p className="mt-2 text-[13px] text-muted-foreground">{notaLimite}</p>}
          </div>

          <FilaEntrada />

          <BlocoEdicao

            id="pendentes" titulo="Pendentes de aprovação" icone={Inbox}
            aberto={folds.pendentes ?? true} alternar={alternar}
            resumo={propsPendentes.pendentes.length === 0
              ? { estado: "pronto", selo: "Sem fila", linha: "Não há notícias à espera de decisão." }
              : { estado: "falta", selo: `${propsPendentes.pendentes.length} por decidir`, linha: "Aprova, rejeita ou envia para o site." }}
          >
            <Pendentes {...propsPendentes} />
          </BlocoEdicao>

          <p className="px-1 text-[13px] text-muted-foreground">
            Quando a fila estiver tratada, passa a <strong className="font-semibold text-foreground">Compor</strong> para montar a edição.
          </p>
        </>
      )}

      {fase === "compor" && (
        <>
          <BlocoEdicao
            id="promocao" titulo="Promoção de abertura" icone={Megaphone}
            aberto={folds.promocao ?? false} alternar={alternar}
            accao={{
              rotulo: "Incluir nesta edição",
              desactivada: !!bloqueado || !!cfg?.promocao_activa,
              onClick: () => editar({ promocao_activa: true }),
            }}
            resumo={opcional(
              !!cfg?.promocao_activa,
              !!cfg?.promocao_link_texto.trim() && !!cfg?.promocao_url.trim(),
              `${cfg?.promocao_prefixo ? `${cfg.promocao_prefixo}: ` : ""}${cfg?.promocao_link_texto ?? ""}`,
              "Promoção ligada, mas falta o texto da ligação ou o endereço.",
            )}
          >
            {cfg && (
              <>
                <label className="flex items-center gap-3 text-[15px] text-foreground">
                  <input
                    type="checkbox" checked={cfg.promocao_activa}
                    onChange={(e) => editar({ promocao_activa: e.target.checked })}
                    disabled={!!bloqueado} className="h-4 w-4"
                  />
                  Incluir promoção nesta edição
                </label>
                <Campo etiqueta="Texto inicial" destino="ambos" valor={cfg.promocao_prefixo} onChange={(v) => editar({ promocao_prefixo: v })} dica="Por exemplo: Novo curso." />
                <Campo etiqueta="Texto da ligação" destino="ambos" valor={cfg.promocao_link_texto} onChange={(v) => editar({ promocao_link_texto: v })} />
                <Campo etiqueta="URL" destino="ambos" mono valor={cfg.promocao_url} onChange={(v) => editar({ promocao_url: v })} />
                <button
                  type="button" disabled={!!bloqueado}
                  onClick={() => editar({ ...VALORES_PROMOCAO })}
                  className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Repor o curso habitual
                </button>
              </>
            )}
          </BlocoEdicao>

          <BlocoEdicao
            id="cronica" numero={1} titulo="Crónica / abertura" icone={PenLine}
            aberto={folds.cronica ?? false} alternar={alternar}
            resumo={
              !cronicaTitulo.trim()
                ? { estado: "falta", selo: "Por escrever", linha: "Sem título nem texto — é o bloco que abre a edição." }
                : paragrafosCronica === 0
                  ? { estado: "falta", selo: "Só o título", linha: `«${recortar(cronicaTitulo, 60)}» · texto por escrever` }
                  : { estado: "pronto", selo: "Pronto", linha: `«${recortar(cronicaTitulo, 60)}» · ${plural(paragrafosCronica, "parágrafo", "parágrafos")}` }
            }
          >
            {cfg && (
              <>
                <Subgrupo titulo="Conteúdo da crónica" nota="O texto que também alimenta a página web e o arquivo.">
                  <div>
                    <Campo
                      etiqueta="Título da crónica" valor={cronicaTitulo}
                      onChange={setCronicaTitulo}
                      destino="ambos"
                    />
                    <EstadoGravacao api={cronicaTituloAS} />
                  </div>
                  <div>
                    <span className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-muted-foreground">Texto da crónica</span>
                      <SeloDestino destino="site" />
                    </span>
                    <CronicaEditor
                      key={`cronica-${edicaoId}`}
                      html={cronicaHtml} disabled={!!bloqueado || !cronicaPronta}
                      pronto={cronicaPronta}
                      onChange={setCronicaHtml}
                      autoSaveEstado={cronicaCorpoAS.estado}
                      autoSaveErr={cronicaCorpoAS.err}
                      onRepetir={() => { void cronicaCorpoAS.repetir(); }}
                      barraAvancada
                      accent="#4F46E5" line="#E4E7EC" ink="#101828" muted="#667085" card="#F9FAFB" shell="#FFFFFF"
                    />
                    {!cronicaPronta && (
                      <p className="mt-1.5 text-[12px] text-muted-foreground">A carregar a crónica guardada…</p>
                    )}
                  </div>
                  <div>
                    <Campo
                      etiqueta="Leituras recomendadas" area linhas={4} valor={cronicaLeituras}
                      onChange={setCronicaLeituras}
                      destino="ambos"
                      dica="Um link por linha."
                    />
                    <EstadoGravacao api={cronicaLeiturasAS} />
                  </div>
                </Subgrupo>

                <Subgrupo id="apresentacao" resumo={cfg.cronica_excerto.trim() ? `Excerto: ${dividirParagrafos(cfg.cronica_excerto).length} parágrafos · ${contarPalavras(cfg.cronica_excerto)} palavras` : "Excerto automático (início da crónica)"} titulo="Apresentação Revista" nota="Como a abertura aparece no email e na versão web.">
                  <PropostaApresentacao
                    edicaoId={edicaoId} cfg={cfg} cronicaHtml={cronicaHtml}
                    editar={editar} bloqueado={!!bloqueado || !cronicaPronta}
                  />
                  <Campo etiqueta="Título principal" destino="ambos" valor={cfg.cronica_titulo} onChange={(v) => editar({ cronica_titulo: v })} />
                  <Campo etiqueta="Segunda linha (opcional)" destino="ambos" valor={cfg.cronica_subtitulo} onChange={(v) => editar({ cronica_subtitulo: v })} />
                  <div>
                    <Campo id={ID_EXCERTO} etiqueta="Excerto da crónica" destino="email" area linhas={6} valor={cfg.cronica_excerto} onChange={(v) => editar({ cronica_excerto: v })} dica={cfg.cronica_excerto.trim() ? "Uma linha em branco separa parágrafos." : "Vazio: a pré-visualização usa o início da crónica. Preenche aqui para personalizar."} />
                    <AvisoCampo texto={avisoExcerto} />
                  </div>
                  <Campo etiqueta="URL da crónica completa" destino="email" mono valor={cfg.cronica_url} onChange={(v) => editar({ cronica_url: v })} dica={cfg.cronica_url.trim() ? undefined : "Ainda sem endereço no site — o botão «Ler a crónica completa» não aparece. Cria o rascunho em «Publicar → Destinos»."} />
                </Subgrupo>

                <Subgrupo
                  id="imagem" resumo={cfg.cronica_imagem_url ? "Com imagem" : "Sem imagem"}
                  titulo="Imagem da crónica (opcional)"
                  nota="Carrega do computador ou procura no Pexels. Sai a toda a largura, em 3:1, no início da crónica — antes da lede."
                >
                  <ImagemCronica edicaoId={edicaoId} cfg={cfg} editar={editar} bloqueado={!!bloqueado} />
                </Subgrupo>

                <Subgrupo
                  id="pecas" resumo={`${[cfg.cronica_lede.trim(), cfg.pull_quote.trim(), cfg.momento_activo].filter(Boolean).length} de 3 peças activas`}
                  titulo="Peças móveis da crónica"
                  nota="Lede, frase de destaque e momento editorial sobem e descem entre os parágrafos."
                >
                  <PropostaPecasCronica
                    edicaoId={edicaoId} cfg={cfg} editar={editar}
                    excerto={cfg.cronica_excerto.trim() ? cfg.cronica_excerto : excertoDaCronica(cronicaHtml)}
                    bloqueado={!!bloqueado || !cronicaPronta}
                  />
                  <OrdemPecasCronica cfg={cfg} editar={editar} bloqueado={!!bloqueado} avisoLede={avisoLede} irParaParagrafo={irParaParagrafo} cronicaHtml={cronicaHtml} />
                </Subgrupo>
              </>
            )}
          </BlocoEdicao>

          <BlocoEdicao
            id="atualidade" numero={2} titulo="A Atualidade" icone={Layers}
            aberto={folds.atualidade ?? false} alternar={alternar}
            resumo={
              destaques.length >= LIMITES_REVISTA.destaquesMin && radar.length >= LIMITES_REVISTA.radarMin
                ? {
                    estado: "pronto",
                    selo: "Pronto",
                    linha: `${plural(destaques.length, "destaque", "destaques")} · ${radar.length} no Radar · ${soSite.length} só no site`,
                  }
                : {
                    estado: "falta",
                    selo: `Faltam ${Math.max(0, LIMITES_REVISTA.destaquesMin - destaques.length) + Math.max(0, LIMITES_REVISTA.radarMin - radar.length)}`,
                    linha: `${destaques.length} de ${LIMITES_REVISTA.destaquesMin}–${LIMITES_REVISTA.destaquesMax} destaques · ${radar.length} de ${LIMITES_REVISTA.radarMin}–${LIMITES_REVISTA.radarMax} no Radar · ${soSite.length} só no site`,
                  }
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {ROTULOS_REVISTA.destaques} ({LIMITES_REVISTA.destaquesMin} a {LIMITES_REVISTA.destaquesMax} lugares)
                </p>
                <Ranhuras
                  total={LIMITES_REVISTA.destaquesMax}
                  minimo={LIMITES_REVISTA.destaquesMin}
                  ocupadas={destaques.map((d) => ({
                    id: d.noticia_id,
                    titulo: d.titulo_override?.trim() || d.noticia?.titulo || "—",
                    etiqueta: !d.resumo_factual.trim() || !d.minha_leitura.trim() ? "Falta texto editorial" : undefined,
                  }))}
                  textoVazio="Lugar por preencher"
                  accaoVazia="Escolher" accaoOcupada="Abrir"
                  onEscolher={(_, item) => irNoticia(item?.id)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Radar ({LIMITES_REVISTA.radarMin} a {LIMITES_REVISTA.radarMax} lugares)
                </p>
                <Ranhuras
                  total={LIMITES_REVISTA.radarMax}
                  minimo={LIMITES_REVISTA.radarMin}
                  ocupadas={radar.map((r) => ({
                    id: r.noticia_id,
                    titulo: r.titulo_override?.trim() || r.noticia?.titulo || "—",
                  }))}
                  textoVazio="Lugar por preencher"
                  accaoVazia="Escolher" accaoOcupada="Abrir"
                  onEscolher={(_, item) => irNoticia(item?.id)}
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ordem no email
              </p>
              <ResumoOrdem
                destaques={destaques.map((d) => ({ id: d.id, titulo: d.titulo_override?.trim() || d.noticia?.titulo || "—" }))}
                radar={radar.map((r) => ({ id: r.id, titulo: r.titulo_override?.trim() || r.noticia?.titulo || "—" }))}
                onReordenar={reordenarEmail}
              />
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Briefs desta edição
              </p>
              <BriefsDaEdicao
                briefs={briefs} bloqueado={!!bloqueado}
                carregando={briefsQ.isFetching} accoes={accoesBriefs}
              />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rever leituras
              </p>
              <ReverLeituras briefs={briefs} bloqueado={!!bloqueado} accoes={accoesBriefs} />
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notícias aprovadas por categoria
              </p>
              <Atualidade
                aprovadas={aprovadas} itens={itens} bloqueado={!!bloqueado}
                selosBrief={selosBrief}
                accoes={{
                  definirPapel,
                  reordenar: (ids) => mOrdemNoticias.mutate(ids),
                  patchItem: (id, patch) => mPatch.mutate({ id, patch }),
                  patchNoticia: (id, patch) => mPatchNoticia.mutate({ id, patch: patch as Record<string, string> }),
                  removerNoticia: (id) => mRemoverNoticia.mutate(id),
                }}
              />
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {soSite.length === 0
                ? "Todas as notícias aprovadas seguem no email."
                : `${soSite.length === 1 ? "A restante notícia aparece" : `As restantes ${soSite.length} notícias aparecem`} na edição web completa desta edição.`}
            </p>
          </BlocoEdicao>

          <Grupo titulo="Conteúdos da semana" />

          <Podcast
            episodios={episodiosQ.data ?? []}
            episodioActivoId={edicaoQ.data?.episodio_podcast_id ?? null}
            bloqueado={!!bloqueado}
            feedUrl={feedQ.data ?? ""}
            aSincronizarFeed={mSincronizarPodcast.isPending}
            onSincronizar={() => mSincronizarPodcast.mutate()}
            onEscolher={(ep) => mEscolherEp.mutate(ep)}
            mostrarTodosEpisodios={mostrarTodosEpisodios}
            setMostrarTodosEpisodios={setMostrarTodosEpisodios}
            foldOpen={folds}
            setFoldOpen={setFolds}
            aviso={(() => {
              const ep = (episodiosQ.data ?? []).find((e) => e.id === edicaoQ.data?.episodio_podcast_id);
              if (!ep || !cfg) return null;
              const usado = cfg.recomendacao_titulo === ep.titulo && cfg.recomendacao_url === (ep.url ?? "");
              if (usado) {
                return (
                  <p className="text-[13px] text-muted-foreground">
                    Este episódio é a recomendação desta edição e aparece no email.
                  </p>
                );
              }
              return (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-amber-700">
                  <span>Este episódio ainda não entra no email desta edição.</span>
                  <button
                    type="button"
                    disabled={!!bloqueado}
                    onClick={() => editar({ ...patchDoPodcast(ep), ...patchBlocoPodcast(ep) })}

                    className="rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    Usar em «Esta semana recomendo»
                  </button>
                </div>
              );
            })()}
          />

          <BlocoEdicao
            id="bloco_podcast" numero={3} titulo="Bloco do podcast" icone={Mic}
            aberto={folds.bloco_podcast ?? false} alternar={alternar}
            accao={{ rotulo: "Incluir nesta edição", desactivada: !!bloqueado, onClick: () => editar({ podcast_activo: true }) }}
            resumo={opcional(
              !!cfg?.podcast_activo,
              !!cfg?.podcast_tema.trim(),
              `${cfg?.podcast_programa || "Podcast"} · «${(cfg?.podcast_tema ?? "").slice(0, 55)}»`,
              "Bloco ligado, mas falta o tema do episódio.",
            )}
          >
            {cfg && (
              <>
                {(() => {
                  const ep = (episodiosQ.data ?? []).find((e) => e.id === edicaoQ.data?.episodio_podcast_id) ?? null;
                  const sincronizado = !!ep
                    && cfg.podcast_tema === temaDoEpisodio(ep.titulo)
                    && cfg.podcast_url === (ep.url ?? "");
                  return (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
                      <p className={`text-[13px] ${ep && !sincronizado ? "text-amber-700" : "text-muted-foreground"}`}>
                        {!ep
                          ? "Escolhe primeiro um episódio acima — o conteúdo deste bloco é preenchido a partir dele e pode depois ser alterado ou apagado."
                          : sincronizado
                            ? `Preenchido a partir do episódio «${recortar(ep.titulo, 60)}». Podes editar, acrescentar ou apagar qualquer campo.`
                            : `Os campos já foram alterados à mão e não correspondem ao episódio «${recortar(ep.titulo, 60)}».`}
                      </p>
                      <button
                        type="button"
                        disabled={!!bloqueado || !ep}
                        onClick={() => { if (ep) editar(patchBlocoPodcast(ep)); }}
                        className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Repor a partir do episódio escolhido
                      </button>
                    </div>
                  );
                })()}
                <label className="flex items-center gap-3 text-[15px] text-foreground">
                  <input
                    type="checkbox" checked={cfg.podcast_activo}
                    onChange={(e) => editar({ podcast_activo: e.target.checked })}
                    className="h-5 w-5 accent-[hsl(var(--primary))]"
                  />
                  Mostrar o bloco amarelo do podcast
                </label>
                <Campo etiqueta="Etiqueta" valor={cfg.podcast_etiqueta} onChange={(v) => editar({ podcast_etiqueta: v })} dica="Por exemplo: Podcast semanal." />
                <Campo etiqueta="Nome do programa" valor={cfg.podcast_programa} onChange={(v) => editar({ podcast_programa: v })} />
                <Campo etiqueta="Tema do episódio" valor={cfg.podcast_tema} onChange={(v) => editar({ podcast_tema: v })} />
                <Campo etiqueta="Convidado (opcional)" valor={cfg.podcast_convidado} onChange={(v) => editar({ podcast_convidado: v })} />
                <Campo etiqueta="Breve descrição (opcional)" area linhas={2} valor={cfg.podcast_pergunta} onChange={(v) => editar({ podcast_pergunta: v })} />
                <Campo etiqueta="URL" mono valor={cfg.podcast_url} onChange={(v) => editar({ podcast_url: v })} />
                <Campo etiqueta="Texto do botão" valor={cfg.podcast_cta} onChange={(v) => editar({ podcast_cta: v })} />
              </>
            )}
          </BlocoEdicao>

          <BlocoEdicao
            id="recomendo" numero={4} titulo="Esta semana recomendo" icone={Sparkles}
            aberto={folds.recomendo ?? false} alternar={alternar}
            accao={{
              rotulo: "Incluir nesta edição",
              desactivada: !!bloqueado || !!cfg?.recomendacao_activa,
              onClick: () => editar({ recomendacao_activa: true }),
            }}
            resumo={opcional(
              cfg?.recomendacao_activa !== false,
              !!(cfg?.recomendacao_titulo ?? "").trim(),
              `${cfg?.recomendacao_tipo || "Recomendação"} · «${(cfg?.recomendacao_titulo ?? "").slice(0, 55)}»`,
              "Bloco ligado, mas sem recomendação escolhida.",
            )}
          >
            {cfg && (
              <>
                <label className="flex items-center gap-3 text-[15px] text-foreground">
                  <input
                    type="checkbox" checked={cfg.recomendacao_activa}
                    onChange={(e) => editar({ recomendacao_activa: e.target.checked })}
                    disabled={!!bloqueado} className="h-4 w-4"
                  />
                  Incluir «Esta semana recomendo» nesta edição
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">Tipo</span>
                  <select
                    className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] text-foreground"
                    value={cfg.recomendacao_tipo}
                    onChange={(e) => editar({ recomendacao_tipo: e.target.value })}
                  >
                    <option value="">—</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                {(() => {
                  const ep = (episodiosQ.data ?? []).find((e) => e.id === edicaoQ.data?.episodio_podcast_id);
                  const ferramentas = ferramentasPreenchidas;
                  if (!ep && ferramentas.length === 0) return null;
                  const origem = cfg.recomendacao_tipo === "Podcast" && ep
                    ? { titulo: ep.titulo, url: ep.url ?? "" }
                    : cfg.recomendacao_tipo === "Ferramenta"
                      ? (() => {
                          const f = ferramentas.find((x) => (x.nome ?? "") === cfg.recomendacao_titulo)
                            ?? (ferramentas.length === 1 ? ferramentas[0] : null);
                          return f ? { titulo: f.nome ?? "", url: f.url ?? "" } : null;
                        })()
                      : null;
                  const sincronizado = !!origem
                    && origem.titulo === cfg.recomendacao_titulo
                    && origem.url === cfg.recomendacao_url;
                  return (
                    <div className="space-y-2">
                      {origem && (
                        <p className={`text-[13px] ${sincronizado ? "text-muted-foreground" : "text-amber-700"}`}>
                          {sincronizado
                            ? "Sincronizado com a seleção desta edição."
                            : "Os campos foram editados à mão e já não correspondem à seleção — usa «Atualizar da seleção» para repor."}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {ep && (
                          <button
                            type="button"
                            onClick={() => editar({ ...patchDoPodcast(ep), ...patchBlocoPodcast(ep) })}
                            className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted"
                          >
                            {cfg.recomendacao_tipo === "Podcast" && !sincronizado
                              ? "Atualizar da seleção (podcast)"
                              : "Usar o podcast escolhido"}
                          </button>
                        )}
                        {ferramentas.map((f) => (
                          <button
                            key={f.id} type="button"
                            onClick={() => editar({
                              recomendacao_tipo: "Ferramenta",
                              recomendacao_titulo: f.nome ?? "",
                              recomendacao_url: f.url ?? "",
                              recomendacao_nota: f.descricao ?? "",
                            })}
                            className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-foreground hover:bg-muted"
                          >
                            Usar «{(f.nome ?? "").slice(0, 24)}»
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <Campo etiqueta="Metadado curto (opcional)" valor={cfg.recomendacao_meta} onChange={(v) => editar({ recomendacao_meta: v })} dica="Por exemplo: 42 min." />
                <Campo etiqueta="Título" valor={cfg.recomendacao_titulo} onChange={(v) => editar({ recomendacao_titulo: v })} />
                <Campo etiqueta="URL" mono valor={cfg.recomendacao_url} onChange={(v) => editar({ recomendacao_url: v })} />
                <Campo etiqueta="Nota editorial" area linhas={3} valor={cfg.recomendacao_nota} onChange={(v) => editar({ recomendacao_nota: v })} />
              </>
            )}
          </BlocoEdicao>

          <BlocoEdicao
            id="ferramentas" numero={5} titulo="Ferramenta da semana" icone={Wrench}
            aberto={folds.ferramentas ?? false} alternar={alternar}
            accao={{
              rotulo: "Incluir nesta edição",
              desactivada: !!bloqueado || !!cfg?.bloco_ferramentas,
              onClick: () => editar({ bloco_ferramentas: true }),
            }}
            resumo={
              cfg && !cfg.bloco_ferramentas
                ? {
                    estado: "omitido",
                    selo: "Não entra nesta edição",
                    linha: ferramentasPreenchidas.length > 0
                      ? `${plural(ferramentasPreenchidas.length, "ferramenta preenchida", "ferramentas preenchidas")}, mas o bloco está desligado.`
                      : "Bloco desligado — não aparece no email nem na página.",
                  }
                : ferramentasPreenchidas.length > 0
                  ? { estado: "pronto", selo: "Pronto", linha: recortar(ferramentasPreenchidas.map((f) => f.nome).join(" · "), 90) }
                  : { estado: "vazio", selo: "Por preencher", linha: "Bloco ligado, mas sem nenhuma ferramenta escrita." }
            }
          >
            {cfg && (
              <label className="mb-4 flex items-center gap-3 text-[15px] text-foreground">
                <input
                  type="checkbox" checked={cfg.bloco_ferramentas}
                  onChange={(e) => editar({ bloco_ferramentas: e.target.checked })}
                  disabled={!!bloqueado} className="h-4 w-4"
                />
                Incluir a ferramenta da semana nesta edição
              </label>
            )}
            <FerramentasSemana edicaoId={edicaoId} bloqueado={!!bloqueado} onAcao={() => bump()} />
          </BlocoEdicao>


          <BlocoEdicao
            id="servicos" numero={6} titulo="Como te posso ajudar" icone={Briefcase}
            aberto={folds.servicos ?? false} alternar={alternar}
            resumo={cfg ? (() => {
              const activos = [cfg.servicos_cursos_activo, cfg.servicos_consultoria_activo, cfg.servicos_auditoria_activo, cfg.livro_activo].filter(Boolean).length;
              return activos > 0
                ? { estado: "pronto", selo: "Pronto", linha: `${activos} de 4 itens entram nesta edição` }
                : { estado: "omitido", selo: "Não entra", linha: "Nenhum item entra nesta edição" };
            })() : { estado: "vazio", selo: "A carregar", linha: "A carregar itens…" }}
          >
            {cfg && (
              <>
                <Campo etiqueta="Título" valor={cfg.servicos_titulo} onChange={(v) => editar({ servicos_titulo: v })} />
                <div className="space-y-3">
                  <details className="rounded-lg border border-border bg-background p-4" open>
                    <summary className="cursor-pointer font-semibold text-foreground">Formação executiva</summary>
                    <div className="mt-4 space-y-4">
                      <label className="flex items-center gap-3 text-[14px] text-foreground"><input type="checkbox" checked={cfg.servicos_cursos_activo} disabled={!!bloqueado} onChange={(e) => editar({ servicos_cursos_activo: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--primary))]" />Incluir nesta edição</label>
                      <Campo etiqueta="Texto" area linhas={2} valor={cfg.servicos_cursos_texto} onChange={(v) => editar({ servicos_cursos_texto: v })} />
                      <Campo etiqueta="Texto da ligação" valor={cfg.servicos_cursos_cta} onChange={(v) => editar({ servicos_cursos_cta: v })} />
                      <Campo etiqueta="URL" mono valor={cfg.servicos_cursos_url} onChange={(v) => editar({ servicos_cursos_url: v })} />
                    </div>
                  </details>
                  <details className="rounded-lg border border-border bg-background p-4">
                    <summary className="cursor-pointer font-semibold text-foreground">Consultoria</summary>
                    <div className="mt-4 space-y-4">
                      <label className="flex items-center gap-3 text-[14px] text-foreground"><input type="checkbox" checked={cfg.servicos_consultoria_activo} disabled={!!bloqueado} onChange={(e) => editar({ servicos_consultoria_activo: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--primary))]" />Incluir nesta edição</label>
                      <Campo etiqueta="Texto" area linhas={2} valor={cfg.servicos_consultoria_texto} onChange={(v) => editar({ servicos_consultoria_texto: v })} />
                      <Campo etiqueta="Texto da ligação" valor={cfg.servicos_consultoria_cta} onChange={(v) => editar({ servicos_consultoria_cta: v })} />
                      <Campo etiqueta="URL" mono valor={cfg.servicos_consultoria_url} onChange={(v) => editar({ servicos_consultoria_url: v })} />
                    </div>
                  </details>
                  <details className="rounded-lg border border-border bg-background p-4">
                    <summary className="cursor-pointer font-semibold text-foreground">Auditoria digital</summary>
                    <div className="mt-4 space-y-4">
                      <label className="flex items-center gap-3 text-[14px] text-foreground"><input type="checkbox" checked={cfg.servicos_auditoria_activo} disabled={!!bloqueado} onChange={(e) => editar({ servicos_auditoria_activo: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--primary))]" />Incluir nesta edição</label>
                      <Campo etiqueta="Texto" area linhas={2} valor={cfg.servicos_intro} onChange={(v) => editar({ servicos_intro: v })} />
                      <Campo etiqueta="Texto da ligação" valor={cfg.servicos_cta} onChange={(v) => editar({ servicos_cta: v })} />
                      <Campo etiqueta="URL" mono valor={cfg.servicos_url} onChange={(v) => editar({ servicos_url: v })} />
                    </div>
                  </details>
                  <details className="rounded-lg border border-border bg-background p-4">
                    <summary className="cursor-pointer font-semibold text-foreground">Livro</summary>
                    <div className="mt-4 space-y-4">
                      <label className="flex items-center gap-3 text-[14px] text-foreground"><input type="checkbox" checked={cfg.livro_activo} disabled={!!bloqueado} onChange={(e) => editar({ livro_activo: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--primary))]" />Incluir nesta edição</label>
                      <Campo etiqueta="Etiqueta" valor={cfg.livro_etiqueta} onChange={(v) => editar({ livro_etiqueta: v })} />
                      <Campo etiqueta="Título" valor={cfg.livro_titulo} onChange={(v) => editar({ livro_titulo: v })} />
                      <Campo etiqueta="Texto" area linhas={3} valor={cfg.livro_texto} onChange={(v) => editar({ livro_texto: v })} />
                      <Campo etiqueta="Texto da ligação" valor={cfg.livro_cta} onChange={(v) => editar({ livro_cta: v })} />
                      <Campo etiqueta="URL" mono valor={cfg.livro_url} onChange={(v) => editar({ livro_url: v })} />
                    </div>
                  </details>
                </div>
                <button
                  type="button"
                  onClick={() => editar({ ...VALORES_SERVICOS, ...VALORES_LIVRO })}
                  className="self-start rounded-lg border border-border px-3 py-2 text-[13.5px] text-muted-foreground hover:bg-muted"
                >
                  Repor valores habituais
                </button>
              </>
            )}
          </BlocoEdicao>
        </>
      )}

      {fase === "publicar" && (
        <>
          <PainelDestinos
            edicaoId={edicaoId}
            numero={numero}
            cronicaUrl={cfg?.cronica_url ?? ""}
            bloqueado={!!bloqueado}
            onUrlGuardado={(u) => setCfg((c) => (c ? { ...c, cronica_url: u } : c))}
          />

          <BlocoEdicao
            id="definicoes" titulo="Assunto e pré-cabeçalho" icone={Settings2}
            aberto={folds.definicoes ?? false} alternar={alternar}
            resumo={bloqueios.filter((b) => b.fase === "publicar").length === 0
              ? { estado: "pronto", selo: "Pronto", linha: `«${recortar(assuntoLimpo, 70)}»` }
              : { estado: "falta", selo: "Por afinar", linha: assuntoLimpo ? `«${recortar(assuntoLimpo, 70)}»` : "Sem assunto — é o que decide se o email é aberto." }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Assunto do email</p>
                <span className="text-[12.5px] text-muted-foreground">
                  {assuntoAS.estado === "a-guardar" ? "A guardar…" : assuntoAS.err ? "Erro ao guardar" : assuntoAS.estado === "guardado" ? "Guardado" : ""}
                </span>
              </div>
              <AssuntoField
                valor={assunto}
                onAlterar={setAssunto}
                bloqueado={!!bloqueado}
                edicaoId={edicaoId}
                preheader={cfg?.preheader}
                onAlterarPreheader={(v) => editar({ preheader: v })}
                onAplicouSugestao={() => bump()}
              />
            </div>
            {cfg && (
              <>
                <Campo
                  etiqueta="Preheader" destino="email" valor={cfg.preheader} onChange={(v) => editar({ preheader: v })}
                  dica="Se ficar vazio, é usado o lede da crónica."
                />
                <label className="flex items-center gap-3 text-[15px] text-foreground">
                  <input
                    type="checkbox" checked={cfg.bloco_ferramentas}
                    onChange={(e) => editar({ bloco_ferramentas: e.target.checked })}
                    className="h-5 w-5 accent-[hsl(var(--primary))]"
                  />
                  Incluir o bloco de ferramentas da semana
                </label>
                <p className="text-[13px] text-muted-foreground">
                  Edição #{numero} · formato Revista. O número e a data vêm dos dados da edição.
                </p>
              </>
            )}
          </BlocoEdicao>
        </>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6">
      <CabecalhoRevista
        numero={numero}
        estado={((edicaoQ.data?.estado === "enviada"
          ? "enviada"
          : edicaoQ.data?.agendamento_estado === "agendado" ? "agendada" : "rascunho") as EstadoEdicao)}
        selo={selo}
        diagnosticos={bloqueios}
        gravacao={gravacaoGlobal}
        resumoLinks={linksResumo}
        aVerificarLinks={mLinks.isPending}
        onVerificarLinks={abrirLinks}
        onAbrirEnvio={() => { void abrirEnvioActualizado(); }}
        aPrepararEnvio={aPrepararEnvio}
        bloqueado={!!bloqueado}
        estadoWorkflow={prontidaoQ.data ? rotuloWorkflow(prontidaoQ.data.estadoWorkflow) : null}
      />

      <div className="mb-4 flex gap-2 lg:hidden">
        {(["editor", "preview"] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => setAba(t)}
            className={`flex-1 rounded-xl px-4 py-3 text-[15px] font-semibold ${aba === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {t === "editor" ? "Editor" : "Pré-visualização"}
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)]">
        <div className={aba === "editor" ? "" : "hidden lg:block"}>{editorUI}</div>
        <div className={aba === "preview" ? "" : "hidden lg:block"}>
          {/* Scroll próprio: a pré-visualização desce sem arrastar a coluna de edição. */}
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <Preview edicaoId={edicaoId} numero={numero} refreshKey={refreshKey} destino={destino} onDestinoChange={setDestino} />
          </div>
        </div>
      </div>

      {modalAdicionar && (
        <AdicionarNoticias
          edicaoId={edicaoId}
          isAdmin={isAdmin}
          nomeExibicao={nomeExibicao || "Editor"}
          notify={notificar}
          onFechar={() => setModalAdicionar(false)}
          onVerPendentes={() => propsPendentes.pendentesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
      )}

      {modalFontes && (
        <Fontes
          isAdmin={isAdmin}
          nomeExibicao={nomeExibicao || "Editor"}
          notify={notificar}
          onFechar={() => setModalFontes(false)}
        />
      )}

      <LimparAntigas
        aberto={modalLimpar}
        onAberto={setModalLimpar}
        nomeExibicao={nomeExibicao || "Editor"}
        antigasCount={propsPendentes.antigasCount}
      />

      <EnvioNewsletter

        aberto={modalEnvio}
        onAberto={setModalEnvio}
        edicaoId={edicaoId}
        numero={numero}
        isAdmin={isAdmin}
        problemas={problemas}
        revista
        onEnviado={() => { qc.invalidateQueries({ queryKey: ["edicao", edicaoId] }); bump(); }}
      />

      {modalLinks && (
        <ModalLinks
          items={linksItems}
          resumo={linksResumo}
          verificadoEm={linksEm}
          pending={mLinks.isPending}
          onClose={() => setModalLinks(false)}
          onReverificar={() => mLinks.mutate(true)}
          onEditar={(ctx) => {
            setModalLinks(false);
            const destino = ctx.tipo === "noticia" || ctx.tipo === "brief" ? "atualidade"
              : ctx.tipo === "cronica" ? "cronica"
              : ctx.tipo === "promocao" ? "promocao"
              : ctx.tipo === "recomendacao" ? "recomendo"
              : ctx.tipo === "ferramenta" ? "ferramentas" : "podcast";
            setFolds((f) => ({ ...f, [destino]: true }));
            setAba("editor");
            toast.info(`Abre «${ctx.titulo.slice(0, 40)}» na secção respectiva para corrigir o link.`);
          }}
        />
      )}

    </div>
  );

}
