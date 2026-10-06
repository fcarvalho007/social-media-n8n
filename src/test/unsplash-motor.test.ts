import { describe, expect, it } from "vitest";
import { descargaUnsplashValida, intercalar, mapearFotosUnsplash, urlUnsplashValido } from "../../supabase/functions/_shared/motor/unsplash";

describe("Unsplash no motor", () => {
  it("mapeia só fotos com endereços Unsplash válidos", () => {
    const r = mapearFotosUnsplash({ results: [
      { id: "a1", urls: { raw: "https://images.unsplash.com/photo-1?ixid=x", small: "https://images.unsplash.com/photo-1?w=400" }, links: { download_location: "https://api.unsplash.com/photos/a1/download?ixid=x" }, user: { name: "Ana" } },
      { id: "b2", urls: { raw: "https://evil.example/x.jpg", small: "https://evil.example/s.jpg" }, links: { download_location: "https://api.unsplash.com/photos/b2/download" } },
    ] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "a1", autor: "Ana", url: "https://images.unsplash.com/photo-1" });
  });
  it("valida origem e registo de descarga", () => {
    expect(urlUnsplashValido("https://images.unsplash.com/photo-1")).toBe(true);
    expect(urlUnsplashValido("https://images.pexels.com/photos/1/")).toBe(false);
    expect(descargaUnsplashValida("https://api.unsplash.com/photos/abc/download")).toBe(true);
    expect(descargaUnsplashValida("https://api.unsplash.com/me")).toBe(false);
  });
  it("intercala resultados mesmo quando uma lista está vazia", () => {
    expect(intercalar([1, 2, 3], ["a"])).toEqual([1, "a", 2, 3]);
    expect(intercalar([], ["a", "b"])).toEqual(["a", "b"]);
  });
});
