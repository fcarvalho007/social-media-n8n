import { describe, expect, it } from "vitest";
import {
  htmlEditorialInline,
  htmlEditorialSeguro,
  textoDeHtmlEditorial,
} from "@/newsletter/lib/newsletter-engine/revista/html-restrito";

describe("formatação da recomendação", () => {
  it("preserva negrito, itálico e sublinhado nos três textos", () => {
    const html = "<p><strong>Título</strong> <em>editorial</em> <u>útil</u></p>";
    expect(htmlEditorialInline(html)).toBe("<strong>Título</strong> <em>editorial</em> <u>útil</u>");
    expect(htmlEditorialSeguro(html)).toBe(html);
  });

  it("remove scripts, imagens, links e estilos colados", () => {
    const html = '<p style="color:red">Texto <a href="https://exemplo.pt">ligado</a><img src=x onerror=alert(1)><script>alert(1)</script></p>';
    expect(htmlEditorialSeguro(html)).toBe("<p>Texto ligadoalert(1)</p>");
  });

  it("mantém texto antigo e produz uma versão simples para resumos", () => {
    expect(htmlEditorialSeguro("Linha 1\n\nLinha 2 & mais")).toBe("<p>Linha 1</p><p>Linha 2 &amp; mais</p>");
    expect(textoDeHtmlEditorial("<p><strong>Linha 1</strong><br>Linha 2</p>")).toBe("Linha 1\nLinha 2");
  });
});