import { describe, it, expect } from "vitest";
import { ordenarEpisodios } from "@/newsletter/features/newsletter/data";

describe("ordem dos episódios do podcast", () => {
  it("e417 aparece antes de e415 mesmo com data de feed mais antiga", () => {
    const eps = [
      { titulo: "X - e415s01", criado_em: "2026-10-03T00:00:00Z" },
      { titulo: "Y - e417s01", criado_em: "2026-10-09T00:00:00Z" },
      { titulo: "Z - e416s01", criado_em: "2026-10-09T00:00:00Z" },
    ];
    expect(ordenarEpisodios(eps).map((e) => e.titulo)).toEqual(["Y - e417s01", "Z - e416s01", "X - e415s01"]);
  });
});
