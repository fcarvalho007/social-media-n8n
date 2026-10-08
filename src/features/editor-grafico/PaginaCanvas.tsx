import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Ellipse, Group, Image as KImage, Layer, Line, Path, Rect, Shape, Stage, Transformer } from "react-konva";
import { encaixar } from "./operacoes";
import {
  ALTURA, ICONES, LARGURA, calcularRecorte, tracarMascara, rgba, camadasOrdenadas, resolverTexto,
  type Camada, type Medidor, type PacoteProva, type Variante,
} from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { desenharTexto, limitesConteudo, propsGradiente } from "./desenho";
import { elementosTocados, normalizarArea, type Area } from "./selecaoArea";

interface Props {
  pacote: PacoteProva;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  imagens: Record<string, HTMLImageElement>;
  escala: number;
  interativo?: boolean;
  selecao?: string | null;
  selecoes?: string[];
  /** Animation companions keyed by animacao_id; used only when reproduzir is on. */
  videos?: Record<string, HTMLVideoElement>;
  /** Play animated stickers on the canvas (drag/select/editing is paused by the caller). */
  reproduzir?: boolean;
  onSelecionar?: (id: string | null) => void;
  onSelecionarVarios?: (ids: string[]) => void;
  onAlterar?: (id: string, patch: Partial<Camada>) => void;
  /** Bigger handles for touch screens. */
  toque?: boolean;
  /** Colour of the selection frame (from the design tokens). */
  corSelecao?: string;
  /** Snap to page edges/centre and other layers while dragging. */
  encaixe?: boolean;
  /** Double click / double tap on a text layer: open inline editing. */
  onEditarTexto?: (id: string) => void;
}

