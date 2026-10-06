import { describe, expect, it } from "vitest";
import { recusaAntesDeCobrar, registosVisao, resolverModeloVisao } from "../../supabase/functions/_shared/motor/visaoModelo.server";

describe("vision provider choice", () => {
  it("defaults to fal (cheapest) with Kie as fallback", () => {
    const r = resolverModeloVisao(() => undefined);
    expect(r.principal.fornecedor).toBe("fal");
    expect(r.fallback?.fornecedor).toBe("kie");
  });
  it("env can switch the primary", () => {
    expect(resolverModeloVisao((k) => (k === "AI_VISION_PROVIDER" ? "kie" : undefined)).principal.fornecedor).toBe("kie");
  });
  it("fallback only after refusals that never charge", () => {
    expect(recusaAntesDeCobrar(401)).toBe(true);
    expect(recusaAntesDeCobrar(402)).toBe(false);
    expect(recusaAntesDeCobrar(500)).toBe(false);
  });
  it("daily limit counts both providers", () => {
    expect(registosVisao()).toHaveLength(2);
  });
});
