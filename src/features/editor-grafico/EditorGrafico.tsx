import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BringToFront, ChevronsDown, ChevronsUp, Circle, Copy, Download,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Bold, CopyCheck, Highlighter, Magnet, Underline,
  ChevronDown, Eye, FileDown, Wand2, FileUp, Layers, Loader2, Maximize, Minus, MoreHorizontal, Play, Plus, Redo2, ScanSearch, SendToBack, Square, Trash2, Type, Undo2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { guardarRecuperacao, lerRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { renderProvaServidor } from "@/services/conteudos";
import { ALTURA, FAMILIAS, LARGURA, NOME_FAMILIA, aplicarMarca, layoutTexto, resolverTexto, validarPacote, type Asset, type Camada, type CamadaTexto, type Familia, type Medidor, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { lerDirecaoPreferida, guardarDirecaoPreferida, type DirecaoPreferida } from "@/services/estudio";
import { aplicarSistema, nomeVariante, obterPaleta, paginasComAjustes, recolorir, sistemaDoPacote, sistemaPadrao, tipografiaElemento, tipografiaDe, type SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { ESTILOS } from "../../../supabase/functions/_shared/motor/estilos";
import { PainelDirecaoVisual, type AlcanceUI } from "./PainelDirecaoVisual";
import { PainelImagemSlide } from "./PainelImagemSlide";
import { PainelRedesenhar } from "./PainelRedesenhar";
import { CHAVES_EFEITO, NOMES_EFEITO, efeitosAtivos, type OverrideEfeitos } from "../../../supabase/functions/_shared/motor/efeitos";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { construirPromptVisual, construirQueryVisual, inferirFonte } from "../../../supabase/functions/_shared/motor/promptVisual";
import { slideDaPagina } from "@/features/motor/variacoes";
import { PAPEIS, type ComposicaoImagem, type PapelVisual } from "../../../supabase/functions/_shared/motor/imagem";
import { carregarFicheiro, ficheiroDoArrasto } from "@/features/editor-grafico/carregar";
import { ABAS_INSERIR, MIME_INSERIR, PainelInserir, resolverBiblioteca, type AbaInserir, type Inserivel } from "@/features/editor-grafico/PainelInserir";
import { alinharNaPagina, alturaTexto, aplicarATodos, enquadrarTextos, fundoATodos, PRESETS_TAMANHO, tamanhoMais, type Alinhar } from "@/features/editor-grafico/operacoes";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { carregarImagens, carregarVideos, compararPng, renderizarPaginaPng } from "@/features/editor-grafico/desenho";
import { estadoInicial, reduzir, type Acao, type ModoImagemNova } from "@/features/editor-grafico/estado";
import { listarProjetos } from "@/services/estudio";
import { MapaCustos } from "@/features/motor/MapaCustos";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { MiniaturaOrdenavel } from "@/features/editor-grafico/MiniaturaOrdenavel";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/** Max fraction of pixels allowed to differ (per-channel tolerance 48) for browser/server equivalence. */
export const LIMIAR_EQUIVALENCIA = 0.01;
export const LIMIAR_PERDA_CONTEUDO = 0.0005;
export const LIMIAR_ZONA = 0.025;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;

const dataHora = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Honest names of the two real layouts composed by comporDocumentos (proposta.ts). */
/** Neutral labels: A and B are two compositions of the same narrative and may be customised, so no fixed style names. */
export const NOME_VARIANTE = { A: "Composição A", B: "Composição B" } as const;

function corToken(nome: string, recurso: string) {
  if (typeof window === "undefined") return recurso;
  const v = getComputedStyle(document.querySelector(".mc-estudio") ?? document.documentElement).getPropertyValue(nome).trim();
  return v ? `hsl(${v})` : recurso;
}

function descarregar(conteudo: Blob | string, nome: string) {
  const url = typeof conteudo === "string" ? conteudo : URL.createObjectURL(conteudo);
  const a = document.createElement("a");
  a.href = url; a.download = nome; a.click();
  if (typeof conteudo !== "string") setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function emCampo(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.getAttribute("role") === "combobox");
}

const CSS_FAMILIA: Record<Familia, string> = {
  worksans: '"Work Sans UI", sans-serif', montserrat: 'Montserrat, sans-serif', inter: 'Inter, sans-serif', playfair: '"Playfair Display", serif',
  sourcesans: '"Source Sans 3", sans-serif', grotesk: '"Space Grotesk", sans-serif', dmserif: '"DM Serif Display", serif', dmsans: '"DM Sans", sans-serif', plex: '"IBM Plex Sans", sans-serif',
};

// ---------- small form helpers ----------

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{rotulo}</Label>
      {children}
    </div>
  );
}

function Numero({ id, rotulo, valor, onMudar, min, max, passo = 1 }: { id: string; rotulo: string; valor: number; onMudar: (n: number) => void; min?: number; max?: number; passo?: number }) {
  const [txt, setTxt] = useState(String(valor));
  useEffect(() => setTxt(String(Math.round(valor * 100) / 100)), [valor]);
  const confirmar = () => {
    const n = Number(txt.replace(",", "."));
    if (!Number.isFinite(n)) { setTxt(String(valor)); return; }
    const v = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    if (v !== valor) onMudar(v); else setTxt(String(valor));
  };
  return (
    <Campo id={id} rotulo={rotulo}>
      <Input id={id} inputMode="decimal" className="h-11 lg:h-9 tabular-nums" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } }} step={passo} />
    </Campo>
  );
}

