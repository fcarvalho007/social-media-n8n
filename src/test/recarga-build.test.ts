import { describe, expect, it, vi } from "vitest";
import { eErroDeChunk, tentarRecarga, JANELA_MS } from "@/lib/recargaBuild";

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("recarga após nova versão", () => {
  it("reconhece só falhas de chunk", () => {
    expect(eErroDeChunk(new Error("Unable to preload CSS for /assets/proposta-CHZ2-M7a.css"))).toBe(true);
    expect(eErroDeChunk(new TypeError("Failed to fetch dynamically imported module: /assets/x.js"))).toBe(true);
    expect(eErroDeChunk(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(eErroDeChunk(new Error("GalleryHorizontal is not defined"))).toBe(false);
  });
  it("recarrega uma vez e não entra em ciclo dentro da janela", () => {
    const a = memoria(); const r = vi.fn(); const t0 = 1_000_000_000;
    expect(tentarRecarga(a, r, t0)).toBe(true);
    expect(tentarRecarga(a, r, t0 + 30_000)).toBe(false);
    expect(tentarRecarga(a, r, t0 + JANELA_MS - 1)).toBe(false);
    expect(r).toHaveBeenCalledTimes(1);
    expect(tentarRecarga(a, r, t0 + JANELA_MS + 1)).toBe(true);
  });
});
