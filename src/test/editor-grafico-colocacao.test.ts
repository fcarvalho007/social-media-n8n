import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { centrar, PRESETS_TEXTO, tamanhoImagemNova } from "@/features/editor-grafico/estado";

describe("colocação inicial de elementos novos", () => {
  it("fica sempre dentro da página nos cantos 0/1080/1350", () => {
    const p = { x: 0, y: 0 };
    expect(centrar({ x: 0, y: 0 }, 400, 400, p)).toEqual({ x: 0, y: 0 });
    expect(centrar({ x: 1080, y: 1350 }, 400, 400, p)).toEqual({ x: 680, y: 950 });
    expect(centrar({ x: 1080, y: 0 }, 900, 240, p)).toEqual({ x: 180, y: 0 });
    expect(centrar({ x: 540, y: 675 }, 400, 400, p)).toEqual({ x: 340, y: 475 });
  });
  it("sem ponto usa a posição por omissão", () => {
    expect(centrar(undefined, 10, 10, { x: 90, y: 560 })).toEqual({ x: 90, y: 560 });
  });
  it("imagem nova é proporcional e cabe na página", () => {
    expect(tamanhoImagemNova(1000, 1250)).toEqual({ w: 540, h: 675 });
    const alta = tamanhoImagemNova(100, 1000);
    expect(alta.h).toBeLessThanOrEqual(1350);
    expect(alta.w / alta.h).toBeCloseTo(0.1, 2);
    const o = centrar({ x: 1080, y: 1350 }, alta.w, alta.h, { x: 0, y: 0 });
    expect(o.x + alta.w).toBeLessThanOrEqual(1080);
    expect(o.y + alta.h).toBeLessThanOrEqual(1350);
  });
  it("nenhum preset novo reduz a letra sozinho", () => {
    for (const p of Object.values(PRESETS_TEXTO)) expect(p.estilo.overflow).toBe("cortar");
  });
});

describe("rascunho social: PDF nunca fica desatualizado", () => {
  // The LinkedIn PDF is built from the draft's current image order at publish time.
  // The PDF URL stored in a draft's origem/ai_metadata is audit only: nothing in the app may read it back.
  const ficheiros = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? (n === "test" || n === "node_modules" ? [] : ficheiros(p)) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
  it("nenhum código lê pdf_linkedin_url nem origem.pdf_url de um rascunho", () => {
    const leitores = [...ficheiros("src"), ...ficheiros("supabase/functions")].filter((f) => {
      const t = readFileSync(f, "utf8");
      return /\.pdf_linkedin_url|\["pdf_linkedin_url"\]|origem\??\.pdf_url/.test(t);
    });
    expect(leitores).toEqual([]);
  });
});