function CorCampo({ id, rotulo, valor, onMudar }: { id: string; rotulo: string; valor: string; onMudar: (c: string) => void }) {
  const [txt, setTxt] = useState(valor);
  useEffect(() => setTxt(valor), [valor]);
  return (
    <Campo id={id} rotulo={rotulo}>
      <div className="flex gap-2">
        <input aria-label={`${rotulo} (seletor)`} type="color" value={valor} onChange={(e) => onMudar(e.target.value)} className="h-11 w-11 lg:h-9 lg:w-9 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1" />
        <Input id={id} className="h-11 lg:h-9 font-mono uppercase" value={txt} maxLength={7}
          onChange={(e) => { setTxt(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onMudar(e.target.value.toLowerCase()); }}
          onBlur={() => setTxt(valor)} />
      </div>
    </Campo>
  );
}

// ---------- properties ----------

interface PropsPainel {
  pacote: PacoteProva;
  camada: Camada | null;
  fundo: string;
  medidor: Medidor;
  despachar: (a: Acao) => void;
  camadasPagina: Camada[];
  /** Playback of the selected sticker's animation (state lives in the editor). */
  reproduzir?: boolean;
  aCarregarAnimacao?: boolean;
  onReproduzir?: () => void;
}

const NOME_TIPO: Record<Camada["tipo"], string> = { texto: "Texto", imagem: "Imagem", forma: "Forma" };

/** Human layer label derived from real data (role from ref/id, short excerpt); ids/refs untouched. */
export function rotuloCamada(c: Camada, pacote: PacoteProva): { tipo: string; detalhe: string } {
  if (c.tipo === "texto") {
    const tipo = c.ref?.endsWith(".titulo") ? "Título" : c.id === "num" ? "Número da página" : "Texto";
    const bruto = c.ref ? (() => { const [sid, campo] = c.ref!.split("."); const s = pacote.conteudo.slides.find((x) => x.id === sid); return s ? String((s as unknown as Record<string, unknown>)[campo] ?? "") : ""; })() : String((c as unknown as { texto?: string }).texto ?? "");
    const t = bruto.replace(/\s+/g, " ").trim();
    return { tipo: c.nome ?? tipo, detalhe: t.length > 40 ? `${t.slice(0, 40)}…` : t };
  }
  return { tipo: c.nome ?? NOME_TIPO[c.tipo], detalhe: c.tipo === "forma" ? `${Math.round(c.w)}×${Math.round(c.h)}` : "" };
}

function PainelPropriedades({ pacote, camada: c, fundo, medidor, despachar, camadasPagina, onImagem, onSubstituirImagem, onFundoTodos, reproduzir = false, aCarregarAnimacao = false, onReproduzir }: PropsPainel & { onImagem?: () => void; onSubstituirImagem?: () => void; onFundoTodos?: () => void }) {
  if (!c) {
    return (
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Página</h3>
          <CorCampo id="fundo-pagina" rotulo="Fundo do slide" valor={fundo} onMudar={(cor) => despachar({ tipo: "fundo", cor })} />
          {onFundoTodos && <Button variant="outline" className="h-11 w-full lg:h-9" onClick={onFundoTodos}><CopyCheck className="mr-1.5 h-4 w-4" />Aplicar fundo a todos</Button>}
          {onImagem && <Button variant="outline" className="h-11 w-full lg:h-9" onClick={onImagem}><ScanSearch className="mr-1.5 h-4 w-4" />Escolher imagem de fundo…</Button>}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Camadas <span className="font-normal text-muted-foreground">(da frente para trás)</span></h3>
          <ul className="space-y-1">
            {[...camadasPagina].sort((a, b) => b.z - a.z).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => despachar({ tipo: "selecionar", id: x.id })}
                  className="flex min-h-11 lg:min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {x.tipo === "texto" ? <Type className="h-4 w-4 text-muted-foreground" /> : x.tipo === "imagem" ? <ScanSearch className="h-4 w-4 text-muted-foreground" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  {(() => { const r = rotuloCamada(x, pacote); return <span className="min-w-0 truncate" title={r.detalhe ? `${r.tipo}: ${r.detalhe}` : r.tipo}><span className="font-medium">{r.tipo}</span>{r.detalhe && <span className="text-muted-foreground"> · {r.detalhe}</span>}</span>; })()}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  const alterar = (patch: Partial<Camada>, agrupar?: string) => despachar({ tipo: "camada", id: c.id, patch, agrupar });
  const ref = c.tipo === "texto" && c.ref ? c.ref.split(".") as [string, "titulo" | "texto"] : null;
  const lay = c.tipo === "texto" ? layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, medidor) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold" title={rotuloCamada(c, pacote).detalhe || undefined}>{rotuloCamada(c, pacote).tipo}</h3>
        <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-8 lg:w-8" aria-label="Fechar seleção" onClick={() => despachar({ tipo: "selecionar", id: null })}><X className="h-4 w-4" /></Button>
      </div>

      {c.tipo === "texto" && (
        <section className="space-y-3">
          <Campo id="texto-camada" rotulo={ref ? "Texto (partilhado pelas variantes A e B)" : "Texto (só nesta variante)"}>
            <Textarea id="texto-camada" rows={5} className="text-base lg:text-sm"
              value={resolverTexto(c, pacote.conteudo)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "auto" }), 250)}
              onChange={(e) => ref
                ? despachar({ tipo: "texto", slide: ref[0], campo: ref[1], valor: e.target.value, agrupar: `t:${c.id}` })
                : alterar({ texto: e.target.value } as Partial<Camada>, `t:${c.id}`)} />
          </Campo>
          {lay && (lay.cortado || lay.tam < c.estilo.tam) && (
            <p className="text-xs text-muted-foreground" role="status">
              {lay.cortado ? "O texto não cabe na caixa e foi cortado com reticências." : `Reduzido para ${Math.round(lay.tam)} px para caber.`}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Numero id="tam" rotulo="Tamanho (px)" valor={c.estilo.tam} min={6} max={400} onMudar={(n) => alterar({ estilo: { ...c.estilo, tam: n } } as Partial<Camada>)} />
            <Campo id="familia" rotulo="Tipo de letra">
              <Select value={c.estilo.familia ?? "worksans"} onValueChange={(v) => alterar({ estilo: { ...c.estilo, familia: v as Familia } } as Partial<Camada>)}>
                <SelectTrigger id="familia" className="h-11 lg:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{FAMILIAS.map((f) => <SelectItem key={f} value={f}>{NOME_FAMILIA[f]}</SelectItem>)}</SelectContent>
              </Select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="peso" rotulo="Peso">
              <Select value={String(c.estilo.peso)} onValueChange={(v) => alterar({ estilo: { ...c.estilo, peso: Number(v) as 400 | 700 | 900 } } as Partial<Camada>)}>
                <SelectTrigger id="peso" className="h-11 lg:h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="400">Normal</SelectItem><SelectItem value="700">Negrito</SelectItem><SelectItem value="900">Black</SelectItem></SelectContent>
              </Select>
            </Campo>
            <Campo id="alinh" rotulo="Alinhamento">
              <ToggleGroup id="alinh" type="single" variant="outline" value={c.estilo.alinh} onValueChange={(v) => v && alterar({ estilo: { ...c.estilo, alinh: v as "esq" } } as Partial<Camada>)} className="justify-start">
                <ToggleGroupItem value="esq" aria-label="Alinhar à esquerda" className="h-11 w-11 lg:h-9 lg:w-9"><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="centro" aria-label="Centrar" className="h-11 w-11 lg:h-9 lg:w-9"><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
                <ToggleGroupItem value="dir" aria-label="Alinhar à direita" className="h-11 w-11 lg:h-9 lg:w-9"><AlignRight className="h-4 w-4" /></ToggleGroupItem>
              </ToggleGroup>
            </Campo>
          </div>
          <CorCampo id="cor-texto" rotulo="Cor do texto" valor={c.estilo.cor} onMudar={(cor) => alterar({ estilo: { ...c.estilo, cor } } as Partial<Camada>, `cor:${c.id}`)} />
        </section>
      )}

      {c.tipo === "imagem" && c.animacao_id && (
        <section className="space-y-3">
          <div className="rounded-[var(--mc-r-md)] border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium">Sticker animado</p>
            <p className="text-xs text-muted-foreground">A capa mantém o desenho estático; a animação será usada no MP4 deste slide.</p>
          </div>
          <Numero id="duracao-animacao" rotulo="Duração do slide (segundos)" valor={(c.duracao_ms ?? 5000) / 1000} min={0.5} max={60} passo={0.5} onMudar={(n) => alterar({ duracao_ms: Math.round(n * 1000) } as Partial<Camada>)} />
          <Button variant="outline" size="sm" className="w-full" disabled={!c.asset_id || aCarregarAnimacao} onClick={onReproduzir}>
            {aCarregarAnimacao ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : reproduzir ? <Square className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-4 w-4" />}
            {aCarregarAnimacao ? "A carregar…" : reproduzir ? "Parar" : "Ver animação"}
          </Button>
          {reproduzir && <p className="text-xs text-muted-foreground">A reprodução está a decorrer. Edição e arrasto ficam pausados até parar.</p>}
        </section>
      )}

      {c.tipo === "forma" && (
        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><CorCampo id="cor-forma" rotulo="Cor" valor={c.estilo.cor} onMudar={(cor) => alterar({ estilo: { ...c.estilo, cor } } as Partial<Camada>, `cor:${c.id}`)} /></div>
          {c.forma === "ret" && <Numero id="raio" rotulo="Cantos (px)" valor={c.estilo.raio ?? 0} min={0} max={540} onMudar={(n) => alterar({ estilo: { ...c.estilo, raio: n } } as Partial<Camada>)} />}
        </section>
      )}

      {c.tipo === "imagem" && (
        <section className="space-y-3">
          {onSubstituirImagem && <Button variant="outline" className="h-11 w-full lg:h-9" onClick={onSubstituirImagem}><ScanSearch className="mr-1.5 h-4 w-4" />Substituir imagem</Button>}
          <Campo id="recorte" rotulo="Enquadramento">
            <ToggleGroup id="recorte" type="single" variant="outline" value={c.recorte} onValueChange={(v) => v && alterar({ recorte: v as "cover" } as Partial<Camada>)} className="justify-start">
              <ToggleGroupItem value="cover" className="h-11 lg:h-9 px-3">Preencher</ToggleGroupItem>
              <ToggleGroupItem value="contain" className="h-11 lg:h-9 px-3">Mostrar tudo</ToggleGroupItem>
            </ToggleGroup>
          </Campo>
          {c.recorte === "cover" && (
            <div className="grid grid-cols-2 gap-3">
              <Numero id="foco-x" rotulo="Foco horizontal (%)" valor={Math.round((c.foco?.x ?? 0.5) * 100)} min={0} max={100} onMudar={(n) => alterar({ foco: { x: n / 100, y: c.foco?.y ?? 0.5 } } as Partial<Camada>)} />
              <Numero id="foco-y" rotulo="Foco vertical (%)" valor={Math.round((c.foco?.y ?? 0.5) * 100)} min={0} max={100} onMudar={(n) => alterar({ foco: { x: c.foco?.x ?? 0.5, y: n / 100 } } as Partial<Camada>)} />
            </div>
          )}
        </section>
      )}

      <details className="group rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="font-medium">Posição e tamanho</span>
          <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-muted-foreground">{Math.round(c.x)}, {Math.round(c.y)} · {Math.round(c.w)}×{Math.round(c.h)}</span>
          <span className="text-muted-foreground group-open:rotate-45" aria-hidden>+</span>
        </summary>
        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          <Numero id="x" rotulo="X" valor={c.x} min={-LARGURA} max={LARGURA * 2} onMudar={(n) => alterar({ x: n })} />
          <Numero id="y" rotulo="Y" valor={c.y} min={-ALTURA} max={ALTURA * 2} onMudar={(n) => alterar({ y: n })} />
          <Numero id="w" rotulo="Largura" valor={c.w} min={20} max={LARGURA * 2} onMudar={(n) => alterar({ w: n })} />
          <Numero id="h" rotulo="Altura" valor={c.h} min={20} max={ALTURA * 2} onMudar={(n) => alterar({ h: n })} />
        </div>
      </details>
      <details className="group rounded-md border border-border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="font-medium">Opacidade e opções avançadas</span>
          <span className="min-w-0 flex-1 truncate text-xs tabular-nums text-muted-foreground">{Math.round((c.opacidade ?? 1) * 100)}%{c.tipo === "texto" ? ` · entrelinha ${c.estilo.linha}` : ""}</span>
          <span className="text-muted-foreground group-open:rotate-45" aria-hidden>+</span>
        </summary>
        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          <Numero id="op" rotulo="Opacidade (%)" valor={Math.round((c.opacidade ?? 1) * 100)} min={0} max={100} onMudar={(n) => alterar({ opacidade: n / 100 })} />
          {c.tipo === "texto" && <Numero id="linha" rotulo="Entrelinha" valor={c.estilo.linha} min={0.8} max={3} passo={0.05} onMudar={(n) => alterar({ estilo: { ...c.estilo, linha: n } } as Partial<Camada>)} />}
        </div>
      </details>

      <section className="space-y-2">
        <h4 className="text-sm font-medium">Ordem e ações</h4>
        <div className="grid grid-cols-4 gap-2">
          <Button variant="outline" size="icon" className="h-11 w-full lg:h-9" aria-label="Trazer para a frente" title="Trazer para a frente" onClick={() => despachar({ tipo: "ordem", id: c.id, direcao: "topo" })}><BringToFront className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-11 w-full lg:h-9" aria-label="Subir uma camada" title="Subir uma camada" onClick={() => despachar({ tipo: "ordem", id: c.id, direcao: "frente" })}><ChevronsUp className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-11 w-full lg:h-9" aria-label="Descer uma camada" title="Descer uma camada" onClick={() => despachar({ tipo: "ordem", id: c.id, direcao: "tras" })}><ChevronsDown className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-11 w-full lg:h-9" aria-label="Enviar para trás" title="Enviar para trás" onClick={() => despachar({ tipo: "ordem", id: c.id, direcao: "fundo" })}><SendToBack className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 lg:h-9" onClick={() => despachar({ tipo: "duplicarCamada", id: c.id })}><Copy className="mr-1.5 h-4 w-4" />Duplicar</Button>
          <Button variant="outline" className="h-11 lg:h-9 text-destructive hover:text-destructive" onClick={() => despachar({ tipo: "apagarCamada", id: c.id })}><Trash2 className="mr-1.5 h-4 w-4" />Apagar</Button>
        </div>
      </section>
    </div>
  );
}

// ---------- comparison ----------

interface Comparacao { navegador: string; servidor: string; diferenca: string; fracao: number; perda: number; piorZona: number; ms: number }

// ---------- page ----------

export interface PropsEditorGrafico {
  pacoteInicial: PacoteProva;
  /** Local-recovery key (user + project + document); null disables local copies. */
  chaveLocal: string | null;
  titulo: ReactNode;
  seletor?: ReactNode;
  /** Persisted real work: imports must be real packages; no server comparison. */
  real?: boolean;
  estadoGravacao?: ReactNode;
  cabecalhoInicio?: ReactNode;
  menuExtra?: ReactNode;
  /** Opens the authorised image picker; resolves with a verified asset or null. */
  pedirImagem?: () => Promise<{ asset: Asset; nome: string } | null>;
  onAlterado?: (p: PacoteProva) => void;
  /** Optional strip above the editor header (e.g. the carousel stepper). */
  faixaTopo?: ReactNode;
  /** Real work: inline library + Kie in the Imagens rail. */
  projectId?: string;
  medidorSistema?: Medidor;
  /** A hand-composed document may already own its direction without an mc style preset. */
  direcaoPersonalizada?: string;
  alturaDisponivel?: number;
  compactarPaginaUnica?: boolean;
}

export function EditorGrafico({ pacoteInicial, chaveLocal, titulo, seletor, real = false, estadoGravacao, cabecalhoInicio, menuExtra, onAlterado, faixaTopo, pedirImagem, projectId, medidorSistema, direcaoPersonalizada, alturaDisponivel, compactarPaginaUnica }: PropsEditorGrafico) {
  const { user } = useAuth();
  const [compacto, setCompacto] = useState(() => typeof window !== "undefined" && window.innerWidth < 1180);
  const [estado, despachar] = useReducer(reduzir, pacoteInicial, estadoInicial);
  const { pacote, variante, pagina, selecao } = estado;
  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [erroFontes, setErroFontes] = useState<string | null>(null);
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  // Playback of animated stickers on the main canvas (drag/select/editing pauses while playing).
  const [reproduzir, setReproduzir] = useState(false);
  const [videos, setVideos] = useState<Record<string, HTMLVideoElement>>({});
  const videosRef = useRef<Record<string, HTMLVideoElement>>({});
  const [reproduzirACarregar, setReproduzirACarregar] = useState(false);
  /** Toggles sticker playback on the main canvas; videos are loaded lazily from the signed URLs. */
  const alternarReproducao = useCallback(async () => {
    if (reproduzir) {
      Object.values(videosRef.current).forEach((v) => v.pause());
      setReproduzir(false);
      return;
    }
    setReproduzirACarregar(true);
    try {
      const vs = await carregarVideos(pacote);
      videosRef.current = vs;
      setVideos(vs);
      setReproduzir(true);
    } catch { toast.error("Não foi possível carregar a animação."); }
    finally { setReproduzirACarregar(false); }
  }, [reproduzir, pacote]);
  // Leaving the page (or the editor) always stops playback, never leaves videos running.
  useEffect(() => {
    setReproduzir(false);
    Object.values(videosRef.current).forEach((v) => v.pause());
  }, [pagina, variante]);
  useEffect(() => () => { Object.values(videosRef.current).forEach((v) => v.pause()); }, []);
  const [zoom, setZoom] = useState<number | "ajustar">("ajustar");
  const [area, setArea] = useState({ w: 800, h: 800 });
  const [preview, setPreview] = useState(false);
  const [recuperavel, setRecuperavel] = useState<{ guardado_em: string; pacote: PacoteProva } | null>(null);
  const [comparando, setComparando] = useState(false);
  const [comparacao, setComparacao] = useState<Comparacao | null>(null);
  const [erroComparacao, setErroComparacao] = useState<string | null>(null);
  const [painelMovel, setPainelMovel] = useState<"pagina" | "camada" | AbaInserir>(() => (sistemaDoPacote(pacoteInicial) || direcaoPersonalizada ? "pagina" : "estilos"));
  const semDirecao = !sistemaDoPacote(pacoteInicial) && !direcaoPersonalizada;
  const [aba, setAba] = useState<AbaInserir | null>(semDirecao ? "estilos" : "texto");
  const [encaixe, setEncaixe] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [intervaloTexto, setIntervaloTexto] = useState<{ id: string; inicio: number; fim: number } | null>(null);
  const [selecoes, setSelecoes] = useState<string[]>([]);
  const [areaExterior, setAreaExterior] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const inicioExterior = useRef<{ x: number; y: number } | null>(null);
  const [aLargar, setALargar] = useState(false);
  const paginaRef = useRef<HTMLDivElement>(null);
  const [painelAberto, setPainelAberto] = useState(() => !sistemaDoPacote(pacoteInicial) && !direcaoPersonalizada);
  const [alturaVisual, setAlturaVisual] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const corSelecao = useMemo(() => corToken("--primary", "#6366f1"), []);

  const chave = user ? chaveLocal : null;
  const onImagem = pedirImagem ? () => { pedirImagem().then((r) => { if (r) despachar({ tipo: "adicionarImagem", asset: r.asset, nome: r.nome }); }).catch((e: Error) => toast.error(e.message)); } : undefined;

  const comDesfazer = (msg: string) => toast.success(msg, { action: { label: "Desfazer", onClick: () => despachar({ tipo: "desfazer" }) } });
  // ---------- visual direction: the document is the only source of truth ----------
  const mSis = medidorSistema ?? medidor ?? undefined;
  const [promptIA, setPromptIA] = useState<string | undefined>(undefined);
  const [subImagens, setSubImagens] = useState<{ aba: "biblioteca" | "fotos" | "giphy" | "carregar" | "ia"; n: number } | undefined>(undefined);
  const [imagemASubstituir, setImagemASubstituir] = useState<string | null>(null);
  const [modoNova, setModoNova] = useState<ModoImagemNova>("fundo");
  const [logoMarca, setLogoMarca] = useState<string | null>(null);
  useEffect(() => {
    if (!projectId) return;
    let vivo = true;
    listarProjetos().then((ps) => { if (vivo) setLogoMarca(ps.find((x) => x.id === projectId)?.logo_url ?? null); }).catch(() => undefined);
    return () => { vivo = false; };
  }, [projectId]);
  const usarLogoMarca = async () => {
    if (!logoMarca || !projectId) return;
    const t = toast.loading("A colocar o logótipo…");
    try {
      const r = await fetch(logoMarca); if (!r.ok) throw new Error("Não foi possível obter o logótipo.");
      const b = await r.blob(); const nomeF = logoMarca.split("/").pop()?.split("?")[0] || "logotipo.png";
      const img = await carregarFicheiro(projectId, new File([b], nomeF, { type: b.type }));
      despachar({ tipo: "adicionarImagem", asset: img.asset, nome: "Logótipo", modo: "logo" }); toast.dismiss(t);
    } catch (e) { toast.error((e as Error).message, { id: t }); }
  };
  /** Session-only clipboard: a copied layer plus the assets it needs. */
  const copia = useRef<{ camada: Camada; assets: Record<string, Asset> } | null>(null);
  const copiar = () => {
    const c = paginaAtual?.camadas.find((x) => x.id === selecao);
    if (!c) return;
    const assets: Record<string, Asset> = c.tipo === "imagem" && pacote.assets?.[c.asset_id] ? { [c.asset_id]: pacote.assets[c.asset_id] } : {};
    copia.current = { camada: structuredClone(c), assets };
    toast.success("Elemento copiado. Ctrl/Cmd+V cola; Ctrl/Cmd+Alt+V cola só o estilo.");
  };
  const colar = () => { if (copia.current) despachar({ tipo: "colarCamada", camada: copia.current.camada, assets: copia.current.assets }); else toast.info("Nada copiado ainda."); };
  const colarEstilo = () => {
    const o = copia.current?.camada; const alvo = paginaAtual?.camadas.find((x) => x.id === selecao);
    if (!o || !alvo) { toast.info("Copia um elemento e seleciona outro do mesmo tipo."); return; }
    if (o.tipo !== alvo.tipo) { toast.info("Só é possível colar o estilo entre elementos do mesmo tipo."); return; }
    despachar({ tipo: "colarEstilo", id: alvo.id, origem: o });
  };
  const [redesenhar, setRedesenhar] = useState(false);
  const [avisoPagina, setAvisoPagina] = useState<string | null>(null);
  const sistemaDoc = useMemo(() =>…25608 tokens truncated…camada.nome}`).toBeLessThanOrEqual(1080);
    expect(camada.y + camada.h, `${i + 1}: ${camada.nome}`).toBeLessThanOrEqual(p.variantes.A.altura);
    if (camada.tipo === "texto") expect(layoutTexto(resolverTexto(camada, p.conteudo), camada.estilo, camada.w, camada.h, m, camada.marcas).cortado, `${i + 1}: ${camada.nome}`).toBe(false);
  }
}
describe("composição editorial da divulgação", () => {
  it("não corta palavras nem altera a leitura de rascunhos antigos", () => {
    const longo = { ...c, slides: c.slides.map((s, i) => i === 1 ? { ...s, texto: "Uma frase. ".repeat(30) } : s) };
    const antes = JSON.stringify(longo), depois = repartirParaLeitura(longo);
    expect(JSON.stringify(longo)).toBe(antes);
    const textos = depois.slides.filter(s => s.titulo === longo.slides[1].titulo).map(s => s.texto).join(" ");
    expect(normalizar(textos)).toBe(normalizar(longo.slides[1].texto));
    expect(() => verificarLeiturasLiterais(depois, fonte)).not.toThrow();
  });
  it("mantém os rascunhos anteriores válidos e apresenta opinião na primeira pessoa", () => {
    const antigo = { ...c, slides: c.slides.map(s => ({ ...s, titulo: s.titulo.replace("A minha leitura", "A leitura de Frederico Carvalho") })) };
    expect(() => verificarLeiturasLiterais(antigo, fonte)).not.toThrow();
    const p = comporCarrossel("id", antigo, fonte);
    expect(p.conteudo.slides.some(s => s.titulo.includes("leitura de Frederico"))).toBe(false);
    expect(p.variantes.A.paginas.some(p => p.papel === "concept")).toBe(true);
    expect(() => validarComposicao(p, "carrossel", "id")).not.toThrow();
  });
  it("os 10 slides cabem com as fontes reais, incluindo títulos e fontes originais", () => {
    verificarEncaixe(comporCarrossel("id", c, fonte));
    const antigo = { ...c, slides: c.slides.map((s, i) => i === 0 ? { ...s, titulo: "3 destaques para ler com outra perspetiva", texto: "Da edição #319 da DIGITALSPRINT: os factos, as fontes e a leitura de Frederico Carvalho. Desliza para explorar." } : s) };
    verificarEncaixe(comporCarrossel("id", antigo, fonte));
    const legadoCronica = { ...c, slides: [c.slides[0], { titulo: "Autonomia não significa bom senso", texto: "A investigação PixelLeak identificou mais de 13 mil imagens internas de empresas publicadas em repositórios públicos do GitHub. Os agentes não estavam a roubar: apenas a cumprir uma tarefa. Resolveram um problema técnico e criaram um problema de segurança. Em 93% dos casos, as imagens estavam fora da monitorização habitual das empresas.", fontes: [1] }, ...c.slides.slice(1)] };
    verificarEncaixe(comporCarrossel("id", repartirParaLeitura(legadoCronica), fonte));
  });
  it("o Story cabe, distingue a crónica e reserva espaço para o autocolante", () => {
    const p = comporStory("id", story, 319); verificarEncaixe(p);
    expect(p.variantes.A.altura).toBe(1920);
    expect(p.variantes.A.paginas[0].camadas.some(c => c.tipo === "texto" && c.texto === "Crónica")).toBe(true);
    expect(p.variantes.A.paginas[0].camadas.filter(c => c.tipo === "texto").every(c => c.y >= 250 && c.y + c.h <= 1690)).toBe(true);
  });
  it("a composição não se perde ao editar a legenda e deteta mudanças ao texto de origem", () => {
    expect(assinaturaComposicao("carrossel", fonte, c, story)).toBe(assinaturaComposicao("carrossel", fonte, { ...c, legenda: "Nova legenda" }, story));
    expect(assinaturaComposicao("story", fonte, c, story)).not.toBe(assinaturaComposicao("story", fonte, c, { ...story, titulo: "Outro título" }));
  });
  it("não aceita composições de outra peça, outro rascunho ou coordenadas inválidas", () => {
    const p = comporStory("id", story, 319);
    expect(() => validarComposicao(p, "story", "id")).not.toThrow();
    expect(() => validarComposicao(p, "carrossel", "id")).toThrow();
    expect(() => validarComposicao(p, "story", "outro")).toThrow();
    const invalido = structuredClone(p); invalido.variantes.A.paginas[0].camadas[0].w = NaN;
    expect(() => validarComposicao(invalido, "story", "id")).toThrow();
  });
  it("recusa mais de 20 slides em vez de apagar conteúdo", () => {
    const grande = { ...c, slides: Array.from({ length: 20 }, () => ({ titulo: "Argumento", texto: "Uma frase. ".repeat(30), fontes: [1] })) };
    expect(() => repartirParaLeitura(grande)).toThrow("Nada foi cortado");
  });
});