/** One animated sticker: redraws the layer every frame while the <video> advances. */
function CamadaVideo({ video, k }: { video: HTMLVideoElement; k: { dx: number; dy: number; dw: number; dh: number; sx: number; sy: number; sw: number; sh: number } }) {
  const ref = useRef<Konva.Image>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => { ref.current?.getLayer()?.batchDraw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <KImage ref={ref} image={video} x={k.dx} y={k.dy} width={k.dw} height={k.dh} crop={{ x: k.sx, y: k.sy, width: k.sw, height: k.sh }} />;
}

function Conteudo({ c, pacote, medidor, imagens, videos, reproduzir }: { c: Camada; pacote: PacoteProva; medidor: Medidor; imagens: Record<string, HTMLImageElement>; videos?: Record<string, HTMLVideoElement>; reproduzir?: boolean }) {
  if (c.tipo === "forma") {
    if (c.forma === "gradiente") return <Rect width={c.w} height={c.h} {...propsGradiente(c)} />;
    if (c.forma === "icone") return <><Rect width={c.w} height={c.h} fill="transparent" /><Path data={ICONES[c.estilo.icone ?? "seta"]} scaleX={c.w / 24} scaleY={c.h / 24} fill={c.estilo.cor} fillRule="evenodd" /></>;
    return c.forma === "ret"
      ? <Rect width={c.w} height={c.h} cornerRadius={c.estilo.raio ?? 0} fill={c.estilo.cor} />
      : <Ellipse x={c.w / 2} y={c.h / 2} radiusX={c.w / 2} radiusY={c.h / 2} fill={c.estilo.cor} />;
  }
  if (c.tipo === "imagem") {
    const a = pacote.assets?.[c.asset_id];
    // Previews built without asset bytes (library covers) show a neutral block, never crash.
    if (!a) return <Rect width={c.w} height={c.h} fill="#d9dcd6" />;
    const k = calcularRecorte(a, c);
    // Playing an animated sticker uses the same crop; the cover has the video's exact dimensions.
    const video = reproduzir && c.animacao_id ? videos?.[c.animacao_id] : undefined;
    return (
      <>
        <Rect width={c.w} height={c.h} fill="transparent" />
        {(video || imagens[c.asset_id]) && (
          <Group clipFunc={c.mascara ? (ctx) => { tracarMascara(ctx, c.mascara!, c.w, c.h); } : undefined}>
            {video
              ? <CamadaVideo video={video} k={k} />
              : <KImage image={imagens[c.asset_id]} x={k.dx} y={k.dy} width={k.dw} height={k.dh} crop={{ x: k.sx, y: k.sy, width: k.sw, height: k.sh }} />}
          </Group>
        )}
      </>
    );
  }
  const texto = resolverTexto(c, pacote.conteudo);
  return (
    <>
      <Rect width={c.w} height={c.h} fill="transparent" />
      <Shape width={c.w} height={c.h} listening={false} sceneFunc={(ctx) => { desenharTexto(ctx, c, texto, medidor); }} />
    </>
  );
}

export function PaginaCanvas({ pacote, variante, indice, medidor, imagens, escala, interativo = false, selecao = null, selecoes = [], onSelecionar, onSelecionarVarios, onAlterar, toque = false, corSelecao = "#f59e0b", encaixe = false, onEditarTexto, videos, reproduzir = false }: Props) {
  const [guias, setGuias] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [sobrevoo, setSobrevoo] = useState<string | null>(null);
  const { largura: LARGURA, altura: ALTURA } = pacote.variantes[variante];
  const pagina = pacote.variantes[variante].paginas[indice];
  const trRef = useRef<Konva.Transformer>(null);
  const nos = useRef(new Map<string, Konva.Group>());
  const [area, setArea] = useState<Area | null>(null);
  const inicioArea = useRef<{ x: number; y: number } | null>(null);
  // A second click on an already-selected text opens editing (first click only selects).
  const jaSelecionado = useRef(false);
  const medidas = toque
    ? { anchorSize: 28, anchorCornerRadius: 14, borderStrokeWidth: 2 }
    : { anchorSize: 9, anchorCornerRadius: 4.5, borderStrokeWidth: 1.5 };

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const ids = selecoes.length ? selecoes : selecao ? [selecao] : [];
    tr.nodes(ids.flatMap((id) => { const no = nos.current.get(id); return no ? [no] : []; }));
    tr.getLayer()?.batchDraw();
  }, [selecao, selecoes, pagina]);

  if (!pagina) return null;

  return (
    <Stage width={Math.round(LARGURA * escala)} height={Math.round(ALTURA * escala)} scaleX={escala} scaleY={escala} listening={interativo}
      onMouseDown={(e) => { if (!interativo || e.target.name() !== "fundo-pagina") return; const p = e.target.getStage()?.getPointerPosition(); if (!p) return; inicioArea.current = { x: p.x / escala, y: p.y / escala }; setArea({ ...inicioArea.current, w: 0, h: 0 }); }}
      onMouseMove={(e) => { const ini = inicioArea.current, p = e.target.getStage()?.getPointerPosition(); if (ini && p) setArea({ x: ini.x, y: ini.y, w: p.x / escala - ini.x, h: p.y / escala - ini.y }); }}
      onMouseUp={() => { if (!area) return; const caixas = pagina.camadas.map((c) => { const l = limitesConteudo(c, c.tipo === "texto" ? resolverTexto(c, pacote.conteudo) : "", medidor); return { id: c.id, x: c.x + l.x, y: c.y + l.y, w: l.w, h: l.h }; }); const ids = elementosTocados(area, caixas); if (ids.length) onSelecionarVarios?.(ids); else onSelecionar?.(null); inicioArea.current = null; setArea(null); }}>
      <Layer>
        <Rect name="fundo-pagina" width={LARGURA} height={ALTURA} fill={pagina.fundo} onTouchStart={() => onSelecionar?.(null)} />
        {camadasOrdenadas(pagina).map((c) => {
          const lim = limitesConteudo(c, c.tipo === "texto" ? resolverTexto(c, pacote.conteudo) : "", medidor);
          return (
            <Group
              key={c.id}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              opacity={c.opacidade ?? 1}
              draggable={interativo}
               onMouseDown={(e) => { e.cancelBubble = true; jaSelecionado.current = selecao === c.id; onSelecionar?.(c.id); }}
              onTouchStart={() => { jaSelecionado.current = selecao === c.id; onSelecionar?.(c.id); }}
              onClick={() => { if (interativo && c.tipo === "texto" && jaSelecionado.current) onEditarTexto?.(c.id); }}
              onTap={() => { if (interativo && c.tipo === "texto" && jaSelecionado.current) onEditarTexto?.(c.id); }}
              onDblClick={() => { if (interativo && c.tipo === "texto") onEditarTexto?.(c.id); }}
              onDblTap={() => { if (interativo && c.tipo === "texto") onEditarTexto?.(c.id); }}
              onMouseEnter={(e) => { if (!interativo) return; setSobrevoo(c.id); const s = e.target.getStage(); if (s) s.container().style.cursor = c.tipo === "texto" && selecao === c.id ? "text" : "move"; }}
              onMouseLeave={(e) => { if (!interativo) return; setSobrevoo((a) => (a === c.id ? null : a)); const s = e.target.getStage(); if (s) s.container().style.cursor = "default"; }}
              onDragMove={(e) => {
                if (!encaixe) return;
                const r = encaixar(e.target.x() + lim.x, e.target.y() + lim.y, lim.w, lim.h, pagina.camadas.filter((o) => o.id !== c.id), 10 / Math.max(escala, 0.1) * 0.5 + 4, { largura: LARGURA, altura: ALTURA });
                e.target.position({ x: r.x - lim.x, y: r.y - lim.y });
                setGuias({ x: r.guiasX, y: r.guiasY });
              }}
              onDragEnd={(e) => { setGuias({ x: [], y: [] }); onAlterar?.(c.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }); }}
            >
              <Group
                ref={(n) => { if (n) nos.current.set(c.id, n); else nos.current.delete(c.id); }}
                x={lim.x}
                y={lim.y}
                width={lim.w}
                height={lim.h}
                onTransformEnd={(e) => {
                  const n = e.target;
                  const sx = n.scaleX(), sy = n.scaleY();
                  const w = Math.max(20, Math.round(c.w * sx));
                  const h = Math.max(20, Math.round(c.h * sy));
                  const x = Math.round(c.x + n.x() - lim.x * sx);
                  const y = Math.round(c.y + n.y() - lim.y * sy);
                  n.scale({ x: 1, y: 1 });
                  n.position({ x: lim.x, y: lim.y });
                  onAlterar?.(c.id, { x, y, w, h });
                }}
              >
                {/* Hit area: the visible content bounds are what receives clicks (content itself does not listen). */}
                <Rect width={lim.w} height={lim.h} fill="transparent" />
                <Group x={-lim.x} y={-lim.y} listening={false}>
                  <Conteudo c={c} pacote={pacote} medidor={medidor} imagens={imagens} videos={videos} reproduzir={reproduzir} />
                </Group>
              </Group>
              {interativo && sobrevoo === c.id && selecao !== c.id && (
                <Rect x={lim.x} y={lim.y} width={lim.w} height={lim.h} stroke={corSelecao} strokeWidth={1 / escala} dash={[5 / escala, 4 / escala]} opacity={0.55} listening={false} />
              )}
            </Group>
          );
        })}
        {guias.x.map((g) => <Line key={`gx${g}`} points={[g, 0, g, ALTURA]} stroke={corSelecao} strokeWidth={1 / escala} dash={[6 / escala, 4 / escala]} listening={false} />)}
        {guias.y.map((g) => <Line key={`gy${g}`} points={[0, g, LARGURA, g]} stroke={corSelecao} strokeWidth={1 / escala} dash={[6 / escala, 4 / escala]} listening={false} />)}
        {area && (() => { const a = normalizarArea(area); return <Rect x={a.x} y={a.y} width={a.w} height={a.h} fill={`${corSelecao}20`} stroke={corSelecao} strokeWidth={1 / escala} dash={[6 / escala, 4 / escala]} listening={false} />; })()}
        {interativo && (
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            keepRatio={false}
            flipEnabled={false}
            // Konva keeps Transformer controls in viewport pixels even when
            // the Stage is scaled. Dividing by zoom makes touch handles grow
            // into large arcs on narrow mobile canvases.
            anchorSize={medidas.anchorSize}
            anchorCornerRadius={medidas.anchorCornerRadius}
            anchorFill="#ffffff"
            anchorStroke={corSelecao}
            anchorStrokeWidth={1.5}
            borderStroke={corSelecao}
            borderStrokeWidth={medidas.borderStrokeWidth}
            ignoreStroke
            boundBoxFunc={(antes, depois) => (depois.width < 20 || depois.height < 20 ? antes : depois)}
          />
        )}
      </Layer>
    </Stage>
  );
}
