import { describe, expect, it } from "vitest";
import { creditoPexels, idDoUrl, mapearFotos, urlDescarga, urlPexelsValido } from "../../supabase/functions/_shared/motor/pexels";

describe("Pexels no motor", () => {
  it("só aceita imagens de images.pexels.com/photos", () => {
    expect(urlPexelsValido("https://images.pexels.com/photos/123/a.jpeg")).toBe(true);
    for (const u of ["http://images.pexels.com/photos/1/a.jpg", "https://evil.com/photos/1/a.jpg", "https://images.pexels.com.evil.com/photos/1/", 5]) expect(urlPexelsValido(u)).toBe(false);
  });
  it("mapeia só os campos necessários e descarta entradas inválidas", () => {
    const f = mapearFotos({ photos: [
      { id: 7, alt: " Mesa ", photographer: "Ana", width: 3000, height: 4000, src: { original: "https://images.pexels.com/photos/7/x.jpeg?x=1", portrait: "https://images.pexels.com/photos/7/x.jpeg?h=1200" } },
      { id: 8, src: { original: "https://outro.com/8.jpg" } },
    ] });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ id: 7, alt: "Mesa", autor: "Ana", url: "https://images.pexels.com/photos/7/x.jpeg" });
    expect(mapearFotos(null)).toEqual([]);
  });
  it("crédito, id e URL de descarga", () => {
    expect(creditoPexels("Ana")).toBe("Foto: Ana / Pexels");
    expect(idDoUrl("https://images.pexels.com/photos/42/x.jpg")).toBe(42);
    expect(urlDescarga("https://images.pexels.com/photos/7/x.jpeg?a=1")).toBe("https://images.pexels.com/photos/7/x.jpeg?auto=compress&cs=tinysrgb&w=1600");
  });
});
