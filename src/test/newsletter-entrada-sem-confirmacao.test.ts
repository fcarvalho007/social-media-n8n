import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { NL_OPS } from "../../supabase/functions/_shared/nl-ops";

const editor = readFileSync("src/newsletter/features/newsletter/revista/EditorRevista.tsx", "utf8");

describe("abrir uma edição não pede ação externa", () => {
  it("o editor não chama a sincronização da edição (nem ao montar)", () => {
    expect(editor).not.toMatch(/sincronizarBriefsDaEdicaoFn/);
  });
  it("as sincronizações explícitas continuam confirmadas", () => {
    expect(NL_OPS["brief:sincronizarBriefsDaEdicaoFn"].nivel).toBe("externa");
    expect(NL_OPS["brief:sincronizarBriefPapelFn"].nivel).toBe("externa");
    expect(NL_OPS["brief:listarBriefsDaEdicaoFn"].nivel).toBe("leitura");
  });
});
