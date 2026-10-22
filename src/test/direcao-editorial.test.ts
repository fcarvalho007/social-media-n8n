import { describe, expect, it } from "vitest";
import { alternarEscolha, blocoDirecaoEditorial, linhasBriefing, normalizarBriefing, textoTom } from "../../supabase/functions/_shared/motor/briefing";
import { readFileSync } from "node:fs";

describe("escolhas múltiplas e direção editorial", () => {
  it("tom e intenção ficam limitados a 2; a terceira escolha substitui a mais antiga", () => {
    expect(alternarEscolha(["critico", "pedagogico"], "pragmatico", 2)).toEqual(["pedagogico", "pragmatico"]);
    expect(alternarEscolha(["critico"], "critico", 2)).toEqual([]);
    const b = normalizarBriefing({ tons: ["critico", "pedagogico", "pragmatico"], intencoes: ["dados", "guia", "cronica"] });
    expect(b.tons).toHaveLength(2); expect(b.intencoes).toHaveLength(2);
  });
  it("briefings antigos com uma só intenção continuam a funcionar", () => {
    const b = normalizarBriefing({ intencao: "solucao" });
    expect(b.intencoes).toEqual(["solucao"]); expect(b.intencao).toBe("solucao"); expect(b.tons).toEqual([]);
  });
  it("o bloco de direção inclui tons, públicos e a intenção principal", () => {
    const b = normalizarBriefing({ tons: ["critico", "pedagogico"], publico: ["gestores", "pme"], intencoes: ["dados", "guia"] });
    const l = linhasBriefing(b).join("\n");
    expect(l).toMatch(/^Intenção editorial: Leitura de dados/);
    expect(l).toMatch(/Intenção secundária: Guia prático/);
    expect(l).toMatch(/combina Crítico e provocador e Pedagógico/);
    expect(l).toMatch(/Gestores e empresários \(precisa de/);
    expect(l).toMatch(/Relê a fonte à luz desta direção/);
    expect(blocoDirecaoEditorial(normalizarBriefing(null))).toEqual([]);
  });
  it("o tom deixa de ser cortado a 80 caracteres", () => {
    const t = textoTom(["critico", "pedagogico"], "");
    expect(t.length).toBeGreaterThan(80); expect(t).toContain("Pedagógico — Explica passo a passo");
  });
  it("recusas de tradução chegam ao ecrã como resposta normal (200) e a recusada é guardada", () => {
    const m = readFileSync("supabase/functions/mc-motor/index.ts", "utf8");
    expect(m).toMatch(/if \(r\.codigo\) return json\(\{ recusada: true/);
    const s = readFileSync("supabase/functions/_shared/motor/traducao.server.ts", "utf8");
    expect(s).toMatch(/resultado_recusado: parsed/);
    expect(s).toMatch(/P0005: \[429, "Limite diário/);
    expect(s).toMatch(/P0006: .*"pode_repetir", true/);
  });
});
