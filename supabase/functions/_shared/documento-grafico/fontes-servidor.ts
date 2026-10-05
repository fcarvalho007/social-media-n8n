// Parses every embedded font once for server measuring/rendering (same bytes as public/fontes).
import { parse } from "npm:opentype.js@1.3.4";
import { criarMedidor, type Familia, type FonteOT, type Medidor, type Peso } from "./nucleo.ts";
import { WORK_SANS_400, WORK_SANS_700 } from "./fontes-b64.ts";
import { FONTES_EXTRA_B64 } from "./fontes-extra-b64.ts";

export function bytesB64(b64: string): Uint8Array {
  const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const ab = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

let cache: { medidor: Medidor; buffers: Uint8Array[] } | null = null;
export function fontesServidor() {
  if (cache) return cache;
  const buffers: Uint8Array[] = [];
  const ler = (b64: string) => { const u = bytesB64(b64); buffers.push(u); return parse(ab(u)) as unknown as FonteOT; };
  const base = { 400: ler(WORK_SANS_400), 700: ler(WORK_SANS_700) } as Record<400 | 700, FonteOT>;
  const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
  for (const [fam, pesos] of Object.entries(FONTES_EXTRA_B64)) {
    const x: Partial<Record<Peso, FonteOT>> = {};
    for (const [p, b] of Object.entries(pesos)) if (b) x[Number(p) as Peso] = ler(b);
    extras[fam as Familia] = x;
  }
  cache = { medidor: criarMedidor(base, extras), buffers };
  return cache;
}
