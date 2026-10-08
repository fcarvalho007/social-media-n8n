import { describe, expect, it } from "vitest";
import { exportacaoCompleta, nomePagina, validarFicheiroSocial } from "../../supabase/functions/_shared/motor/exportacao";

/** Minimal PNG header (signature + IHDR with the given size); enough for the size check. */
function png(w: number, h: number): Uint8Array {
  const b = new Uint8Array(40);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w); dv.setUint32(20, h);
  return b;
}

describe("exportação social feita no navegador", () => {
  it("nomeia páginas como slide-01.png", () => {
    expect(nomePagina(0)).toBe("slide-01.png");
    expect(nomePagina(9)).toBe("slide-10.png");
  });
  it("aceita só PNG com o tamanho exato da peça", () => {
    expect(validarFicheiroSocial(png(1080, 1350), "png", 1080, 1350)).toBe("image/png");
    expect(() => validarFicheiroSocial(png(1080, 1080), "png", 1080, 1350)).toThrow(/1080×1350/);
    expect(() => validarFicheiroSocial(png(1080, 1350), "png", 1080, 1920)).toThrow();
    const jpeg = new Uint8Array(40); jpeg.set([0xff, 0xd8, 0xff]);
    expect(() => validarFicheiroSocial(jpeg, "png", 1080, 1350)).toThrow(/PNG válido/);
  });
  it("aceita só PDF verdadeiro", () => {
    expect(validarFicheiroSocial(new TextEncoder().encode("%PDF-1.7 ..."), "pdf", 1080, 1350)).toBe("application/pdf");
    expect(() => validarFicheiroSocial(png(1080, 1350), "pdf", 1080, 1350)).toThrow(/PDF válido/);
  });
  it("rascunho só com todos os slides (e PDF nos carrosséis)", () => {
    const nove = Array.from({ length: 9 }, (_, i) => ({ formato: "png", pagina: i + 1 }));
    expect(exportacaoCompleta([...nove, { formato: "pdf", pagina: null }], 10, true)).toBe(false);
    const dez = [...nove, { formato: "png", pagina: 10 }];
    expect(exportacaoCompleta(dez, 10, true)).toBe(false);
    expect(exportacaoCompleta([...dez, { formato: "pdf", pagina: null }], 10, true)).toBe(true);
    expect(exportacaoCompleta([{ formato: "png", pagina: 1 }], 1, false)).toBe(true);
  });
});
