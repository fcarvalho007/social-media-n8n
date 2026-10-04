import { describe, expect, it } from "vitest";
import { chaveRascunhos, descreverMarca, pertenceAoFiltro } from "./marcaRascunho";
import { chaveRecuperacao } from "../recuperacaoLocal";

describe("rascunhos por utilizador e projeto", () => {
  it("chave de cache distingue utilizador e projeto", () => {
    expect(chaveRascunhos({ userId: "u1", projetoId: "p1" })).not.toEqual(chaveRascunhos({ userId: "u1", projetoId: "p2" }));
    expect(chaveRascunhos({ userId: "u1", projetoId: null })).not.toEqual(chaveRascunhos({ userId: "u2", projetoId: null }));
  });
  it("antigos sem projeto só aparecem em Todos", () => {
    const antigo = { user_id: "u1", project_id: null };
    expect(pertenceAoFiltro(antigo, { userId: "u1", projetoId: null })).toBe(true);
    expect(pertenceAoFiltro(antigo, { userId: "u1", projetoId: "p1" })).toBe(false);
  });
  it("mostra rascunhos da equipa da mesma marca, nunca de outra marca", () => {
    expect(pertenceAoFiltro({ user_id: "u2", project_id: "p1" }, { userId: "u1", projetoId: "p1" })).toBe(true);
    expect(pertenceAoFiltro({ user_id: "u1", project_id: "p2" }, { userId: "u1", projetoId: "p1" })).toBe(false);
  });
});

describe("marca no editor", () => {
  const nomes = { p1: "DIGITALSPRINT", p2: "Outra" };
  it("rascunho novo usa o projeto do Estúdio", () => {
    expect(descreverMarca(null, "p1", nomes, "u1")).toEqual({ projeto: "DIGITALSPRINT", nota: "projeto escolhido no Estúdio", outroAutor: false });
  });
  it("rascunho existente mantém o projeto original", () => {
    const d = descreverMarca({ user_id: "u1", project_id: "p2" }, "p1", nomes, "u1");
    expect(d.projeto).toBe("Outra");
    expect(d.nota).toMatch(/não muda/);
  });
  it("rascunho de outro autor é assinalado", () => {
    expect(descreverMarca({ user_id: "u2", project_id: null }, "p1", nomes, "u1")).toMatchObject({ projeto: "sem projeto", outroAutor: true });
  });
  it("recuperação local isolada por utilizador e projeto", () => {
    expect(chaveRecuperacao("u1", "social", null, "p1")).not.toBe(chaveRecuperacao("u1", "social", null, "p2"));
    expect(chaveRecuperacao("u1", "social", "d", "p1")).not.toBe(chaveRecuperacao("u2", "social", "d", "p1"));
  });
});
