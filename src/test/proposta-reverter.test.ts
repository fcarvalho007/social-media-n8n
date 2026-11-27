import { describe, expect, it } from "vitest";
import { snapshotAnterior } from "@/newsletter/features/newsletter/revista/reverter-proposta";

describe("reverter sugestão aplicada", () => {
  it("repõe o texto que estava antes", () => {
    expect(snapshotAnterior({ cronica_lede: "Antigo", outro: "x" }, { cronica_lede: "Novo" })).toEqual({ cronica_lede: "Antigo" });
  });
  it("campo vazio antes fica vazio", () => {
    const cfg: { cronica_titulo?: string | null } = { cronica_titulo: null };
    expect(snapshotAnterior(cfg, { cronica_titulo: "Novo" })).toEqual({ cronica_titulo: "" });
  });
});
