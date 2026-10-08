import { describe, expect, it } from "vitest";
import { nomePagina } from "../../supabase/functions/_shared/motor/exportacao";

describe("exportação", () => {
  it("nomeia páginas como slide-01.png", () => {
    expect(nomePagina(0)).toBe("slide-01.png");
    expect(nomePagina(9)).toBe("slide-10.png");
  });
});
