import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { Circle, Image as ImageIcon, ImageOff, Loader2, Upload, Minus, Palette, Shapes, Square, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { lerAssets, listarImagens, registarImagem, type AssetMotor, type ImagemBiblioteca } from "@/services/motor";
import { ACEITAR_CARREGAR, carregarFicheiro } from "./carregar";
import { GeradorKie } from "@/features/motor/GeradorKie";
import { PesquisaFotos } from "@/features/motor/PesquisaFotos";
import type { Asset } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS, type Estilo } from "../../../supabase/functions/_shared/motor/estilos";
import type { Acao, PresetTexto } from "./estado";

export type AbaInserir = "texto" | "imagens" | "elementos" | "estilos";
export const ABAS_INSERIR: { id: AbaInserir; nome: string; icone: typeof Type }[] = [
  { id: "texto", nome: "Texto", icone: Type },
  { id: "imagens", nome: "Imagens", icone: ImageIcon },
  { id: "elementos", nome: "Elementos", icone: Shapes },
  { id: "estilos", nome: "Direção visual", icone: Palette },
];

/** Drag payload understood by the canvas drop zone. */
export type Inserivel =
  | { tipo: "texto"; preset: PresetTexto }
  | { tipo: "forma"; forma: "ret" | "elipse" | "linha" }
  | { tipo: "biblioteca"; media_id: string; nome: string };
export const MIME_INSERIR = "application/x-mc-inserir";

/** Copies a library image into the project's immutable engine assets and returns the verified asset. */
export async function resolverBiblioteca(projectId: string, mediaId: string, nome: string): Promise<{ asset: Asset; nome: string }> {
  const id = (await registarImagem(projectId, mediaId)).asset.id;
  const a = (await lerAssets(projectId, [id])).assets[id];
  if (!a) throw new Error("A imagem já não está disponível. Escolhe outra.");
  return { asset: a, nome };
}

function Arrastavel({ dados, onClick, children, rotulo, className }: { dados: Inserivel; onClick: () => void; children: ReactNode; rotulo: string; className?: string }) {
  const iniciar = (e: DragEvent) => { e.dataTransfer.setData(MIME_INSERIR, JSON.stringify(dados)); e.dataTransfer.effectAllowed = "copy"; };
  return (
    <button type="button" draggable onDragStart={iniciar} onClick={onClick} aria-label={rotulo} title={`${rotulo} — clica ou arrasta para a página`}
      className={cn("mc-trans flex min-h-11 w-full cursor-grab items-center gap-2 rounded-[var(--mc-r-md)] border border-border px-3 text-left hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing", className)}>
      {children}
    </button>
  );
}

interface Props {
  aba: AbaInserir;
  despachar: (a: Acao) => void;
  onImagem: (r: { asset: Asset; nome: string }) => void;
  /** Real work only: enables the inline library and Kie. */
  projectId?: string;
  /** Prefilled AI prompt from the Image panel; opens the AI tab. */
  promptIA?: string;
  /** Opens a given image tab (from the slide Image panel) with suggested stock terms. */
  subImagens?: { aba: "biblioteca" | "fotos" | "carregar" | "ia"; n: number };
  termoFotos?: string;
  /** Fallback picker (proof editor). */
  pedirImagem?: () => void;
  onEstilo: (e: Estilo) => void;
  /** Style currently saved for this carousel, and extra controls (palette, breaks) shown under the list. */
  estiloAtual?: string | null;
  extraEstilos?: React.ReactNode;
  /** Opens the Design step on this slide's five compositions (real work only). */
  onComposicoes?: () => void;
  /** When set, the chosen asset replaces this image layer instead of adding a new one. */
  substituirImagemId?: string | null;
}

