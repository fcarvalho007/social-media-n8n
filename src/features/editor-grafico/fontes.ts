import { parse as parseFonte } from "opentype.js";
import { FAMILIA, criarMedidor, type FonteOT, type Medidor, type Peso } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

const FICHEIROS: Record<Peso, string> = { 400: "/fontes/WorkSans-Regular.ttf", 700: "/fontes/WorkSans-Bold.ttf" };

let promessa: Promise<Medidor> | null = null;

/**
 * Loads the exact TTF files used by the server renderer, registers them for canvas
 * drawing and returns a measurer based on the same font metrics (opentype.js).
 */
export function carregarMedidor(): Promise<Medidor> {
  if (!promessa) {
    promessa = (async () => {
      const fontes = {} as Record<Peso, FonteOT>;
      for (const peso of [400, 700] as Peso[]) {
        const resp = await fetch(FICHEIROS[peso]);
        if (!resp.ok) throw new Error("Não foi possível carregar o tipo de letra.");
        const buf = await resp.arrayBuffer();
        fontes[peso] = parseFonte(buf) as unknown as FonteOT;
        const face = new FontFace(FAMILIA, buf.slice(0), { weight: String(peso), style: "normal" });
        await face.load();
        document.fonts.add(face);
      }
      return criarMedidor(fontes);
    })().catch((e) => {
      promessa = null;
      throw e;
    });
  }
  return promessa;
}
