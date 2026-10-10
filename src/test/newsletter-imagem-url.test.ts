import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizarUrlImagemEditorial,
  urlImagemEditorial,
} from "../newsletter/lib/imagem-editorial";
import { geometria } from "../newsletter/features/newsletter/revista/recorte-imagem";

describe("imagens editoriais da newsletter", () => {
  it("gera o endpoint atual para novas imagens", () => {
    expect(urlImagemEditorial("https://backend.exemplo/", "edicao/foto.jpg")).toBe(
      "https://backend.exemplo/functions/v1/nl-imagem/edicao/foto.jpg",
    );
  });

  it("recupera endereços antigos sem alterar endereços externos", () => {
    expect(
      normalizarUrlImagemEditorial(
        "https://edicoes.exemplo/api/public/imagem/edicao/foto.jpg",
        "https://backend.exemplo",
      ),
    ).toBe("https://backend.exemplo/functions/v1/nl-imagem/edicao/foto.jpg");
    expect(
      normalizarUrlImagemEditorial("https://images.pexels.com/foto.jpg", "https://backend.exemplo"),
    ).toBe("https://images.pexels.com/foto.jpg");
  });

  it("preenche a faixa com originais horizontais, verticais e quadrados", () => {
    for (const [largura, altura] of [[2000, 1000], [1000, 2000], [1200, 1200]]) {
      const g = geometria(largura, altura, 1112, 400, { x: 0.5, y: 0.5, zoom: 1 });
      expect(g.dw).toBeGreaterThanOrEqual(1112);
      expect(g.dh).toBeGreaterThanOrEqual(400);
    }
  });

  it("deixa o URL da crónica a cargo do painel de publicação", () => {
    const editor = readFileSync(
      "migration-reference/code/newsletter/src/features/newsletter/revista/EditorRevista.tsx.txt",
      "utf8",
    );
    expect(editor).not.toContain('etiqueta="URL da crónica completa"');
    expect(editor).toContain("preenchido automaticamente depois de publicares a crónica");
  });
});