export function PainelInserir({ aba, despachar, onImagem, projectId, pedirImagem, onEstilo, onComposicoes, estiloAtual, extraEstilos, promptIA, subImagens, termoFotos, substituirImagemId }: Props) {
  const [bib, setBib] = useState<ImagemBiblioteca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aUsar, setAUsar] = useState<string | null>(null);
  const [sub, setSub] = useState<"biblioteca" | "fotos" | "carregar" | "ia">(subImagens?.aba ?? (promptIA ? "ia" : "biblioteca"));
  useEffect(() => { if (subImagens) setSub(subImagens.aba); }, [subImagens]);
  useEffect(() => { if (promptIA) setSub("ia"); }, [promptIA]);
  const [carregadas, setCarregadas] = useState<AssetMotor[] | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [sobre, setSobre] = useState(false);
  const [busca, setBusca] = useState("");
  const [mostrar, setMostrar] = useState(12);

  useEffect(() => {
    if (aba !== "imagens" || !projectId || bib) return;
    listarImagens(projectId).then((d) => { setBib(d.biblioteca); setCarregadas(d.assets.filter((a) => a.origem === "upload")); }).catch((e: Error) => setErro(e.message));
  }, [aba, projectId, bib]);

  const usar = async (chave: string, nome: string, obter: () => Promise<string>) => {
    if (!projectId) return;
    setAUsar(chave); setErro(null);
    try {
      const id = await obter();
      const a = (await lerAssets(projectId, [id])).assets[id];
      if (!a) throw new Error("A imagem já não está disponível. Escolhe outra.");
      onImagem({ asset: a, nome });
    } catch (e) { setErro((e as Error).message); } finally { setAUsar(null); }
  };

  const carregar = async (f: File | undefined | null) => {
    if (!f || !projectId || aCarregar) return;
    setACarregar(true); setErroCarregar(null);
    try {
      const r = await carregarFicheiro(projectId, f);
      setCarregadas((l) => [{ id: r.asset.id, media_id: null, origem: "upload", nome: r.nome, largura: r.asset.largura, altura: r.asset.altura, bytes: 0, mime: r.asset.mime, criado_em: new Date().toISOString() }, ...(l ?? []).filter((x) => x.id !== r.asset.id)]);
      onImagem(r);
    } catch (e) { setErroCarregar((e as Error).message); } finally { setACarregar(false); }
  };

  if (aba === "texto") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Clica para acrescentar ou arrasta para o sítio certo da página.</p>
        <Arrastavel rotulo="Acrescentar título" dados={{ tipo: "texto", preset: "titulo" }} onClick={() => despachar({ tipo: "adicionar", camada: "texto", preset: "titulo" })}><span className="text-lg font-bold">Título</span></Arrastavel>
        <Arrastavel rotulo="Acrescentar subtítulo" dados={{ tipo: "texto", preset: "subtitulo" }} onClick={() => despachar({ tipo: "adicionar", camada: "texto", preset: "subtitulo" })}><span className="text-base font-semibold">Subtítulo</span></Arrastavel>
        <Arrastavel rotulo="Acrescentar parágrafo" dados={{ tipo: "texto", preset: "paragrafo" }} onClick={() => despachar({ tipo: "adicionar", camada: "texto", preset: "paragrafo" })}><span className="text-sm">Parágrafo de texto</span></Arrastavel>
      </div>
    );
  }
  if (aba === "elementos") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <Arrastavel rotulo="Retângulo" className="flex-col justify-center py-2" dados={{ tipo: "forma", forma: "ret" }} onClick={() => despachar({ tipo: "adicionar", camada: "ret" })}><Square className="h-5 w-5" /><span className="text-xs">Retângulo</span></Arrastavel>
        <Arrastavel rotulo="Elipse" className="flex-col justify-center py-2" dados={{ tipo: "forma", forma: "elipse" }} onClick={() => despachar({ tipo: "adicionar", camada: "elipse" })}><Circle className="h-5 w-5" /><span className="text-xs">Elipse</span></Arrastavel>
        <Arrastavel rotulo="Linha" className="flex-col justify-center py-2" dados={{ tipo: "forma", forma: "linha" }} onClick={() => despachar({ tipo: "adicionar", camada: "linha" })}><Minus className="h-5 w-5" /><span className="text-xs">Linha</span></Arrastavel>
      </div>
    );
  }
  if (aba === "estilos") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{estiloAtual !== undefined ? "Estilo guardado deste carrossel. Trocar aplica a composição completa do estilo com a mesma paleta; o texto não muda e podes desfazer." : "Aplica cores e letras a esta variante. O texto não muda; podes desfazer."}</p>
        <ul className="space-y-1.5">
          {ESTILOS.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onEstilo(e)} aria-pressed={estiloAtual === e.id} className={`mc-trans flex min-h-11 w-full items-center gap-2 rounded-[var(--mc-r-md)] border px-3 text-left text-sm hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${estiloAtual === e.id ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                <span className="flex shrink-0 overflow-hidden rounded-sm border border-border" aria-hidden>
                  {[e.paleta.fundo, e.paleta.titulo, e.paleta.destaque].map((c) => <span key={c} className="h-5 w-3" style={{ background: c }} />)}
                </span>
                <span className="min-w-0"><span className="block font-medium">{e.nome}</span><span className="block truncate text-xs text-muted-foreground">{e.descricao}</span></span>
              </button>
            </li>
          ))}
        </ul>
        {extraEstilos}
        {onComposicoes && <Button variant="outline" className="h-11 w-full" onClick={onComposicoes}>Composições deste slide…</Button>}
        {onComposicoes && <p className="text-xs text-muted-foreground">Abre o Design com este slide escolhido; o que já fizeste fica guardado.</p>}
      </div>
    );
  }
  // imagens
  if (!projectId) {
    return pedirImagem ? <Button variant="outline" className="h-11 w-full" onClick={pedirImagem}><ImageIcon className="mr-1.5 h-4 w-4" />Adicionar imagem</Button> : <p className="text-sm text-muted-foreground">Sem biblioteca neste documento.</p>;
  }
  const q = busca.trim().toLocaleLowerCase("pt-PT");
  const lista = bib ? (q ? bib.filter((m) => m.file_name.toLocaleLowerCase("pt-PT").includes(q)) : bib) : [];
  return (
    <div className="space-y-3">
      {substituirImagemId && <p className="rounded-[var(--mc-r-md)] bg-primary/10 px-2.5 py-2 text-xs font-medium text-foreground">A próxima imagem substitui a imagem selecionada. A composição mantém-se.</p>}
      <div role="tablist" aria-label="Origem da imagem" className="grid grid-cols-4 gap-1 rounded-[var(--mc-r-md)] bg-muted p-1">
        {([["biblioteca", "Biblioteca"], ["fotos", "Fotos"], ["carregar", "Carregar"], ["ia", "IA"]] as const).map(([id, n]) => (
          <button key={id} type="button" role="tab" aria-selected={sub === id} onClick={() => setSub(id)}
            className={cn("min-h-9 rounded-sm text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", sub === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{n}</button>
        ))}
      </div>
      {sub === "carregar" && (
        <div className="space-y-2">
          <label
            onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setSobre(true); } }}
            onDragLeave={() => setSobre(false)}
            onDrop={(e) => { e.preventDefault(); setSobre(false); void carregar(e.dataTransfer.files[0]); }}
            className={cn("flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--mc-r-md)] border border-dashed px-3 py-3 text-center text-sm focus-within:ring-2 focus-within:ring-ring", sobre ? "border-foreground bg-muted" : "border-border")}>
            {aCarregar ? <Loader2 className="h-5 w-5 motion-safe:animate-spin" /> : <Upload className="h-5 w-5" />}
            <span className="font-medium">{aCarregar ? "A carregar…" : "Escolher ficheiro"}</span>
            <span className="text-xs text-muted-foreground">ou arrasta para aqui ou para a página · JPG, PNG ou WebP até 10 MB</span>
            <input type="file" accept={ACEITAR_CARREGAR} className="sr-only" disabled={aCarregar} aria-label="Carregar imagem"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void carregar(f); }} />
          </label>
          <p className="text-xs text-muted-foreground">A imagem fica guardada neste projeto como «carregada por ti». Confirma que tens direito a usá-la.</p>
          {erroCarregar && <p role="alert" className="text-sm text-destructive">{erroCarregar}</p>}
          {carregadas && carregadas.length > 0 && (
            <ul className="space-y-1" aria-label="Imagens carregadas neste projeto">
              {carregadas.slice(0, 12).map((a) => (
                <li key={a.id}>
                  <button type="button" disabled={!!aUsar} onClick={() => usar(a.id, a.nome ?? "Imagem carregada", async () => a.id)}
                    className="mc-trans flex min-h-11 w-full items-center gap-2 rounded-[var(--mc-r-md)] border border-border px-3 text-left text-sm hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
                    {aUsar === a.id ? <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" /> : <ImageIcon className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{(a.nome ?? "Imagem").replace(/^Carregada por ti · /, "")}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{a.largura}×{a.altura}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {sub === "fotos" && <PesquisaFotos key={termoFotos ?? ""} projectId={projectId} usar={usar} ocupado={!!aUsar} aUsar={aUsar} termoInicial={termoFotos} compacto />}
      {sub === "ia" && <GeradorKie key={promptIA ?? ""} projectId={projectId} usar={usar} ocupado={!!aUsar} promptInicial={promptIA} />}
      {sub === "biblioteca" && <>
      <p className="text-xs text-muted-foreground">Clica para usar como fundo ou arrasta para a página.</p>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      {!bib && !erro && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" />A carregar imagens…</p>}
      {bib && bib.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImageOff className="h-4 w-4" />Ainda não há imagens na tua biblioteca.</p>}
      {bib && bib.length > 0 && (
        <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setMostrar(12); }} placeholder="Procurar pelo nome" aria-label="Procurar imagens"
          className="h-10 w-full rounded-[var(--mc-r-md)] border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      )}
      {bib && bib.length > 0 && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma imagem com esse nome.</p>}
      {lista.length > 0 && (
        <ul className="grid grid-cols-2 gap-2" aria-label="Imagens da biblioteca">
          {lista.slice(0, mostrar).map((m) => (
            <li key={m.id}>
              <button type="button" draggable disabled={!!aUsar}
                onDragStart={(e) => { e.dataTransfer.setData(MIME_INSERIR, JSON.stringify({ tipo: "biblioteca", media_id: m.id, nome: m.file_name } satisfies Inserivel)); e.dataTransfer.effectAllowed = "copy"; }}
                onClick={() => usar(m.id, m.file_name, async () => (await registarImagem(projectId, m.id)).asset.id)}
                className="relative block aspect-square w-full cursor-grab overflow-hidden rounded-[var(--mc-r-md)] border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                aria-label={`Usar ${m.file_name}`}>
                <img src={m.thumbnail_url ?? m.file_url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                {aUsar === m.id && <span className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-5 w-5 motion-safe:animate-spin" /></span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {lista.length > mostrar && <Button variant="outline" className="h-10 w-full" onClick={() => setMostrar((n) => n + 12)}>Mostrar mais ({lista.length - mostrar})</Button>}
      </>}
    </div>
  );
}
