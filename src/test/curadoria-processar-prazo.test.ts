import { describe, expect, it } from "vitest";
// The server module is Deno-typed; load it untyped so the app typecheck stays clean.
const servidor = (): Promise<{ comPrazo: <T>(p: Promise<T>, ms: number) => Promise<T>; ORCAMENTO_MS: number; LIMITE_ITEM_MS: number }> =>
  import(/* @vite-ignore */ ["../../supabase/functions/_shared/nl-app/lib", "fila-curadoria.server.ts"].join("/"));
import { mensagemErroProcessar } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";

describe("processar fila: prazos", () => {
  it("orçamento do lote fica abaixo do limite do servidor (150 s) e 30 s por notícia", async () => {
    const { ORCAMENTO_MS, LIMITE_ITEM_MS } = await servidor();
    expect(ORCAMENTO_MS).toBeLessThan(150_000);
    expect(LIMITE_ITEM_MS).toBe(30_000);
  });
  it("uma notícia que excede o prazo falha com «tempo esgotado»", async () => {
    const { comPrazo } = await servidor();
    await expect(comPrazo(new Promise(() => {}), 10)).rejects.toThrow("tempo esgotado");
  });
  it("troca o erro técnico por uma mensagem útil", () => {
    const m = mensagemErroProcessar(new Error("Edge Function returned a non-2xx status code"));
    expect(m).not.toMatch(/non-2xx/);
    expect(m).toMatch(/demorou demasiado/);
  });
});
