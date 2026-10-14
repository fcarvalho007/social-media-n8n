import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { envioTesteMaisRecente } from "@/newsletter/lib/newsletter-engine/revista/regras-publicacao";

describe("envio de teste no painel", () => {
  it("campanha aceite numa lista de teste aparece como teste, com a lista e a hora", () => {
    const t = envioTesteMaisRecente([
      { estado: "aceite", aceite_em: "2026-10-14T17:27:50Z", confirmado_em: null, tipo: "teste", lista: "Interno" },
    ]);
    expect(t).toEqual({ estado: "aceite", lista: "Interno", em: "2026-10-14T17:27:50Z" });
  });
  it("campanhas de listas reais nunca contam como teste", () => {
    expect(envioTesteMaisRecente([
      { estado: "enviada", aceite_em: "x", confirmado_em: "y", tipo: "real", lista: "Subscritores" },
    ])).toBeNull();
  });
  it("rascunhos na E-goi não contam como envio de teste", () => {
    expect(envioTesteMaisRecente([
      { estado: "rascunho", aceite_em: null, confirmado_em: null, tipo: "teste", lista: "Interno" },
    ])).toBeNull();
  });
});

describe("página pública de edição ainda não enviada", () => {
  const fn = readFileSync("supabase/functions/nl-publico/index.ts", "utf8");
  it("abre por ligação direta e é marcada noindex", () => {
    expect(fn).toContain("noindex: p.enviada !== true");
    expect(fn).not.toContain("p.enviada !== true) return json");
  });
  it("o arquivo continua só com edições enviadas", () => {
    const pub = readFileSync("supabase/functions/_shared/newsletter-engine/revista/publicacao.server.ts", "utf8");
    expect(pub).toContain("lista.filter((l) => l.enviada).map(");
  });
});
