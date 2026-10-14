import { describe, expect, it } from "vitest";
import { avaliarPublicacao, briefIndexavel, briefPublicavel } from "@/newsletter/lib/newsletter-engine/revista/regras-publicacao";

const completo = { estado: "publicado", tipo: "destaque", resumo: 2, implicacoes: 2, leitura: "Leitura aprovada", fonte: "https://example.org/noticia" };
describe("publicação independente dos Briefs", () => {
  it("a edição web pública abre antes do envio sem contar como enviada", () => {
    expect(avaliarPublicacao({ estado: "rascunho", snapshotEstado: "bloqueado", temSnapshot: true, destinoWeb: "publica" })).toEqual({ publica: true, enviada: false });
  });
  it("um Brief publicado completo é público", () => expect(briefPublicavel(completo)).toBe(true));
  it.each(["por_gerar", "gerado", "por_rever", "aprovado", "erro"])("%s nunca fica público", (estado) => expect(briefPublicavel({ ...completo, estado })).toBe(false));
  it("a leitura aprovada é obrigatória no Destaque", () => expect(briefPublicavel({ ...completo, leitura: "" })).toBe(false));
  it("um resumo vazio não fica público", () => expect(briefPublicavel({ ...completo, resumo: 0 })).toBe(false));
  it("implicações em falta não ficam públicas", () => expect(briefPublicavel({ ...completo, implicacoes: 0 })).toBe(false));
  it("a fonte original é obrigatória", () => expect(briefPublicavel({ ...completo, fonte: "" })).toBe(false));
  it("os Destaques de uma edição não enviada não indexam", () => expect(briefIndexavel({ tipo: "destaque", indexavel: true, enviada: false })).toBe(false));
  it("o Radar não indexa mesmo após envio", () => expect(briefIndexavel({ tipo: "radar", indexavel: true, enviada: true })).toBe(false));
});