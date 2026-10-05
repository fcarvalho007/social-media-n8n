import { parse as parseFonte } from "opentype.js";
import { criarMedidor, type Familia, type FonteOT, type Medidor, type Peso } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

const BASE: Record<400 | 700, string> = { 400: "/fontes/WorkSans-Regular.ttf", 700: "/fontes/WorkSans-Bold.ttf" };
/** Same files embedded server-side (fontes-extra-b64.ts). */
export const FICHEIROS_EXTRA: Partial<Record<Familia, Partial<Record<Peso, string>>>> = {
  montserrat: { 400: "/fontes/Montserrat-400.ttf", 700: "/fontes/Montserrat-700.ttf", 900: "/fontes/Montserrat-900.ttf" },
  inter: { 400: "/fontes/Inter-400.ttf", 700: "/fontes/Inter-700.ttf" },
  playfair: { 400: "/fontes/PlayfairDisplay-400.ttf", 700: "/fontes/PlayfairDisplay-700.ttf" },
  sourcesans: { 400: "/fontes/SourceSans3-400.ttf", 700: "/fontes/SourceSans3-700.ttf" },
  grotesk: { 400: "/fontes/SpaceGrotesk-400.ttf", 700: "/fontes/SpaceGrotesk-700.ttf" },
  dmserif: { 400: "/fontes/DMSerifDisplay-400.ttf" },
  dmsans: { 400: "/fontes/DMSans-400.ttf", 700: "/fontes/DMSans-700.ttf" },
  plex: { 400: "/fontes/IBMPlexSans-400.ttf", 700: "/fontes/IBMPlexSans-700.ttf" },
};

let promessa: Promise<Medidor> | null = null;

async function ler(url: string): Promise<FonteOT> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Não foi possível carregar o tipo de letra.");
  return parseFonte(await resp.arrayBuffer()) as unknown as FonteOT;
}

/**
 * Loads the exact TTF files used by the server renderer and returns a measurer based on the
 * same font metrics (opentype.js). Text is drawn as glyph outlines, so no CSS font registration is needed.
 */
export function carregarMedidor(): Promise<Medidor> {
  if (!promessa) {
    promessa = (async () => {
      const [b4, b7] = await Promise.all([ler(BASE[400]), ler(BASE[700])]);
      const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
      await Promise.all(Object.entries(FICHEIROS_EXTRA).flatMap(([fam, pesos]) =>
        Object.entries(pesos ?? {}).map(async ([p, url]) => {
          (extras[fam as Familia] ??= {})[Number(p) as Peso] = await ler(url as string);
        })));
      return criarMedidor({ 400: b4, 700: b7 }, extras);
    })().catch((e) => {
      promessa = null;
      throw e;
    });
  }
  return promessa;
}
