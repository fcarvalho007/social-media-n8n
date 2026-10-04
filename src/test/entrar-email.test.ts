import { describe, expect, it, vi } from "vitest";
import { entrar, type Dependencias } from "../../supabase/functions/entrar-email/logica";

const deps = (o: Partial<Dependencias> = {}): Dependencias => ({
  contarFalhasIp: vi.fn(async () => 0),
  contarEntradasEmail: vi.fn(async () => 0),
  registar: vi.fn(async () => {}),
  contaExiste: vi.fn(async () => true),
  emitirSessao: vi.fn(async () => ({ access_token: "a", refresh_token: "r" })),
  ...o,
});

describe("entrar-email", () => {
  it("email autorizado sem conta: não emite link nem cria utilizador", async () => {
    const d = deps({ contaExiste: vi.fn(async () => false) });
    const r = await entrar("fredericodigital@gmail.com", "1.1.1.1", d);
    expect(r.status).toBe(403);
    expect(d.emitirSessao).not.toHaveBeenCalled();
    expect(d.registar).toHaveBeenCalledWith(false);
    expect(JSON.stringify(r.body)).not.toMatch(/token|id/);
  });
  it("email não autorizado: nem verifica conta nem emite", async () => {
    const d = deps();
    const r = await entrar("x@y.pt", null, d);
    expect(r.status).toBe(403);
    expect(d.contaExiste).not.toHaveBeenCalled();
    expect(d.emitirSessao).not.toHaveBeenCalled();
  });
  it("conta existente autorizada entra", async () => {
    const d = deps();
    const r = await entrar(" Comunicacao@FredericoCarvalho.pt ", null, d);
    expect(r.status).toBe(200);
    expect(d.registar).toHaveBeenCalledWith(true);
  });
  it("falha na limitação/auditoria devolve 503, nunca sucesso", async () => {
    for (const o of [
      { contarFalhasIp: vi.fn(async () => { throw new Error("db"); }) },
      { contarEntradasEmail: vi.fn(async () => { throw new Error("db"); }) },
      { contaExiste: vi.fn(async () => { throw new Error("db"); }) },
      { registar: vi.fn(async () => { throw new Error("db"); }) },
    ]) {
      const d = deps(o);
      const r = await entrar("fredericodigital@gmail.com", "1.1.1.1", d);
      expect(r.status).toBe(503);
      expect(r.body).not.toHaveProperty("access_token");
    }
  });
  it("limite por IP bloqueia antes de tudo", async () => {
    const d = deps({ contarFalhasIp: vi.fn(async () => 10) });
    expect((await entrar("fredericodigital@gmail.com", "1.1.1.1", d)).status).toBe(429);
    expect(d.contaExiste).not.toHaveBeenCalled();
  });
});
