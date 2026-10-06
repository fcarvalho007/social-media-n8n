import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BringToFront, ChevronsDown, ChevronsUp, Circle, Copy, Download,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Bold, CopyCheck, Highlighter, Magnet, Underline,
  ChevronDown, Eye, FileDown, Wand2, FileUp, Layers, Loader2, Maximize, Minus, MoreHorizontal, Plus, Redo2, ScanSearch, SendToBack, Square, Trash2, Type, Undo2, X,
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
import { aplicarSistema, nomeVariante, obterPaleta, paginasComAjustes, recolorir, sistemaDoPacote, sistemaPadrao, type SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { ESTILOS } from "../../../supabase/functions/_shared/motor/estilos";
import { PainelDirecaoVisual } from "./PainelDirecaoVisual";
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
import { alinharNaPagina, aplicarATodos, enquadrarTextos, fundoATodos, PRESETS_TAMANHO, tamanhoMais, type Alinhar } from "@/features/editor-grafico/operacoes";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { carregarImagens, compararPng, renderizarPaginaPng } from "@/features/editor-grafico/desenho";
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

function PainelPropriedades({ pacote, camada: c, fundo, medidor, despachar, camadasPagina, onImagem, onSubstituirImagem, onFundoTodos }: PropsPainel & { onImagem?: () => void; onSubstituirImagem?: () => void; onFundoTodos?: () => void }) {
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
}

export function EditorGrafico({ pacoteInicial, chaveLocal, titulo, seletor, real = false, estadoGravacao, cabecalhoInicio, menuExtra, onAlterado, faixaTopo, pedirImagem, projectId, medidorSistema }: PropsEditorGrafico) {
  const { user } = useAuth();
  const [compacto, setCompacto] = useState(() => typeof window !== "undefined" && window.innerWidth < 1180);
  const [estado, despachar] = useReducer(reduzir, pacoteInicial, estadoInicial);
  const { pacote, variante, pagina, selecao } = estado;
  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [erroFontes, setErroFontes] = useState<string | null>(null);
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  const [zoom, setZoom] = useState<number | "ajustar">("ajustar");
  const [area, setArea] = useState({ w: 800, h: 800 });
  const [preview, setPreview] = useState(false);
  const [recuperavel, setRecuperavel] = useState<{ guardado_em: string; pacote: PacoteProva } | null>(null);
  const [comparando, setComparando] = useState(false);
  const [comparacao, setComparacao] = useState<Comparacao | null>(null);
  const [erroComparacao, setErroComparacao] = useState<string | null>(null);
  const [painelMovel, setPainelMovel] = useState<"pagina" | "camada" | AbaInserir>(() => (sistemaDoPacote(pacoteInicial) ? "pagina" : "estilos"));
  const semDirecao = !sistemaDoPacote(pacoteInicial);
  const [aba, setAba] = useState<AbaInserir | null>(semDirecao ? "estilos" : "texto");
  const [encaixe, setEncaixe] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [aLargar, setALargar] = useState(false);
  const paginaRef = useRef<HTMLDivElement>(null);
  const [painelAberto, setPainelAberto] = useState(() => !sistemaDoPacote(pacoteInicial));
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
  const [subImagens, setSubImagens] = useState<{ aba: "biblioteca" | "fotos" | "carregar" | "ia"; n: number } | undefined>(undefined);
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
  const sistemaDoc = useMemo(() => sistemaDoPacote(pacote), [pacote]);
  /** Draft = in-memory copy of the SAME document shown on the canvas; `antes` is what Cancelar restores. */
  const [rascunho, setRascunho] = useState<{ antes: PacoteProva; s: SistemaVisual; ajustes?: "manter" | "recriar" } | null>(null);
  const [pedirAjustes, setPedirAjustes] = useState<null | { n: number; continuar: (a: "manter" | "recriar") => void }>(null);
  const avisosSistema = (r: ReturnType<typeof aplicarSistema>) => [r.recusadas.length ? `${r.recusadas.length} página(s) não cabem e ficam como estavam` : "", r.quebrasRecusadas.length ? `${r.quebrasRecusadas.length} quebra(s) não cabem e usam a composição normal` : "", r.imagemRecusadas.length ? "o texto não cabe num modo de imagem; esse slide fica como estava" : ""].filter(Boolean).join("; ");
  const experimentar = (novo: SistemaVisual, tipo: "estilo" | "variante" | "paleta" | "ritmo" | "imagens") => {
    const antes = rascunho?.antes ?? pacote;
    const atual = rascunho?.s ?? sistemaDoc;
    const correr = (ajustes?: "manter" | "recriar") => {
      let p: PacoteProva;
      if (tipo === "paleta" && atual) p = recolorir(pacote, atual.paleta, novo.paleta);
      else {
        const r = aplicarSistema(antes, novo, mSis, undefined, {}, { ajustes });
        p = r.pacote;
        const av = avisosSistema(r);
        if (av) toast.info(`${av}.`);
      }
      despachar({ tipo: "previsualizar", pacote: p, variante: novo.variante });
      setRascunho({ antes, s: novo, ajustes });
    };
    const geometria = tipo !== "paleta" || !atual;
    const n = paginasComAjustes(antes);
    if (geometria && n > 0 && !rascunho?.ajustes) setPedirAjustes({ n, continuar: correr });
    else correr(rascunho?.ajustes);
  };
  // Opening always with a visual direction and with texts already framed (no font reduction, ever).
  const preparado = useRef(false);
  useEffect(() => {
    if (preparado.current || !mSis || rascunho) return;
    preparado.current = true;
    let p = pacote;
    let msg = "";
    if (!sistemaDoPacote(p)) {
      p = aplicarSistema(p, sistemaPadrao(p.conteudo.slides.length || p.variantes.A.paginas.length), mSis).pacote;
      msg = "Direção visual Editorial aplicada automaticamente";
    }
    const e = enquadrarTextos(p, mSis);
    if (e.ajustadas) { p = e.pacote; msg = `${msg ? `${msg}; ` : ""}${e.ajustadas} caixa(s) de texto ajustada(s) para o texto caber`; }
    if (p !== pacote) { despachar({ tipo: "substituir", pacote: p }); toast.info(`${msg}.`, { action: { label: "Desfazer", onClick: () => despachar({ tipo: "desfazer" }) } }); }
  }, [mSis]); // eslint-disable-line react-hooks/exhaustive-deps
  const aplicarRascunho = () => {
    if (!rascunho) return;
    despachar({ tipo: "confirmar", antes: rascunho.antes });
    setRascunho(null);
    toast.success("Direção visual aplicada ao documento.", { action: { label: "Desfazer", onClick: () => despachar({ tipo: "desfazer" }) } });
  };
  const cancelarRascunho = () => {
    if (!rascunho) return;
    despachar({ tipo: "previsualizar", pacote: rascunho.antes, variante: rascunho.antes.variantes.A.sistema?.variante ?? "A" });
    setRascunho(null);
  };
  const slideAtual = slideDaPagina(pacote.variantes[variante].paginas[pagina] ?? { id: "", fundo: "", camadas: [] });
  const decisaoAtual = useMemo(() => (sistemaDoc && slideAtual ? aplicarSistema(pacote, sistemaDoc, mSis, [pagina]).decisoes[`${variante}:${pagina}`] ?? null : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sistemaDoc, slideAtual, pagina, variante, pacote]);
  /** Page-level change (role / image composition) recomposed with the current style + variant + palette. */
  const recomporPagina = (mudar: { papel?: PapelVisual; comp?: ComposicaoImagem }, msg: string) => {
    setAvisoPagina(null);
    if (!sistemaDoc || rascunho) return;
    const sid = slideAtual;
    let p: PacoteProva = pacote;
    for (const v of ["A", "B"] as const) {
      p = { ...p, variantes: { ...p.variantes, [v]: { ...p.variantes[v], paginas: p.variantes[v].paginas.map((pg) => {
        if (slideDaPagina(pg) !== sid) return pg;
        const n = { ...pg };
        if (mudar.papel) n.papel = mudar.papel;
        if (mudar.comp && v === variante) { if (Object.keys(mudar.comp).length) n.composicao = { ...mudar.comp } as Record<string, unknown>; else delete n.composicao; }
        return n;
      }) } } };
    }
    const visualDaPagina = (pg: typeof pacote.variantes[typeof variante]["paginas"][number] | undefined) => JSON.stringify({ fundo: pg?.fundo, camadas: pg?.camadas });
    const antes = visualDaPagina(pacote.variantes[variante].paginas[pagina]);
    const correr = () => {
      const r = aplicarSistema(p, sistemaDoc, mSis, [pagina], {}, { ajustes: "recriar", variantes: [variante] });
      despachar({ tipo: "substituir", pacote: r.pacote });
      const av = avisosSistema(r);
      const depois = visualDaPagina(r.pacote.variantes[variante].paginas[pagina]);
      if (antes === depois) setAvisoPagina("Esta escolha ficou guardada, mas não muda este slide porque o conteúdo já está no melhor enquadramento seguro.");
      else if (av) setAvisoPagina(av);
      comDesfazer(`${msg}${av ? ` (${av})` : ""}.`);
    };
    correr();
  };
  const largar = async (e: React.DragEvent) => {
    const bruto = e.dataTransfer.getData(MIME_INSERIR);
    const ficheiro = ficheiroDoArrasto(e.dataTransfer);
    setALargar(false);
    if ((!bruto && !ficheiro) || !paginaRef.current) return;
    e.preventDefault();
    const r = paginaRef.current.getBoundingClientRect();
    const pos = { x: (e.clientX - r.left) / escala, y: (e.clientY - r.top) / escala };
    if (!bruto && ficheiro) {
      if (!projectId) { toast.error("Este documento não aceita imagens carregadas."); return; }
      const t = toast.loading("A carregar a imagem…");
      try { const img = await carregarFicheiro(projectId, ficheiro); despachar({ tipo: "adicionarImagem", asset: img.asset, nome: img.nome, pos }); toast.dismiss(t); }
      catch (err) { toast.error((err as Error).message, { id: t }); }
      return;
    }
    let d: Inserivel;
    try { d = JSON.parse(bruto) as Inserivel; } catch { return; }
    if (d.tipo === "texto") despachar({ tipo: "adicionar", camada: "texto", preset: d.preset, pos });
    else if (d.tipo === "forma") despachar({ tipo: "adicionar", camada: d.forma, pos });
    else if (d.tipo === "biblioteca" && projectId) {
      const t = toast.loading("A copiar a imagem para o projeto…");
      try { const img = await resolverBiblioteca(projectId, d.media_id, d.nome); despachar({ tipo: "adicionarImagem", asset: img.asset, nome: img.nome, pos }); toast.dismiss(t); }
      catch (err) { toast.error((err as Error).message, { id: t }); }
    }
  };

  useEffect(() => {
    carregarMedidor().then(setMedidor).catch((e: Error) => setErroFontes(e.message));
  }, []);

  useEffect(() => {
    const atualizar = () => setCompacto(window.innerWidth < 1180);
    atualizar();
    window.addEventListener("resize", atualizar);
    return () => window.removeEventListener("resize", atualizar);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const atualizar = () => setAlturaVisual(vv.height);
    atualizar();
    vv.addEventListener("resize", atualizar);
    return () => vv.removeEventListener("resize", atualizar);
  }, []);

  useEffect(() => {
    let vivo = true;
    carregarImagens(pacote).then((i) => { if (vivo) setImagens(i); }).catch(() => toast.error("Não foi possível carregar as imagens do documento."));
    return () => { vivo = false; };
  }, [pacote.assets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offer local recovery when opening a document (scoped by user + document).
  useEffect(() => {
    if (!user || !chave) return;
    const r = lerRecuperacao<PacoteProva>(chave, user.id);
    if (!r) { setRecuperavel(null); return; }
    try { setRecuperavel({ guardado_em: r.guardado_em, pacote: validarPacote(r.dados, { real }) }); }
    catch { limparRecuperacao(chave); setRecuperavel(null); }
  }, [pacote.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave locally after edits (never claims server persistence).
  useEffect(() => {
    if (!chave || estado.passado.length === 0 || rascunho) return;
    const t = setTimeout(() => guardarRecuperacao(chave, pacote), 600);
    return () => clearTimeout(t);
  }, [pacote, chave, estado.passado.length, rascunho]);

  const onAlteradoRef = useRef(onAlterado);
  onAlteradoRef.current = onAlterado;
  // A visual draft is never emitted (so never saved); Cancelar returns to the last emitted document.
  const emitidoRef = useRef(pacoteInicial);
  useEffect(() => {
    if (rascunho || pacote === emitidoRef.current) return;
    emitidoRef.current = pacote;
    onAlteradoRef.current?.(pacote);
  }, [pacote, rascunho]);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [compacto, preview, painelAberto]);

  const escalaAjuste = Math.max(ZOOM_MIN, Math.min((area.w - 32) / LARGURA, (area.h - 32) / ALTURA));
  const escala = zoom === "ajustar" ? escalaAjuste : zoom;
  const definirZoom = useCallback((f: (z: number) => number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(f(z === "ajustar" ? escalaAjuste : z) * 100) / 100))), [escalaAjuste]);

  const paginas = pacote.variantes[variante].paginas;
  const paginaAtual = paginas[pagina];
  const camada = paginaAtual?.camadas.find((c) => c.id === selecao) ?? null;
  const sensoresSlides = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const terminarArrastoSlide = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const de = paginas.findIndex((p) => p.id === active.id);
    const para = paginas.findIndex((p) => p.id === over.id);
    if (de >= 0 && para >= 0) { despachar({ tipo: "moverPagina", de, para }); comDesfazer(`Slide movido para a posição ${para + 1}.`); }
  };

  useEffect(() => {
    if (compacto && selecao) {
      setPainelMovel("camada");
      setPainelAberto(true);
    }
  }, [selecao, compacto]);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { if (emCampo(e)) return; e.preventDefault(); despachar({ tipo: e.shiftKey ? "refazer" : "desfazer" }); return; }
      if (mod && e.key.toLowerCase() === "y") { if (emCampo(e)) return; e.preventDefault(); despachar({ tipo: "refazer" }); return; }
      if (emCampo(e)) return;
      if (e.key === "Enter" && !mod && selecao && camada?.tipo === "texto" && !editando) { e.preventDefault(); setEditando(selecao); return; }
      if (mod && e.code === "KeyC" && selecao) { e.preventDefault(); copiar(); return; }
      if (mod && e.code === "KeyV" && e.altKey) { e.preventDefault(); colarEstilo(); return; }
      if (mod && e.code === "KeyV") { e.preventDefault(); colar(); return; }
      if (mod && e.key.toLowerCase() === "d" && selecao) { e.preventDefault(); despachar({ tipo: "duplicarCamada", id: selecao }); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selecao) { e.preventDefault(); despachar({ tipo: "apagarCamada", id: selecao }); return; }
      if (e.key === "Escape") { if (preview) setPreview(false); else despachar({ tipo: "selecionar", id: null }); return; }
      if (e.key.startsWith("Arrow") && camada) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        despachar({ tipo: "camada", id: camada.id, patch: { x: camada.x + dx, y: camada.y + dy }, agrupar: `seta:${camada.id}` });
        return;
      }
      if (!mod && (e.key === "+" || e.key === "=")) { definirZoom((z) => z * 1.2); return; }
      if (!mod && e.key === "-") { definirZoom((z) => z / 1.2); return; }
      if (!mod && e.key === "0") { setZoom("ajustar"); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecao, camada, preview, definirZoom, editando, pacote, paginaAtual]);

  const exportarJson = () => {
    descarregar(new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }), `${pacote.id}.documento-grafico.json`);
    toast.success("JSON exportado.");
  };

  const importarJson = async (f: File) => {
    try {
      if (f.size > 5_000_000) throw new Error("O ficheiro tem mais de 5 MB.");
      const lido = validarPacote(JSON.parse(await f.text()), { real });
      const p = real ? { ...lido, id: pacote.id, nome: pacote.nome } : lido;
      despachar({ tipo: "carregar", pacote: p });
      setZoom("ajustar");
      toast.success(`Documento «${p.nome}» aberto.`);
    } catch (e) {
      toast.error(e instanceof SyntaxError ? "O ficheiro não é JSON válido." : (e as Error).message);
    }
  };

  const exportarPng = async () => {
    if (!medidor) return;
    try {
      descarregar(await renderizarPaginaPng(pacote, variante, pagina, medidor), `${pacote.id}-${variante}-p${pagina + 1}.png`);
    } catch { toast.error("Não foi possível exportar a página."); }
  };

  const comparar = async () => {
    if (!medidor) return;
    setComparando(true); setErroComparacao(null); setComparacao(null);
    try {
      const navegador = await renderizarPaginaPng(pacote, variante, pagina, medidor);
      const t = performance.now();
      const r = await renderProvaServidor(pacote, variante, pagina);
      const servidor = `data:image/png;base64,${r.png}`;
      const ms = Math.round(performance.now() - t);
      const { fracao, perda, piorZona, diferenca } = await compararPng(navegador, servidor);
      setComparacao({ navegador, servidor, diferenca, fracao, perda, piorZona, ms });
    } catch (e) {
      setErroComparacao((e as Error).message || "Falha na comparação.");
    } finally {
      setComparando(false);
    }
  };

  if (erroFontes) {
    return <div className="p-6"><p role="alert" className="text-sm text-destructive">{erroFontes} Recarrega a página para tentar de novo.</p></div>;
  }

  const barraAcoes = (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)" disabled={!estado.passado.length} onClick={() => despachar({ tipo: "desfazer" })}><Undo2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer (Ctrl+Shift+Z)" disabled={!estado.futuro.length} onClick={() => despachar({ tipo: "refazer" })}><Redo2 className="h-4 w-4" /></Button>
    </div>
  );

  const zoomControlos = (
    <div className="flex items-center gap-1" role="group" aria-label="Zoom">
      <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Afastar (−)" onClick={() => definirZoom((z) => z / 1.2)}><Minus className="h-4 w-4" /></Button>
      <span className="w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">{Math.round(escala * 100)}%</span>
      <Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Aproximar (+)" onClick={() => definirZoom((z) => z * 1.2)}><Plus className="h-4 w-4" /></Button>
      <Button variant="ghost" size="sm" className="h-11 lg:h-9" onClick={() => setZoom("ajustar")} aria-label="Ajustar à tela (0)"><Maximize className="h-4 w-4 lg:mr-1.5" /><span className="hidden lg:inline">Ajustar</span></Button>
    </div>
  );

  const menuDocumento = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 lg:h-9" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4 lg:mr-1.5" /><span className="hidden lg:inline">Documento</span></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => ficheiroRef.current?.click()}><FileUp className="mr-2 h-4 w-4" />Importar JSON…</DropdownMenuItem>
        <DropdownMenuItem onSelect={exportarJson}><FileDown className="mr-2 h-4 w-4" />Exportar JSON</DropdownMenuItem>
        <DropdownMenuItem onSelect={exportarPng} disabled={!medidor}><Download className="mr-2 h-4 w-4" />Exportar página em PNG</DropdownMenuItem>
        {!real && <><DropdownMenuSeparator />
        <DropdownMenuItem onSelect={comparar} disabled={!medidor || comparando}><ScanSearch className="mr-2 h-4 w-4" />Comparar com o servidor</DropdownMenuItem></>}
        {menuExtra}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const seletorDoc = seletor ?? null;

  const abrirDirecao = () => { if (compacto) { setPainelMovel("estilos"); setPainelAberto(true); } else setAba("estilos"); };
  const sisMostrado = rascunho?.s ?? sistemaDoc;
  const seletorVariante = (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="truncate text-muted-foreground" title="Direção visual">
        {sisMostrado ? `${ESTILOS.find((e) => e.id === sisMostrado.estilo)?.nome ?? ""} · ${nomeVariante(sisMostrado.estilo, sisMostrado.variante)} · ${obterPaleta(sisMostrado.paleta).nome}${rascunho ? " (por aplicar)" : ""}` : "A preparar a direção visual…"}
      </span>
      <Button variant="link" size="sm" className="h-11 px-1 lg:h-9" onClick={abrirDirecao}>Alterar</Button>
      <MapaCustos projectId={projectId} />
    </div>
  );

  const miniaturas = (horizontal: boolean) => (
    <DndContext sensors={sensoresSlides} collisionDetection={closestCenter} onDragEnd={terminarArrastoSlide}>
    <SortableContext items={paginas.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
    <ol className={horizontal ? "flex gap-2 overflow-x-auto px-3 py-2" : "space-y-3 p-3"} aria-label="Páginas reordenáveis">
      {paginas.map((p, i) => (
        <MiniaturaOrdenavel key={p.id} id={p.id} atual={i === pagina}>
          <button type="button" onClick={() => despachar({ tipo: "pagina", indice: i })} aria-current={i === pagina ? "page" : undefined} aria-label={`Página ${i + 1} de ${paginas.length}${i === pagina ? " (atual)" : ""}`}
            className={`group block rounded-md border-2 p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === pagina ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"}`}>
            <div className="pointer-events-none overflow-hidden rounded-sm border border-border">
              {medidor && <PaginaCanvas pacote={pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={horizontal ? 0.065 : 0.14} />}
            </div>
            <span className={`mt-1 block text-center text-xs tabular-nums ${i === pagina ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{i + 1}{i === pagina && <span className="sr-only"> de {paginas.length}, atual</span>}</span>
          </button>
          {i === pagina && sistemaDoc && !rascunho && medidor && (
            <Button variant="ghost" size="sm" className="mt-0.5 h-7 w-full px-1 text-xs" onClick={() => setRedesenhar(true)} title="Mantém o conteúdo e propõe composições alternativas"><Wand2 className="mr-1 h-3.5 w-3.5" />Redesenhar</Button>
          )}
        </MiniaturaOrdenavel>
      ))}
      {!preview && !rascunho && (
        <li className="shrink-0 self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={horizontal ? "h-11 flex-col gap-0.5 px-3 lg:h-auto lg:py-3" : "h-11 w-full"} disabled={paginas.length >= 20} title={paginas.length >= 20 ? "Máximo de 20 slides" : "Acrescentar um slide a seguir ao atual"}>
                <Plus className="h-4 w-4" /><span className="text-xs">Novo slide</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => { despachar({ tipo: "inserirPagina", indice: pagina, modelo: "texto" }); comDesfazer("Slide de texto acrescentado."); }}>Texto (título e texto, no estilo atual)</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { despachar({ tipo: "inserirPagina", indice: pagina, modelo: "branco" }); comDesfazer("Slide em branco acrescentado."); }}>Em branco (só o fundo)</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { despachar({ tipo: "duplicarPagina", indice: pagina }); comDesfazer("Slide duplicado."); }}>Duplicar o atual</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      )}
    </ol>
    </SortableContext>
    </DndContext>
  );

  const acoesPagina = (
    <div className="space-y-1">
    <p className="text-sm font-medium" aria-live="polite">Página {pagina + 1} de {paginas.length}</p>
    <div className="grid grid-cols-4 gap-1">
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Duplicar página" title="Duplicar página" disabled={paginas.length >= 20} onClick={() => despachar({ tipo: "duplicarPagina", indice: pagina })}><Copy className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Mover página para cima" title="Mover para cima" disabled={pagina === 0} onClick={() => despachar({ tipo: "moverPagina", de: pagina, para: pagina - 1 })}><ArrowUp className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Mover página para baixo" title="Mover para baixo" disabled={pagina === paginas.length - 1} onClick={() => despachar({ tipo: "moverPagina", de: pagina, para: pagina + 1 })}><ArrowDown className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8 text-destructive hover:text-destructive" aria-label="Apagar página" title="Apagar página" disabled={paginas.length <= 1} onClick={() => despachar({ tipo: "apagarPagina", indice: pagina })}><Trash2 className="h-4 w-4" /></Button>
    </div>
    </div>
  );

  const camadaEd = editando ? paginaAtual?.camadas.find((c) => c.id === editando) : undefined;
  const edicaoInline = camadaEd?.tipo === "texto" && !preview && !rascunho && (() => {
    const c = camadaEd;
    const ref = c.ref ? c.ref.split(".") as [string, "titulo" | "texto"] : null;
    const gravar = (valor: string) => ref
      ? despachar({ tipo: "texto", slide: ref[0], campo: ref[1], valor, agrupar: `t:${c.id}` })
      : despachar({ tipo: "camada", id: c.id, patch: { texto: valor } as Partial<Camada>, agrupar: `t:${c.id}` });
    return (
      <textarea
        autoFocus
        aria-label="Editar texto no slide"
        defaultValue={resolverTexto(c, pacote.conteudo)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => gravar(e.target.value)}
        onBlur={() => setEditando(null)}
        onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); e.currentTarget.blur(); } e.stopPropagation(); }}
        className="absolute z-10 resize-none rounded-sm border border-primary p-0 shadow-md outline-none"
        // Covers the canvas text completely (page background + layer colour) so no ghost text shows underneath.
        style={{ background: paginaAtual?.fundo, color: c.estilo.cor, left: c.x * escala, top: c.y * escala, width: c.w * escala, height: Math.max(c.h * escala, 40), fontSize: Math.max(12, c.estilo.tam * escala), lineHeight: c.estilo.linha, fontWeight: c.estilo.peso, textAlign: c.estilo.alinh === "dir" ? "right" : c.estilo.alinh === "centro" ? "center" : "left" }}
      />
    );
  })();
  const tela = (
    <div ref={areaRef} className={`relative min-h-0 flex-1 overflow-auto bg-muted ${aLargar ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
      onPointerDown={(e) => { if (e.target === e.currentTarget) despachar({ tipo: "selecionar", id: null }); }}
      onDragOver={(e) => { if (!preview && (e.dataTransfer.types.includes(MIME_INSERIR) || (!!projectId && e.dataTransfer.types.includes("Files")))) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setALargar(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setALargar(false); }}
      onDrop={largar}>
      <div className="flex min-h-full min-w-full items-center justify-center p-4" style={{ width: LARGURA * escala + 32, height: ALTURA * escala + 32 }}>
        <div ref={paginaRef} className="relative shadow-lg ring-1 ring-border" aria-label={`Página ${pagina + 1} de ${paginas.length}, variante ${variante}, 1080 por 1350`} role="img">
          {medidor ? (
            <PaginaCanvas pacote={pacote} variante={variante} indice={pagina} medidor={medidor} imagens={imagens} escala={escala}
              interativo={!preview && !rascunho} selecao={preview || rascunho ? null : selecao} toque={compacto} corSelecao={corSelecao} encaixe={encaixe}
              onSelecionar={(id) => { if (id !== editando) setEditando(null); despachar({ tipo: "selecionar", id }); }}
              onEditarTexto={(id) => { despachar({ tipo: "selecionar", id }); setEditando(id); }}
              onAlterar={(id, patch) => despachar({ tipo: "camada", id, patch })} />
          ) : (
            <div className="flex items-center justify-center bg-background text-sm text-muted-foreground" style={{ width: LARGURA * escala, height: ALTURA * escala }}>
              <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A carregar o tipo de letra…
            </div>
          )}
          {edicaoInline}
          {rascunho && !preview && (
            <div role="status" className="absolute inset-x-2 top-2 z-10 rounded-md border border-border bg-background/95 px-3 py-2 text-sm shadow-md">
              Direção visual por aplicar. Aplica ou cancela no painel «Direção visual» para voltar a editar os elementos.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const avisoRecuperacao = recuperavel && (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 text-sm" role="status">
      <span>Há uma cópia local deste documento de {dataHora(recuperavel.guardado_em)}.</span>
      <Button size="sm" className="h-11 lg:h-8" onClick={() => { despachar({ tipo: "carregar", pacote: recuperavel.pacote }); setRecuperavel(null); toast.success("Cópia local restaurada."); }}>Restaurar</Button>
      <Button size="sm" variant="ghost" className="h-11 lg:h-8" onClick={() => { if (chave) limparRecuperacao(chave); setRecuperavel(null); }}>Descartar</Button>
    </div>
  );

  const fundoTodos = () => { const p = paginaAtual && fundoATodos(pacote, variante, paginaAtual.fundo); if (p) { despachar({ tipo: "substituir", pacote: p }); comDesfazer("Fundo aplicado a todos os slides desta variante."); } else toast.info("Todos os slides já têm este fundo."); };
  const abrirSubstituicao = (id: string, aba: "biblioteca" | "fotos" | "carregar" | "ia" = "biblioteca") => {
    setImagemASubstituir(id);
    setSubImagens((s) => ({ aba, n: (s?.n ?? 0) + 1 }));
    if (compacto) { setPainelMovel("imagens"); setPainelAberto(true); } else setAba("imagens");
  };
  const propriedades = medidor && paginaAtual && (
    <PainelPropriedades pacote={pacote} camada={camada} fundo={paginaAtual.fundo} medidor={medidor} despachar={despachar} camadasPagina={paginaAtual.camadas} onImagem={onImagem}
      onFundoTodos={!camada ? fundoTodos : undefined} onSubstituirImagem={camada?.tipo === "imagem" ? () => abrirSubstituicao(camada.id) : undefined} />
  );

  const alterarSel = (patch: Partial<Camada>, agrupar?: string) => camada && despachar({ tipo: "camada", id: camada.id, patch, agrupar });
  const estiloTxt = (c: CamadaTexto, e: Partial<CamadaTexto["estilo"]>, agrupar?: string) => alterarSel({ estilo: { ...c.estilo, ...e } } as Partial<Camada>, agrupar);
  const todos = () => { if (!camada) return; const r = aplicarATodos(pacote, variante, camada); if (r) { despachar({ tipo: "substituir", pacote: r.pacote }); comDesfazer(`Aplicado a ${r.alteradas} camada(s) iguais nos outros slides.`); } else toast.info("Não há outras camadas iguais para alterar."); };
  const ALINHAR: { a: Alinhar; n: string; I: typeof AlignStartVertical }[] = [
    { a: "esq", n: "Encostar à esquerda", I: AlignStartVertical }, { a: "centroH", n: "Centrar na horizontal", I: AlignCenterVertical }, { a: "dir", n: "Encostar à direita", I: AlignEndVertical },
    { a: "topo", n: "Encostar ao topo", I: AlignStartHorizontal }, { a: "centroV", n: "Centrar na vertical", I: AlignCenterHorizontal }, { a: "base", n: "Encostar à base", I: AlignEndHorizontal },
  ];
  const bt = "h-11 w-11 shrink-0 lg:h-9 lg:w-9";
  const sep = <span className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
  const barraContexto = (
    <div role="toolbar" aria-label={camada ? `Ferramentas: ${rotuloCamada(camada, pacote).tipo}` : "Ferramentas do slide"} className="flex min-w-0 flex-wrap items-center gap-1 border-b border-border bg-background px-2 py-1">
      {!camada && paginaAtual && (<>
        <Button variant={encaixe ? "secondary" : "ghost"} size="sm" className="h-11 shrink-0 lg:h-9" aria-pressed={encaixe} onClick={() => setEncaixe((v) => !v)}><Magnet className="mr-1.5 h-4 w-4" />Encaixar</Button>
        <span className="ml-1 min-w-0 text-sm text-muted-foreground">Clica num texto para o selecionar; clica outra vez (ou Enter) para escrever.</span>
      </>)}
      {camada?.tipo === "texto" && (<>
        <div role="group" aria-label="Letra" className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="icon" className={bt} aria-label="Diminuir letra" title="Diminuir letra" disabled={camada.estilo.tam <= 6} onClick={() => estiloTxt(camada, { tam: tamanhoMais(camada, -1) })}><Minus className="h-4 w-4" /></Button>
        <Select value={String(camada.estilo.tam)} onValueChange={(v) => estiloTxt(camada, { tam: Number(v) })}>
          <SelectTrigger className="h-11 w-[4.5rem] shrink-0 tabular-nums lg:h-9" aria-label="Tamanho da letra"><SelectValue>{Math.round(camada.estilo.tam)}</SelectValue></SelectTrigger>
          <SelectContent>{[...new Set([...PRESETS_TAMANHO, Math.round(camada.estilo.tam)])].sort((a, b) => a - b).map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className={bt} aria-label="Aumentar letra" title="Aumentar letra" disabled={camada.estilo.tam >= 400} onClick={() => estiloTxt(camada, { tam: tamanhoMais(camada, 1) })}><Plus className="h-4 w-4" /></Button>
        <Select value={camada.estilo.familia ?? "worksans"} onValueChange={(v) => estiloTxt(camada, { familia: v as Familia })}>
          <SelectTrigger className="h-11 w-40 shrink-0 lg:h-9" aria-label="Tipo de letra"><SelectValue /></SelectTrigger>
          <SelectContent>{FAMILIAS.map((f) => <SelectItem key={f} value={f}>{NOME_FAMILIA[f]}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant={camada.estilo.peso === 700 ? "secondary" : "ghost"} size="icon" className={bt} aria-label="Negrito" aria-pressed={camada.estilo.peso === 700} onClick={() => estiloTxt(camada, { peso: camada.estilo.peso === 700 ? 400 : 700 })}><Bold className="h-4 w-4" /></Button>
        </div>
        {sep}
        <div role="group" aria-label="Alinhamento e cor" className="flex flex-wrap items-center gap-1">
        <input type="color" value={camada.estilo.cor} onChange={(e) => estiloTxt(camada, { cor: e.target.value }, `cor:${camada.id}`)} className="h-11 w-11 lg:h-9 lg:w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1" aria-label="Cor deste texto" title="Cor deste texto" />
        <ToggleGroup type="single" value={camada.estilo.alinh} onValueChange={(v) => v && estiloTxt(camada, { alinh: v as "esq" })} className="shrink-0">
          <ToggleGroupItem value="esq" aria-label="Texto à esquerda" className={bt}><AlignLeft className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="centro" aria-label="Texto ao centro" className={bt}><AlignCenter className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="dir" aria-label="Texto à direita" className={bt}><AlignRight className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
        </div>
      </>)}
      {camada?.tipo === "forma" && (
        <input type="color" value={camada.estilo.cor} onChange={(e) => alterarSel({ estilo: { ...camada.estilo, cor: e.target.value } } as Partial<Camada>, `cor:${camada.id}`)} className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1" aria-label="Cor desta forma" title="Cor desta forma" />
      )}
      {camada && (<>
        {sep}
        <div role="group" aria-label="Ações do elemento" className="flex flex-wrap items-center gap-1">
        <Button variant="outline" size="sm" className="h-11 shrink-0 lg:h-9" onClick={copiar} title="Ctrl/Cmd+C">Copiar</Button>
        <Button variant="outline" size="sm" className="h-11 shrink-0 lg:h-9" onClick={colar} title="Ctrl/Cmd+V">Colar</Button>
        <Button variant="outline" size="sm" className="h-11 shrink-0 lg:h-9" onClick={colarEstilo} title="Ctrl/Cmd+Alt+V">Colar só o estilo</Button>
        {camada.tipo === "imagem" && <Button variant="outline" size="sm" className="h-11 shrink-0 lg:h-9" onClick={() => abrirSubstituicao(camada.id)}><ScanSearch className="mr-1.5 h-4 w-4" />Substituir imagem</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-11 shrink-0 lg:h-9" aria-label="Alinhar na página"><AlignCenterVertical className="mr-1 h-4 w-4" />Alinhar</Button></DropdownMenuTrigger>
          <DropdownMenuContent>{ALINHAR.map(({ a, n, I }) => <DropdownMenuItem key={a} onSelect={() => alterarSel(alinharNaPagina(camada, a))}><I className="mr-2 h-4 w-4" />{n}</DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-11 shrink-0 lg:h-9" aria-label="Ordem das camadas"><Layers className="mr-1 h-4 w-4" />Ordem</Button></DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => despachar({ tipo: "ordem", id: camada.id, direcao: "topo" })}><BringToFront className="mr-2 h-4 w-4" />Trazer para a frente</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => despachar({ tipo: "ordem", id: camada.id, direcao: "frente" })}><ArrowUp className="mr-2 h-4 w-4" />Subir uma camada</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => despachar({ tipo: "ordem", id: camada.id, direcao: "tras" })}><ArrowDown className="mr-2 h-4 w-4" />Descer uma camada</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => despachar({ tipo: "ordem", id: camada.id, direcao: "fundo" })}><SendToBack className="mr-2 h-4 w-4" />Enviar para trás</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" className={bt} aria-label="Duplicar (Ctrl+D)" title="Duplicar (Ctrl+D)" onClick={() => despachar({ tipo: "duplicarCamada", id: camada.id })}><Copy className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className={`${bt} text-destructive hover:text-destructive`} aria-label="Apagar (Delete)" title="Apagar (Delete)" onClick={() => despachar({ tipo: "apagarCamada", id: camada.id })}><Trash2 className="h-4 w-4" /></Button>
        {camada.tipo !== "imagem" && <>{sep}<Button variant="outline" size="sm" className="h-11 shrink-0 lg:h-9" onClick={todos} title={camada.tipo === "texto" ? `Copia tipo de letra, peso e cor deste texto para os elementos «${rotuloCamada(camada, pacote).tipo}» dos outros slides da variante ${variante}. Texto, tamanho e posição não mudam. Podes desfazer.` : `Copia a cor desta forma para as formas iguais dos outros slides da variante ${variante}. Podes desfazer.`} aria-label={camada.tipo === "texto" ? `Aplicar tipo de letra, peso e cor a todos os elementos «${rotuloCamada(camada, pacote).tipo}» da variante ${variante}` : `Aplicar a cor a todas as formas iguais da variante ${variante}`}><CopyCheck className="mr-1.5 h-4 w-4" />{camada.tipo === "texto" ? "Letra e cor a todos" : "Cor a todas"}</Button></>}
        </div>
      </>)}
    </div>
  );

  const inserir = (a: AbaInserir) => (a === "estilos" ? (
    <PainelDirecaoVisual base={rascunho?.antes ?? pacote} atual={rascunho?.s ?? sistemaDoc} emRascunho={!!rascunho} medidor={medidor} imagens={imagens}
      onExperimentar={experimentar} onAplicar={aplicarRascunho} onCancelar={cancelarRascunho} />
  ) : (
    <PainelInserir aba={a} despachar={despachar} projectId={projectId} promptIA={promptIA} subImagens={subImagens} termoFotos={queryAuto} pedirImagem={onImagem} onEstilo={() => undefined}
      substituirImagemId={imagemASubstituir} onImagem={(r) => { if (imagemASubstituir) despachar({ tipo: "substituirImagem", id: imagemASubstituir, asset: r.asset, nome: r.nome }); else despachar({ tipo: "adicionarImagem", asset: r.asset, nome: r.nome, modo: modoNova }); setImagemASubstituir(null); }} />
  ));
  const inserirComModo = (a: AbaInserir) => (a === "imagens" && !imagemASubstituir ? (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Como usar?</p>
        <div role="radiogroup" aria-label="Como usar a imagem" className="grid grid-cols-3 gap-1">
          {([["fundo", "Fundo"], ["imagem", "Imagem"], ["logo", "Logótipo"]] as const).map(([v, n]) => (
            <Button key={v} type="button" role="radio" aria-checked={modoNova === v} size="sm" variant={modoNova === v ? "default" : "outline"} className="h-10 lg:h-8" onClick={() => setModoNova(v)}>{n}</Button>
          ))}
        </div>
        {logoMarca && <Button type="button" variant="outline" size="sm" className="h-10 w-full lg:h-8" onClick={() => { void usarLogoMarca(); }}>
          <img src={logoMarca} alt="" className="mr-1.5 h-4 w-4 object-contain" />Usar o logótipo da marca</Button>}
      </div>
      {inserir(a)}
    </div>
  ) : inserir(a));
  const compPagina = (paginaAtual?.composicao ?? {}) as ComposicaoImagem;
  const papelPagina = (paginaAtual?.papel ?? decisaoAtual?.papel) as PapelVisual | undefined;
  const imagemParaComposicao = camada?.tipo === "imagem" ? camada : paginaAtual?.camadas.find((k) => k.tipo === "imagem");
  // Same visual intent feeds Pexels terms and the AI prompt; only the source differs.
  const slideConteudo = pacote.conteudo.slides.find((x) => x.id === slideAtual);
  const intencao = (compPagina as { visual_intent?: string }).visual_intent;
  const promptAuto = slideConteudo && papelPagina && sistemaDoc ? construirPromptVisual({ titulo: slideConteudo.titulo, texto: slideConteudo.texto, intencao, papel: papelPagina, estilo: sistemaDoc.estilo, variante: sistemaDoc.variante, paleta: sistemaDoc.paleta, modo: decisaoAtual?.modo ?? "full_bleed", regiao: decisaoAtual?.regiao ?? "bottom" }) : undefined;
  const queryAuto = slideConteudo ? compPagina.visual_query ?? construirQueryVisual(intencao, slideConteudo.titulo) : undefined;
  const painelPaginaVisual = paginaAtual && (
    <div className="space-y-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Página {pagina + 1}</h2>
        {sistemaDoc && medidor && <Button variant="outline" size="sm" className="h-9" disabled={!!rascunho} onClick={() => setRedesenhar(true)}><Wand2 className="mr-1.5 h-4 w-4" />Redesenhar</Button>}
      </div>
      {!sistemaDoc ? <p className="text-xs text-muted-foreground">Escolhe primeiro uma direção visual para ajustar o papel e a imagem desta página.</p> : (<>
        <div className="space-y-1">
          <Label htmlFor="pv-papel" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Papel visual</Label>
          <Select value={papelPagina ?? ""} disabled={!!rascunho} onValueChange={(v) => recomporPagina({ papel: v as PapelVisual }, `Papel visual: ${PAPEIS.find((x) => x.id === v)?.nome}`)}>
            <SelectTrigger id="pv-papel" className="h-11 lg:h-9"><SelectValue placeholder="Escolher" /></SelectTrigger>
            <SelectContent>{PAPEIS.filter((x) => pagina === 0 || x.id !== "cover").map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {avisoPagina && <p className="rounded-[var(--mc-r-md)] bg-muted px-2.5 py-2 text-xs text-muted-foreground" role="status">{avisoPagina}</p>}
        <PainelImagemSlide key={`${variante}:${slideAtual}:${JSON.stringify(compPagina)}`} decisao={decisaoAtual} comp={compPagina}
          temImagem={paginaAtual.camadas.some((k) => k.tipo === "imagem") || !!compPagina.asset_id} ocupado={!!rascunho}
          imagemSelecionada={camada?.tipo === "imagem"}
          aviso={avisoPagina}
          onMudar={(c, msg) => { const img = imagemParaComposicao; recomporPagina({ comp: img && img.tipo === "imagem" ? { ...c, asset_id: img.asset_id } : c }, msg); }}
          onSubstituir={(f) => { const img = camada?.tipo === "imagem" ? camada : paginaAtual.camadas.find((k) => k.tipo === "imagem"); setImagemASubstituir(img?.id ?? null); setSubImagens((s) => ({ aba: f, n: (s?.n ?? 0) + 1 })); if (compacto) { setPainelMovel("imagens"); setPainelAberto(true); } else setAba("imagens"); }}
          sugestao={papelPagina ? inferirFonte(papelPagina) : undefined} promptIA={promptAuto} queryPexels={queryAuto}
          origemIA={compPagina.origem === "kie"}
          onGerarIA={(pr) => { setPromptIA(pr); setModoNova((decisaoAtual?.modo === "full_bleed" || decisaoAtual?.modo === "background") ? "fundo" : "imagem"); setSubImagens((s) => ({ aba: "ia", n: (s?.n ?? 0) + 1 })); if (compacto) { setPainelMovel("imagens"); setPainelAberto(true); } else setAba("imagens"); }} />
        <Collapsible className="border-t border-border pt-4">
          <CollapsibleTrigger className="group flex min-h-9 w-full items-center justify-between text-left"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Efeitos</span><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <p className="text-[11px] text-muted-foreground">Vêm do estilo; as cores seguem a paleta.</p>
            {(() => {
              const ov = (compPagina.efeitos ?? {}) as OverrideEfeitos;
              const ativos = efeitosAtivos(sistemaDoc.estilo, ov);
              return CHAVES_EFEITO.map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`fx-${k}`} className="text-xs font-normal">{NOMES_EFEITO[k]}{typeof ov[k] === "boolean" ? " · ajustado" : ""}</Label>
                  <Switch id={`fx-${k}`} checked={ativos[k]} disabled={!!rascunho}
                    onCheckedChange={(v) => { const img = paginaAtual.camadas.find((c) => c.tipo === "imagem"); recomporPagina({ comp: { ...compPagina, ...(img && img.tipo === "imagem" ? { asset_id: img.asset_id } : {}), efeitos: { ...ov, [k]: v } } }, `${NOMES_EFEITO[k]} ${v ? "ligado" : "desligado"}`); }} />
                </div>
              ));
            })()}
          </CollapsibleContent>
        </Collapsible>
        {medidor && <PainelRedesenhar aberto={redesenhar} onFechar={() => setRedesenhar(false)} pacote={pacote} sistema={sistemaDoc} variante={variante} indice={pagina}
          medidor={medidor} imagens={imagens} onGerarIA={() => { setPromptIA(promptAuto); if (compacto) { setPainelMovel("imagens"); setPainelAberto(true); } else setAba("imagens"); }}
          projectId={projectId} onAplicar={(p, c) => { despachar({ tipo: "substituir", pacote: p }); comDesfazer(c.requiresAiImage ? `Imagem gerada por IA aplicada na página ${pagina + 1}.` : `Página ${pagina + 1} redesenhada: ${c.label}.`); }} />}
      </>)}
    </div>
  );
  const dialogoAjustes = (
    <Dialog open={!!pedirAjustes} onOpenChange={(v) => { if (!v) setPedirAjustes(null); }}>
      <DialogContent className="mc-estudio">
        <DialogHeader>
          <DialogTitle>Há ajustes manuais</DialogTitle>
          <DialogDescription>Esta alteração pode substituir ajustes manuais em {pedirAjustes?.n} página{pedirAjustes?.n === 1 ? "" : "s"}.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="h-11" onClick={() => setPedirAjustes(null)}>Cancelar</Button>
          <Button variant="outline" className="h-11" onClick={() => { const c = pedirAjustes!.continuar; setPedirAjustes(null); c("recriar"); }}>Recriar composição</Button>
          <Button className="h-11" onClick={() => { const c = pedirAjustes!.continuar; setPedirAjustes(null); c("manter"); }}>Manter ajustes quando possível</Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const dialogoComparacao = (
    <Dialog open={comparando || !!comparacao || !!erroComparacao} onOpenChange={(o) => { if (!o) { setComparacao(null); setErroComparacao(null); } }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Navegador vs. servidor</DialogTitle>
          <DialogDescription>Página {pagina + 1}, variante {variante}. A prova distingue ruído de rasterização de perda localizada de conteúdo.</DialogDescription>
        </DialogHeader>
        {comparando && <p className="flex items-center text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A renderizar nos dois lados…</p>}
        {erroComparacao && <p role="alert" className="text-sm text-destructive">Não foi possível renderizar no servidor: {erroComparacao}</p>}
        {comparacao && (
          <div className="space-y-3">
            <p className="text-sm" role="status">
              <strong className={comparacao.fracao <= LIMIAR_EQUIVALENCIA && comparacao.perda <= LIMIAR_PERDA_CONTEUDO && comparacao.piorZona <= LIMIAR_ZONA ? "text-foreground" : "text-destructive"}>
                {comparacao.fracao <= LIMIAR_EQUIVALENCIA && comparacao.perda <= LIMIAR_PERDA_CONTEUDO && comparacao.piorZona <= LIMIAR_ZONA ? "Equivalente" : "Diferente"}
              </strong>{" "}
              — rasterização {(comparacao.fracao * 100).toFixed(3)}% · perda provável {(comparacao.perda * 100).toFixed(3)}% · pior zona {(comparacao.piorZona * 100).toFixed(2)}% · servidor em {comparacao.ms} ms
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([["Navegador", comparacao.navegador], ["Servidor", comparacao.servidor], ["Diferenças a vermelho", comparacao.diferenca]] as const).map(([t, src]) => (
                <figure key={t} className="space-y-1">
                  <img src={src} alt={t} className="w-full rounded-sm border border-border" />
                  <figcaption className="text-xs text-muted-foreground">{t}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const inputFicheiro = <input ref={ficheiroRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarJson(f); e.target.value = ""; }} />;

  if (preview) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-muted">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
          <span className="text-sm font-medium">Pré-visualização · {pagina + 1}/{paginas.length} · variante {variante}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página anterior" disabled={pagina === 0} onClick={() => despachar({ tipo: "pagina", indice: pagina - 1 })}><ArrowUp className="h-4 w-4 -rotate-90" /></Button>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página seguinte" disabled={pagina === paginas.length - 1} onClick={() => despachar({ tipo: "pagina", indice: pagina + 1 })}><ArrowDown className="h-4 w-4 -rotate-90" /></Button>
            <Button variant="outline" className="h-11" onClick={() => setPreview(false)}><X className="mr-1.5 h-4 w-4" />Fechar</Button>
          </div>
        </div>
        {tela}
      </div>
    );
  }

  if (compacto) {
    return (
      <div className="relative flex min-h-0 flex-col overflow-hidden" style={{ height: alturaVisual ? `${alturaVisual}px` : "100dvh" }}>
        {inputFicheiro}
        {faixaTopo}
        <header className="space-y-2 border-b border-border bg-background px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">{cabecalhoInicio}<h1 className="truncate text-sm font-semibold" title={typeof titulo === "string" ? titulo : undefined}>{titulo}</h1></div>
            <div className="flex items-center gap-1">
              {barraAcoes}
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Pré-visualizar" onClick={() => { setPreview(true); setZoom("ajustar"); }}><Eye className="h-4 w-4" /></Button>
              {menuDocumento}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">{seletorDoc}{seletorVariante}<div className="ml-auto">{estadoGravacao}</div></div>
        </header>
        {avisoRecuperacao}
        {painelAberto ? (
          <div className="flex shrink-0 items-center gap-1 border-b border-border bg-background px-2">
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página anterior" disabled={pagina === 0} onClick={() => despachar({ tipo: "pagina", indice: pagina - 1 })}><ArrowUp className="h-4 w-4 -rotate-90" /></Button>
            <span className="text-sm font-medium tabular-nums" aria-live="polite">Página {pagina + 1} de {paginas.length}</span>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página seguinte" disabled={pagina === paginas.length - 1} onClick={() => despachar({ tipo: "pagina", indice: pagina + 1 })}><ArrowDown className="h-4 w-4 -rotate-90" /></Button>
            <Button variant="ghost" size="sm" className="ml-auto h-11" onClick={() => setPainelAberto(false)}>Mostrar páginas</Button>
          </div>
        ) : <div className="shrink-0 border-b border-border bg-background">{miniaturas(true)}</div>}
        {barraContexto}
        <div className="flex min-h-[28dvh] flex-1 flex-col">{tela}</div>
        {painelAberto && <section id="painel-propriedades" className="max-h-[42dvh] shrink-0 overflow-y-auto border-t border-border bg-background" aria-label="Painel">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-3">
            <h2 className="text-sm font-semibold">{painelMovel === "pagina" ? "Página" : painelMovel === "camada" ? "Camada" : ABAS_INSERIR.find((x) => x.id === painelMovel)?.nome}</h2>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Fechar painel" onClick={() => setPainelAberto(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-4 p-3">
            {painelMovel === "pagina" && <>{painelPaginaVisual}{zoomControlos}{acoesPagina}{medidor && paginaAtual && <PainelPropriedades pacote={pacote} camada={null} fundo={paginaAtual.fundo} medidor={medidor} despachar={despachar} camadasPagina={paginaAtual.camadas} onImagem={onImagem} />}</>}
            {painelMovel === "camada" && (camada ? propriedades : <p className="text-sm text-muted-foreground">Toca num elemento da página.</p>)}
            {painelMovel !== "pagina" && painelMovel !== "camada" && inserirComModo(painelMovel)}
          </div>
        </section>}
        <nav className="grid shrink-0 grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]" aria-label="Ferramentas">
          {ABAS_INSERIR.map(({ id: a, nome, icone: I }) => (
            <Button key={a} variant={painelAberto && painelMovel === a ? "secondary" : "ghost"} className="h-14 flex-col gap-0.5 rounded-none px-0 text-xs" aria-expanded={painelAberto && painelMovel === a}
              onClick={() => { if (painelAberto && painelMovel === a) setPainelAberto(false); else { setPainelMovel(a); setPainelAberto(true); } }}><I className="h-5 w-5" />{nome}</Button>
          ))}
          <Button variant={painelAberto && (painelMovel === "pagina" || painelMovel === "camada") ? "secondary" : "ghost"} className="h-14 flex-col gap-0.5 rounded-none px-0 text-xs"
            onClick={() => { const alvo = camada ? "camada" : "pagina"; if (painelAberto && painelMovel === alvo) setPainelAberto(false); else { setPainelMovel(alvo); setPainelAberto(true); } }}><Layers className="h-5 w-5" />{camada ? "Camada" : "Página"}</Button>
        </nav>
        {dialogoComparacao}
        {dialogoAjustes}
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      {inputFicheiro}
      {dialogoAjustes}
      {faixaTopo}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2">
        {cabecalhoInicio}
        <h1 className="mr-2 min-w-0 max-w-[40ch] truncate text-base font-semibold" title={typeof titulo === "string" ? titulo : undefined}>{titulo}</h1>
        {seletorDoc}
        {seletorVariante}
        <div className="mx-1 h-6 w-px bg-border" aria-hidden />
        {barraAcoes}
        {estadoGravacao}
        <div className="ml-auto flex items-center gap-2">
          {zoomControlos}
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setPreview(true); setZoom("ajustar"); }}><Eye className="mr-1.5 h-4 w-4" />Pré-visualizar</Button>
          {menuDocumento}
        </div>
      </header>
      {avisoRecuperacao}
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-16 shrink-0 flex-col items-stretch gap-1 border-r border-border bg-background py-2" aria-label="Inserir">
          {ABAS_INSERIR.map(({ id: a, nome, icone: I }) => (
            <button key={a} type="button" onClick={() => setAba((x) => (x === a ? null : a))} aria-pressed={aba === a}
              className={`mx-1 flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${aba === a ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <I className="h-5 w-5" />{nome}
            </button>
          ))}
        </nav>
        {aba && <aside className="w-64 shrink-0 overflow-y-auto border-r border-border bg-background p-3" aria-label={ABAS_INSERIR.find((x) => x.id === aba)?.nome}>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">{ABAS_INSERIR.find((x) => x.id === aba)?.nome}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Fechar painel" onClick={() => setAba(null)}><X className="h-4 w-4" /></Button></div>
          {inserirComModo(aba)}
        </aside>}
        <div className="flex min-w-0 flex-1 flex-col">
          {barraContexto}
          {tela}
          <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background pr-2">
            <div className="min-w-0 flex-1">{miniaturas(true)}</div>
            <div className="w-40 shrink-0">{acoesPagina}</div>
          </div>
        </div>
        <aside className="w-72 shrink-0 overflow-y-auto overflow-x-hidden border-l border-border bg-background p-4" aria-label="Propriedades">
          {!camada && painelPaginaVisual}
          {propriedades}
        </aside>
      </div>
      {dialogoComparacao}
    </div>
  );
}
