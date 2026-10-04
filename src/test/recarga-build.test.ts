import { describe, expect, it, vi } from "vitest";
import { assinaturaErro, eErroDeChunk, tentarRecarga } from "@/lib/recargaBuild";

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const css = new Error("Unable to preload CSS for /assets/proposta-CHZ2-M7a.css");

describe("recarga após nova versão", () => {
  it("reconhece só falhas de chunk", () => {
    expect(eErroDeChunk(css)).toBe(true);
    expect(eErroDeChunk(new TypeError("Failed to fetch dynamically imported module: /assets/x.js"))).toBe(true);
    expect(eErroDeChunk(new TypeError("Cannot read properties of undefined"))).toBe(false);
    expect(eErroDeChunk(new Error("GalleryHorizontal is not defined"))).toBe(false);
  });
  it("identifica a falha pelo ficheiro", () => {
    expect(assinaturaErro(css)).toBe("/assets/proposta-CHZ2-M7a.css");
  });
  it("recarrega uma única vez por ficheiro, para sempre, mesmo após muitas horas", () => {
    const a = memoria(); const r = vi.fn();
    expect(tentarRecarga(a, r, css)).toBe(true);
    // Simulates 1000 consecutive page loads failing on the same missing asset.
    for (let i = 0; i < 1000; i++) expect(tentarRecarga(a, r, css)).toBe(false);
    expect(r).toHaveBeenCalledTimes(1);
  });
  it("uma nova versão (ficheiro diferente) tem direito à sua própria recarga", () => {
    const a = memoria(); const r = vi.fn();
    tentarRecarga(a, r, css);
    expect(tentarRecarga(a, r, new Error("Unable to preload CSS for /assets/proposta-NOVO1.css"))).toBe(true);
    expect(r).toHaveBeenCalledTimes(2);
  });
  it("sem armazenamento persistente não recarrega", () => {
    const r = vi.fn();
    const falha = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(tentarRecarga(falha, r, css)).toBe(false);
    expect(r).not.toHaveBeenCalled();
  });
});
