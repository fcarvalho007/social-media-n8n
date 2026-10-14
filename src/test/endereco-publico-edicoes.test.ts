import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const ler = (p: string) => readFileSync(p, "utf8");

describe("endereço público das edições", () => {
  it("as edições usam o endereço público da app, não o endereço antigo importado", () => {
    const destinos = ler("supabase/functions/_shared/newsletter-engine/revista/destinos.server.ts");
    const corpo = destinos.slice(destinos.indexOf("export async function baseUrlEdicoes"));
    const fn = corpo.slice(0, corpo.indexOf("\n}\n"));
    expect(fn).toContain("baseParaLinks");
    expect(fn).not.toContain("edicoes_base_url\")");
  });

  it("a versão texto da newsletter não tem links de subscrição da app antiga", () => {
    const texto = ler("supabase/functions/_shared/newsletter-engine/revista/texto.server.ts");
    expect(texto).not.toContain("edicoes.digitalsprint.pt/subscricao");
    expect(texto).toContain("linkSubscricao(");
  });
});
