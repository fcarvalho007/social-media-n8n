import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, BringToFront, ChevronsDown, ChevronsUp, Circle, Copy, Download,
  Eye, FileDown, FileUp, Loader2, Maximize, Minus, MoreHorizontal, Plus, Redo2, ScanSearch, SendToBack, Square, Trash2, Type, Undo2, X,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { renderProvaServidor } from "@/services/conteudos";
import { ALTURA, LARGURA, layoutTexto, resolverTexto, validarPacote, type Camada, type Medidor, type PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { FIXTURES } from "@/features/editor-grafico/fixtures";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { carregarImagens, compararPng, renderizarPaginaPng } from "@/features/editor-grafico/desenho";
import { estadoInicial, reduzir, type Acao } from "@/features/editor-grafico/estado";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";

/** Max fraction of pixels allowed to differ (per-channel tolerance 48) for browser/server equivalence. */
export const LIMIAR_EQUIVALENCIA = 0.01;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;

const dataHora = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function corToken(nome: string, recurso: string) {
  if (typeof window === "undefined") return recurso;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
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

function PainelPropriedades({ pacote, camada: c, fundo, medidor, despachar, camadasPagina }: PropsPainel) {
  if (!c) {
    return (
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Página</h3>
          <CorCampo id="fundo" rotulo="Cor de fundo" valor={fundo} onMudar={(cor) => despachar({ tipo: "fundo", cor })} />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Acrescentar</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => despachar({ tipo: "adicionar", camada: "texto" })}><Type className="mr-1.5 h-4 w-4" />Texto</Button>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => despachar({ tipo: "adicionar", camada: "ret" })}><Square className="mr-1.5 h-4 w-4" />Ret.</Button>
            <Button variant="outline" className="h-11 lg:h-9" onClick={() => despachar({ tipo: "adicionar", camada: "elipse" })}><Circle className="mr-1.5 h-4 w-4" />Elipse</Button>
          </div>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Camadas <span className="font-normal text-muted-foreground">(da frente para trás)</span></h3>
          <ul className="space-y-1">
            {[...camadasPagina].sort((a, b) => b.z - a.z).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => despachar({ tipo: "selecionar", id: x.id })}
                  className="flex min-h-11 lg:min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {x.tipo === "texto" ? <Type className="h-4 w-4 text-muted-foreground" /> : x.tipo === "imagem" ? <ScanSearch className="h-4 w-4 text-muted-foreground" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  <span className="truncate">{x.nome ?? NOME_TIPO[x.tipo]}</span>
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
        <h3 className="truncate text-sm font-semibold">{c.nome ?? NOME_TIPO[c.tipo]}</h3>
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
            <Numero id="linha" rotulo="Entrelinha" valor={c.estilo.linha} min={0.8} max={3} passo={0.05} onMudar={(n) => alterar({ estilo: { ...c.estilo, linha: n } } as Partial<Camada>)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="peso" rotulo="Peso">
              <Select value={String(c.estilo.peso)} onValueChange={(v) => alterar({ estilo: { ...c.estilo, peso: Number(v) as 400 | 700 } } as Partial<Camada>)}>
                <SelectTrigger id="peso" className="h-11 lg:h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="400">Normal</SelectItem><SelectItem value="700">Negrito</SelectItem></SelectContent>
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

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição e tamanho</h4>
        <div className="grid grid-cols-2 gap-3">
          <Numero id="x" rotulo="X" valor={c.x} min={-LARGURA} max={LARGURA * 2} onMudar={(n) => alterar({ x: n })} />
          <Numero id="y" rotulo="Y" valor={c.y} min={-ALTURA} max={ALTURA * 2} onMudar={(n) => alterar({ y: n })} />
          <Numero id="w" rotulo="Largura" valor={c.w} min={20} max={LARGURA * 2} onMudar={(n) => alterar({ w: n })} />
          <Numero id="h" rotulo="Altura" valor={c.h} min={20} max={ALTURA * 2} onMudar={(n) => alterar({ h: n })} />
          <Numero id="op" rotulo="Opacidade (%)" valor={Math.round((c.opacidade ?? 1) * 100)} min={0} max={100} onMudar={(n) => alterar({ opacidade: n / 100 })} />
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ordem</h4>
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

interface Comparacao { navegador: string; servidor: string; diferenca: string; fracao: number; ms: number }

// ---------- page ----------

export default function EditorProva() {
  const { user } = useAuth();
  const movel = useIsMobile();
  const [estado, despachar] = useReducer(reduzir, FIXTURES[0], estadoInicial);
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
  const [painelMovel, setPainelMovel] = useState("pagina");
  const areaRef = useRef<HTMLDivElement>(null);
  const ficheiroRef = useRef<HTMLInputElement>(null);
  const corSelecao = useMemo(() => corToken("--primary", "#6366f1"), []);

  const chave = user ? chaveRecuperacao(user.id, "editor-prova", pacote.id, null) : null;

  useEffect(() => {
    carregarMedidor().then(setMedidor).catch((e: Error) => setErroFontes(e.message));
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
    try { setRecuperavel({ guardado_em: r.guardado_em, pacote: validarPacote(r.dados) }); }
    catch { limparRecuperacao(chave); setRecuperavel(null); }
  }, [pacote.id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave locally after edits (never claims server persistence).
  useEffect(() => {
    if (!chave || estado.passado.length === 0) return;
    const t = setTimeout(() => guardarRecuperacao(chave, pacote), 600);
    return () => clearTimeout(t);
  }, [pacote, chave, estado.passado.length]);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [movel, preview]);

  const escalaAjuste = Math.max(ZOOM_MIN, Math.min((area.w - 32) / LARGURA, (area.h - 32) / ALTURA));
  const escala = zoom === "ajustar" ? escalaAjuste : zoom;
  const definirZoom = useCallback((f: (z: number) => number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(f(z === "ajustar" ? escalaAjuste : z) * 100) / 100))), [escalaAjuste]);

  const paginas = pacote.variantes[variante].paginas;
  const paginaAtual = paginas[pagina];
  const camada = paginaAtual?.camadas.find((c) => c.id === selecao) ?? null;

  useEffect(() => { if (movel && selecao) setPainelMovel("camada"); }, [selecao, movel]);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { if (emCampo(e)) return; e.preventDefault(); despachar({ tipo: e.shiftKey ? "refazer" : "desfazer" }); return; }
      if (mod && e.key.toLowerCase() === "y") { if (emCampo(e)) return; e.preventDefault(); despachar({ tipo: "refazer" }); return; }
      if (emCampo(e)) return;
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
  }, [selecao, camada, preview, definirZoom]);

  const abrirFixture = (id: string) => {
    const f = FIXTURES.find((x) => x.id === id);
    if (f) { despachar({ tipo: "carregar", pacote: f }); setZoom("ajustar"); }
  };

  const exportarJson = () => {
    descarregar(new Blob([JSON.stringify(pacote, null, 2)], { type: "application/json" }), `${pacote.id}.documento-grafico.json`);
    toast.success("JSON exportado.");
  };

  const importarJson = async (f: File) => {
    try {
      if (f.size > 5_000_000) throw new Error("O ficheiro tem mais de 5 MB.");
      const p = validarPacote(JSON.parse(await f.text()));
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
      const { fracao, diferenca } = await compararPng(navegador, servidor);
      setComparacao({ navegador, servidor, diferenca, fracao, ms });
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={comparar} disabled={!medidor || comparando}><ScanSearch className="mr-2 h-4 w-4" />Comparar com o servidor</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const seletorDoc = (
    <Select value={FIXTURES.some((f) => f.id === pacote.id) ? pacote.id : "__importado__"} onValueChange={abrirFixture}>
      <SelectTrigger className="h-11 lg:h-9 w-full lg:w-72" aria-label="Documento de teste"><SelectValue /></SelectTrigger>
      <SelectContent>
        {FIXTURES.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
        {!FIXTURES.some((f) => f.id === pacote.id) && <SelectItem value="__importado__" disabled>{pacote.nome} (importado)</SelectItem>}
      </SelectContent>
    </Select>
  );

  const seletorVariante = (
    <ToggleGroup type="single" variant="outline" value={variante} onValueChange={(v) => v && despachar({ tipo: "variante", variante: v as "A" | "B" })} aria-label="Variante visual">
      <ToggleGroupItem value="A" className="h-11 min-w-11 lg:h-9 lg:min-w-9" aria-label="Variante A">A</ToggleGroupItem>
      <ToggleGroupItem value="B" className="h-11 min-w-11 lg:h-9 lg:min-w-9" aria-label="Variante B">B</ToggleGroupItem>
    </ToggleGroup>
  );

  const miniaturas = (horizontal: boolean) => (
    <ol className={horizontal ? "flex gap-2 overflow-x-auto px-3 py-2" : "space-y-3 p-3"} aria-label="Páginas">
      {paginas.map((p, i) => (
        <li key={p.id} className={horizontal ? "shrink-0" : ""}>
          <button type="button" onClick={() => despachar({ tipo: "pagina", indice: i })} aria-current={i === pagina ? "page" : undefined} aria-label={`Página ${i + 1}`}
            className={`group block rounded-md p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === pagina ? "ring-2 ring-primary" : "hover:bg-muted"}`}>
            <div className="pointer-events-none overflow-hidden rounded-sm border border-border">
              {medidor && <PaginaCanvas pacote={pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={horizontal ? 0.06 : 0.14} />}
            </div>
            <span className="mt-1 block text-center text-xs tabular-nums text-muted-foreground">{i + 1}</span>
          </button>
        </li>
      ))}
    </ol>
  );

  const acoesPagina = (
    <div className="grid grid-cols-4 gap-1">
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Duplicar página" title="Duplicar página" disabled={paginas.length >= 20} onClick={() => despachar({ tipo: "duplicarPagina", indice: pagina })}><Copy className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Mover página para cima" title="Mover para cima" disabled={pagina === 0} onClick={() => despachar({ tipo: "moverPagina", de: pagina, para: pagina - 1 })}><ArrowUp className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8" aria-label="Mover página para baixo" title="Mover para baixo" disabled={pagina === paginas.length - 1} onClick={() => despachar({ tipo: "moverPagina", de: pagina, para: pagina + 1 })}><ArrowDown className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-11 w-full lg:h-8 text-destructive hover:text-destructive" aria-label="Apagar página" title="Apagar página" disabled={paginas.length <= 1} onClick={() => despachar({ tipo: "apagarPagina", indice: pagina })}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );

  const tela = (
    <div ref={areaRef} className="relative min-h-0 flex-1 overflow-auto bg-muted" onPointerDown={(e) => { if (e.target === e.currentTarget) despachar({ tipo: "selecionar", id: null }); }}>
      <div className="flex min-h-full min-w-full items-center justify-center p-4" style={{ width: LARGURA * escala + 32, height: ALTURA * escala + 32 }}>
        <div className="shadow-lg ring-1 ring-border" aria-label={`Página ${pagina + 1} de ${paginas.length}, variante ${variante}, 1080 por 1350`} role="img">
          {medidor ? (
            <PaginaCanvas pacote={pacote} variante={variante} indice={pagina} medidor={medidor} imagens={imagens} escala={escala}
              interativo={!preview} selecao={preview ? null : selecao} toque={movel} corSelecao={corSelecao}
              onSelecionar={(id) => despachar({ tipo: "selecionar", id })}
              onAlterar={(id, patch) => despachar({ tipo: "camada", id, patch })} />
          ) : (
            <div className="flex items-center justify-center bg-background text-sm text-muted-foreground" style={{ width: LARGURA * escala, height: ALTURA * escala }}>
              <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A carregar o tipo de letra…
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

  const propriedades = medidor && paginaAtual && (
    <PainelPropriedades pacote={pacote} camada={camada} fundo={paginaAtual.fundo} medidor={medidor} despachar={despachar} camadasPagina={paginaAtual.camadas} />
  );

  const dialogoComparacao = (
    <Dialog open={comparando || !!comparacao || !!erroComparacao} onOpenChange={(o) => { if (!o) { setComparacao(null); setErroComparacao(null); } }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Navegador vs. servidor</DialogTitle>
          <DialogDescription>Página {pagina + 1}, variante {variante}. Limiar: até {LIMIAR_EQUIVALENCIA * 100}% de píxeis diferentes (tolerância 48 por canal).</DialogDescription>
        </DialogHeader>
        {comparando && <p className="flex items-center text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A renderizar nos dois lados…</p>}
        {erroComparacao && <p role="alert" className="text-sm text-destructive">Não foi possível renderizar no servidor: {erroComparacao}</p>}
        {comparacao && (
          <div className="space-y-3">
            <p className="text-sm" role="status">
              <strong className={comparacao.fracao <= LIMIAR_EQUIVALENCIA ? "text-foreground" : "text-destructive"}>
                {comparacao.fracao <= LIMIAR_EQUIVALENCIA ? "Equivalente" : "Diferente"}
              </strong>{" "}
              — {(comparacao.fracao * 100).toFixed(3)}% de píxeis diferentes · servidor em {comparacao.ms} ms
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

  if (movel) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] flex-col">
        {inputFicheiro}
        <header className="space-y-2 border-b border-border bg-background px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold">Editor de carrosséis <span className="font-normal text-muted-foreground">· prova</span></h1>
            <div className="flex items-center gap-1">
              {barraAcoes}
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Pré-visualizar" onClick={() => { setPreview(true); setZoom("ajustar"); }}><Eye className="h-4 w-4" /></Button>
              {menuDocumento}
            </div>
          </div>
          <div className="flex items-center gap-2">{seletorDoc}{seletorVariante}</div>
        </header>
        {avisoRecuperacao}
        {tela}
        <div className="flex items-center justify-between border-t border-border bg-background px-2">{zoomControlos}</div>
        <div className="border-t border-border bg-background">{miniaturas(true)}</div>
        <section className="max-h-[42dvh] overflow-y-auto border-t border-border bg-background pb-[env(safe-area-inset-bottom)]" aria-label="Ferramentas">
          <Tabs value={painelMovel} onValueChange={setPainelMovel}>
            <TabsList className="sticky top-0 z-10 grid h-12 w-full grid-cols-2 rounded-none">
              <TabsTrigger value="pagina" className="h-10">Página</TabsTrigger>
              <TabsTrigger value="camada" className="h-10" disabled={!camada}>Camada</TabsTrigger>
            </TabsList>
            <TabsContent value="pagina" className="space-y-4 p-3">
              {acoesPagina}
              {medidor && paginaAtual && <PainelPropriedades pacote={pacote} camada={null} fundo={paginaAtual.fundo} medidor={medidor} despachar={despachar} camadasPagina={paginaAtual.camadas} />}
            </TabsContent>
            <TabsContent value="camada" className="p-3">{camada && propriedades}</TabsContent>
          </Tabs>
        </section>
        {dialogoComparacao}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {inputFicheiro}
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2">
        <h1 className="mr-2 text-base font-semibold">Editor de carrosséis <span className="font-normal text-muted-foreground">· prova isolada</span></h1>
        {seletorDoc}
        {seletorVariante}
        <div className="mx-1 h-6 w-px bg-border" aria-hidden />
        {barraAcoes}
        <div className="ml-auto flex items-center gap-2">
          {zoomControlos}
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setPreview(true); setZoom("ajustar"); }}><Eye className="mr-1.5 h-4 w-4" />Pré-visualizar</Button>
          {menuDocumento}
        </div>
      </header>
      {avisoRecuperacao}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-44 shrink-0 flex-col border-r border-border bg-background" aria-label="Páginas">
          <div className="min-h-0 flex-1 overflow-y-auto">{miniaturas(false)}</div>
          <div className="border-t border-border p-2">{acoesPagina}</div>
        </aside>
        {tela}
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-background p-4" aria-label="Propriedades">
          {propriedades}
        </aside>
      </div>
      {dialogoComparacao}
    </div>
  );
}
