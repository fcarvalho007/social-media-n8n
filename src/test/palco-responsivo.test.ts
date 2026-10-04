import { describe, expect, it } from "vitest";
import { medidasPalco } from "@/features/motor/palco";

describe("pré-visualização da página", () => {
  it("a 375 px (contentor 343 px após margens) cabe sem exceder o contentor", () => {
    const m = medidasPalco(343);
    expect(m.w).toBe(343);
    expect(m.w).toBeLessThanOrEqual(343);
    expect(m.h / m.w).toBeCloseTo(1350 / 1080, 2);
  });
  it("em ecrãs largos fica limitada a 420 px, proporcional a 1080×1350", () => {
    expect(medidasPalco(900)).toEqual({ w: 420, h: 525, escala: 420 / 1080 });
  });
  it("largura desconhecida não desenha nada", () => {
    expect(medidasPalco(0).w).toBe(0);
  });
});
