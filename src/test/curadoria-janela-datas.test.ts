import { describe, expect, it } from "vitest";
import { noticiaAntiga } from "@/features/curadoria/CuradoriaNoticias";

const agora = Date.parse("2026-11-26T18:00:00Z");

describe("janela de 7 dias da Curadoria", () => {
  it("notícia de 11/11 é antiga", () => expect(noticiaAntiga("2026-11-11T10:00:00Z", agora)).toBe(true));
  it("notícia de 24/11 não é antiga", () => expect(noticiaAntiga("2026-11-24T10:00:00Z", agora)).toBe(false));
});

describe("fila só aceita itens recentes", () => {
  it("corta itens com mais de 7 dias", async () => {
    const mod = (await import(/* @vite-ignore */ ["../../supabase/functions/_shared/nl-app/lib", "fila-curadoria.server.ts"].join("/"))) as
      { itemRecente: (d: string | null, a?: number) => boolean };
    expect(mod.itemRecente("2026-10-16T10:00:00Z", agora)).toBe(false);
    expect(mod.itemRecente("2026-11-25T10:00:00Z", agora)).toBe(true);
  });
});
