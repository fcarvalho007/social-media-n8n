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

describe("entrar-email: limite de tempo", () => {
  it("autenticação sem resposta → 503 sem sessão emitida nem registo", async () => {
    const d = deps({ emitirSessao: vi.fn(() => new Promise<never>(() => {})) });
    const r = await entrar("fredericodigital@gmail.com", null, d, 20);
    expect(r.status).toBe(503);
    expect(r.body).not.toHaveProperty("access_token");
    expect(r.body.error).toMatch(/indisponível/);
    expect(d.registar).not.toHaveBeenCalled();
  });
  it("base de dados sem resposta na verificação da conta → 503 sem pedir sessão", async () => {
    const d = deps({ contaExiste: vi.fn(() => new Promise<never>(() => {})) });
    const r = await entrar("fredericodigital@gmail.com", null, d, 20);
    expect(r.status).toBe(503);
    expect(d.emitirSessao).not.toHaveBeenCalled();
  });
});

import { classificarFalha } from "../../supabase/functions/entrar-email/logica";
describe("entrar-email: diagnóstico fixo", () => {
  it("classifica sem texto livre", () => {
    expect(classificarFalha({ status: 504, message: "fredericodigital@gmail.com tok_123" })).toBe("http_504");
    expect(classificarFalha({ code: "57014", message: "segredo" })).toBe("pg_57014");
    expect(classificarFalha({ code: "request_timeout", status: 504 })).toBe("http_504+codigo_request_timeout");
    expect(classificarFalha({ name: "AuthRetryableFetchError" })).toBe("rede_AuthRetryableFetchError");
    expect(classificarFalha(new Error("x@y.pt"))).toBe("desconhecida");
    expect(classificarFalha({ code: "Bearer abc.def" })).toBe("desconhecida");
  });
  it("regista cada etapa só com nome, classe e duração", async () => {
    const linhas: string[] = [];
    const d = deps({ contaExiste: vi.fn(async () => { throw { code: "PGRST301", status: 401, message: "chave" }; }) });
    const r = await entrar("fredericodigital@gmail.com", "1.1.1.1", d, 50, (e, res) => linhas.push(`${e}=${res}`));
    expect(r.status).toBe(503);
    expect(linhas).toEqual(["limite_ip=ok", "limite_email=ok", "conta_existe=http_401"]);
    expect(linhas.join()).not.toMatch(/@|1\.1\.1\.1|chave/);
  });
});
