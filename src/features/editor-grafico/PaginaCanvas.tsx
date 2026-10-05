import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Ellipse, Group, Image as KImage, Layer, Line, Rect, Shape, Stage, Transformer } from "react-konva";
import { encaixar } from "./operacoes";
import {
  ALTURA, LARGURA, calcularRecorte, camadasOrdenadas, resolverTexto,
  type Camada, type Medidor, type PacoteProva, type Variante,
} from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { desenharTexto } from "./desenho";

interface Props {
  pacote: PacoteProva;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  imagens: Record<string, HTMLImageElement>;
  escala: number;
  interativo?: boolean;
  selecao?: string | null;
  onSelecionar?: (id: string | null) => void;
  onAlterar?: (id: string, patch: Partial<Camada>) => void;
  /** Bigger handles for touch screens. */
  toque?: boolean;
  /** Colour of the selection frame (from the design tokens). */
  corSelecao?: string;
  /** Snap to page edges/centre and other layers while dragging. */
  encaixe?: boolean;
}

function Conteudo({ c, pacote, medidor, imagens }: { c: Camada; pacote: PacoteProva; medidor: Medidor; imagens: Record<string, HTMLImageElement> }) {
  if (c.tipo === "forma") {
    return c.forma === "ret"
      ? <Rect width={c.w} height={c.h} cornerRadius={c.estilo.raio ?? 0} fill={c.estilo.cor} />
      : <Ellipse x={c.w / 2} y={c.h / 2} radiusX={c.w / 2} radiusY={c.h / 2} fill={c.estilo.cor} />;
  }
  if (c.tipo === "imagem") {
    const a = pacote.assets?.[c.asset_id];
    // Previews built without asset bytes (library covers) show a neutral block, never crash.
    if (!a) return <Rect width={c.w} height={c.h} fill="#d9dcd6" />;
    const k = calcularRecorte(a, c);
    return (
      <>
        <Rect width={c.w} height={c.h} fill="transparent" />
        {imagens[c.asset_id] && <KImage image={imagens[c.asset_id]} x={k.dx} y={k.dy} width={k.dw} height={k.dh} crop={{ x: k.sx, y: k.sy, width: k.sw, height: k.sh }} />}
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

export function PaginaCanvas({ pacote, variante, indice, medidor, imagens, escala, interativo = false, selecao = null, onSelecionar, onAlterar, toque = false, corSelecao = "#f59e0b", encaixe = false }: Props) {
  const [guias, setGuias] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const pagina = pacote.variantes[variante].paginas[indice];
  const trRef = useRef<Konva.Transformer>(null);
  const nos = useRef(new Map<string, Konva.Group>());
  const medidas = toque
    ? { anchorSize: 28, anchorCornerRadius: 14, borderStrokeWidth: 2 }
    : { anchorSize: 12, anchorCornerRadius: 2, borderStrokeWidth: 2 };

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const no = selecao ? nos.current.get(selecao) : undefined;
    tr.nodes(no ? [no] : []);
    tr.getLayer()?.batchDraw();
  }, [selecao, pagina]);

  if (!pagina) return null;

  return (
    <Stage width={Math.round(LARGURA * escala)} height={Math.round(ALTURA * escala)} scaleX={escala} scaleY={escala} listening={interativo}>
      <Layer>
        <Rect width={LARGURA} height={ALTURA} fill={pagina.fundo} onMouseDown={() => onSelecionar?.(null)} onTouchStart={() => onSelecionar?.(null)} />
        {camadasOrdenadas(pagina).map((c) => (
          <Group
            key={c.id}
            ref={(n) => { if (n) nos.current.set(c.id, n); else nos.current.delete(c.id); }}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            opacity={c.opacidade ?? 1}
            draggable={interativo}
            onMouseDown={() => onSelecionar?.(c.id)}
            onTouchStart={() => onSelecionar?.(c.id)}
            onDragMove={(e) => {
              if (!encaixe) return;
              const r = encaixar(e.target.x(), e.target.y(), c.w, c.h, pagina.camadas.filter((o) => o.id !== c.id), 10 / Math.max(escala, 0.1) * 0.5 + 4);
              e.target.position({ x: r.x, y: r.y });
              setGuias({ x: r.guiasX, y: r.guiasY });
            }}
            onDragEnd={(e) => { setGuias({ x: [], y: [] }); onAlterar?.(c.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }); }}
            onTransformEnd={(e) => {
              const n = e.target;
              const w = Math.max(20, Math.round(c.w * n.scaleX()));
              const h = Math.max(20, Math.round(c.h * n.scaleY()));
              n.scale({ x: 1, y: 1 });
              onAlterar?.(c.id, { x: Math.round(n.x()), y: Math.round(n.y()), w, h });
            }}
          >
            <Conteudo c={c} pacote={pacote} medidor={medidor} imagens={imagens} />
          </Group>
        ))}
        {guias.x.map((g) => <Line key={`gx${g}`} points={[g, 0, g, ALTURA]} stroke={corSelecao} strokeWidth={1 / escala} dash={[6 / escala, 4 / escala]} listening={false} />)}
        {guias.y.map((g) => <Line key={`gy${g}`} points={[0, g, LARGURA, g]} stroke={corSelecao} strokeWidth={1 / escala} dash={[6 / escala, 4 / escala]} listening={false} />)}
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
            borderStroke={corSelecao}
            anchorStroke={corSelecao}
            borderStrokeWidth={medidas.borderStrokeWidth}
            ignoreStroke
            boundBoxFunc={(antes, depois) => (depois.width < 20 || depois.height < 20 ? antes : depois)}
          />
        )}
      </Layer>
    </Stage>
  );
}
