import { describe, expect, it } from "vitest";
import { fotografiaSoDeTeste } from "@/newsletter/lib/newsletter-engine/revista/fotografia-teste";

describe("fotografia de envio só de teste", () => {
  it("edição 319: só a lista Interno (teste) enviada → não fixa o próximo envio", () => {
    expect(fotografiaSoDeTeste("rascunho", [{ estado: "enviada", tipo: "teste" }])).toBe(true);
  });
  it("campanha real em qualquer estado mantém a fotografia", () => {
    expect(fotografiaSoDeTeste("rascunho", [{ estado: "enviada", tipo: "teste" }, { estado: "rascunho", tipo: "real" }])).toBe(false);
  });
  it("edição enviada mantém sempre a fotografia", () => {
    expect(fotografiaSoDeTeste("enviada", [{ estado: "enviada", tipo: "teste" }])).toBe(false);
  });
});
