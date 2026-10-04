import { describe, it, expect, beforeEach } from "vitest";
import { aplicarGravacao, chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from "./recuperacaoLocal";

type E = { id?: string; texto: string };
const igual = (a: E, b: E) => a.id === b.id && a.texto === b.texto;
const mesclar = (a: E, s: E) => ({ ...a, id: s.id });

beforeEach(() => localStorage.clear());

describe("recuperação local", () => {
  it("guarda e lê só para o mesmo utilizador", () => {
    const k = chaveRecuperacao("u1", "artigo", null, "p1");
    guardarRecuperacao(k, { texto: "olá" });
    expect(lerRecuperacao<E>(k, "u1")?.dados.texto).toBe("olá");
    expect(lerRecuperacao<E>(k, "u2")).toBeNull();
  });

  it("separa por item e projeto e limpa após descartar", () => {
    const a = chaveRecuperacao("u1", "artigo", "x", "p1");
    const b = chaveRecuperacao("u1", "artigo", "x", "p2");
    guardarRecuperacao(a, { texto: "A" });
    expect(lerRecuperacao(b, "u1")).toBeNull();
    limparRecuperacao(a);
    expect(lerRecuperacao(a, "u1")).toBeNull();
  });

  it("gravação concluída sem novas edições adota a cópia do servidor", () => {
    const r = aplicarGravacao<E>({ texto: "v1" }, { texto: "v1" }, { id: "1", texto: "v1" }, mesclar, igual);
    expect(r).toEqual({ edit: { id: "1", texto: "v1" }, base: { id: "1", texto: "v1" }, sujo: false });
  });

  it("texto escrito durante a gravação não é sobrescrito e fica por guardar", () => {
    const r = aplicarGravacao<E>({ texto: "v1" }, { texto: "v1 mais" }, { id: "1", texto: "v1" }, mesclar, igual);
    expect(r.edit).toEqual({ id: "1", texto: "v1 mais" });
    expect(r.sujo).toBe(true);
  });
});
