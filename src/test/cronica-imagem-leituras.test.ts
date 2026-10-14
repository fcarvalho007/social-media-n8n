import { describe, it, expect } from "vitest";
import { construirPayloadArtigo, interpretarLeituras } from "@/newsletter/lib/newsletter-engine/revista/artigo-cronica";

const base = {
  edicaoId: "e1", cronicaId: "c1", cronicaEdicaoId: "e1", configEdicaoId: "e1",
  numeroEdicao: 319, titulo: "Título", subtitulo: "", lede: "",
  corpoHtml: `<p>${"Texto editorial longo. ".repeat(20)}</p>`,
  urlEdicao: "https://exemplo.pt/edicoes/319",
};

describe("crónica para WordPress", () => {
  it("inclui a imagem com texto alternativo e crédito", () => {
    const a = construirPayloadArtigo({ ...base, imagem: { url: "https://img.pt/a.jpg", alt: "Ecrã azul", credito: "Foto de X (Pexels)", creditoUrl: "https://www.pexels.com/@x" } }, { status: "draft" });
    expect(a.content).toContain('<img src="https://img.pt/a.jpg" alt="Ecrã azul" />');
    expect(a.content).toContain('<a href="https://www.pexels.com/@x" rel="noopener">Foto de X (Pexels)</a>');
  });
  it("inclui as três leituras recomendadas como links", () => {
    const l = "https://a.com/x\n\nhttps://www.b.io/y\n\nhttps://c.gov/z";
    const a = construirPayloadArtigo({ ...base, leiturasRecomendadas: l }, { status: "draft" });
    expect(a.content.match(/<li><a href="https:\/\//g)?.length).toBe(3);
    expect(interpretarLeituras(l)[1]).toEqual({ titulo: "b.io", url: "https://www.b.io/y" });
  });
  it("mantém título e slug", () => {
    const a = construirPayloadArtigo({ ...base, leiturasRecomendadas: "https://a.com" }, { status: "draft" });
    expect(a.slug).toBe("titulo");
  });
});
