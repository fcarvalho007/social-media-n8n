// Ajuste manual do enquadramento da faixa 556×200 da imagem da crónica.

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  FAIXA_ALTURA, FAIXA_LARGURA, desenhar, geometria, type EnquadramentoNormal,
} from "./recorte-imagem";

interface Props {
  imagem: HTMLImageElement;
  inicial: EnquadramentoNormal;
  aGuardar: boolean;
  onGuardar: (e: EnquadramentoNormal) => void;
  onCancelar: () => void;
}

export function EnquadramentoImagem({ imagem, inicial, aGuardar, onGuardar, onCancelar }: Props) {
  const [enq, setEnq] = useState<EnquadramentoNormal>(inicial);
  const canvas = useRef<HTMLCanvasElement>(null);
  const arrasto = useRef<{ px: number; py: number; e: EnquadramentoNormal } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) desenhar(ctx, imagem, FAIXA_LARGURA, FAIXA_ALTURA, enq);
  }, [imagem, enq]);

  const mover = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const a = arrasto.current;
    const el = canvas.current;
    if (!a || !el) return;
    // Converter píxeis do ecrã para a escala interna da moldura.
    const f = FAIXA_LARGURA / el.getBoundingClientRect().width;
    const g = geometria(imagem.naturalWidth, imagem.naturalHeight, FAIXA_LARGURA, FAIXA_ALTURA, a.e);
    const x = a.e.x - ((ev.clientX - a.px) * f) / g.dw;
    const y = a.e.y - ((ev.clientY - a.py) * f) / g.dh;
    setEnq({ ...a.e, x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <p className="text-[13px] font-semibold text-foreground">Ajustar enquadramento</p>
      <canvas
        ref={canvas}
        width={FAIXA_LARGURA}
        height={FAIXA_ALTURA}
        aria-label="Pré-visualização da faixa da imagem; arrasta para reposicionar"
        className="block w-full cursor-grab touch-none rounded-lg border border-border active:cursor-grabbing"
        style={{ aspectRatio: "556 / 200" }}
        onPointerDown={(ev) => {
          ev.currentTarget.setPointerCapture(ev.pointerId);
          arrasto.current = { px: ev.clientX, py: ev.clientY, e: enq };
        }}
        onPointerMove={mover}
        onPointerUp={() => { arrasto.current = null; }}
        onPointerCancel={() => { arrasto.current = null; }}
      />
      <label className="flex items-center gap-3 text-[13px] text-muted-foreground">
        Zoom
        <input
          type="range" min={1} max={3} step={0.01} value={enq.zoom}
          onChange={(e) => setEnq((v) => ({ ...v, zoom: Number(e.target.value) }))}
          className="w-full accent-primary"
        />
      </label>
      <p className="text-[12px] text-muted-foreground">
        Arrasta a foto para escolher a parte visível. Formato 556 × 200 px, igual ao email e à página web.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button" disabled={aGuardar}
          onClick={() => onGuardar(enq)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-40"
        >
          {aGuardar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Guardar enquadramento
        </button>
        <button
          type="button" disabled={aGuardar}
          onClick={() => setEnq({ x: 0.5, y: 0.5, zoom: 1 })}
          className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground disabled:opacity-40"
        >
          Repor centro
        </button>
        <button
          type="button" disabled={aGuardar} onClick={onCancelar}
          className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-muted-foreground disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
