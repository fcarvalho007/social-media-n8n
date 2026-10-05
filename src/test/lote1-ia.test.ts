import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { corpoDeepSeek, MODELO_DEEPSEEK } from "../../supabase/functions/_shared/deepseek-direto";
import { FRAMEWORKS, obterFramework, regrasFramework } from "../../supabase/functions/_shared/motor/frameworks";
import { fundirProposta } from "@/features/motor/estruturas";
import { transferirFicheiro } from "@/lib/transferirFicheiro";
import type { PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";

function ficheiros(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "node_modules" ? [] : ficheiros(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("guarda: runtime sem IA da Lovable", () => {
  it("nenhum ficheiro de runtime chama o AI Gateway da Lovable (inclui streaming e ramos)", () => {
    const ofensores = [...ficheiros("supabase/functions"), ...ficheiros("src")].filter((f) => /ai\.gateway\.lovable\.dev/.test(readFileSync(f, "utf8")));
    expect(ofensores).toEqual([]);
  });
  it("LOVABLE_API_KEY só aparece no scraper Firecrawl (ligação, não IA)", () => {
    const usos = ficheiros("supabase/functions").filter((f) => /LOVABLE_API_KEY/.test(readFileSync(f, "utf8")));
    expect(usos).toEqual(["supabase/functions/_shared/nl-app/edge-shared/scrapers-ferramentas.ts"]);
  });
  it("DeepSeek direta com thinking desligado e modelo configurado", () => {
    const c = corpoDeepSeek({ sistema: "s", utilizador: "u" }) as Record<string, unknown>;
    expect(c.model).toBe(MODELO_DEEPSEEK);
    expect(c.model).toBe("deepseek-flash");
    expect(c.thinking).toEqual({ type: "disabled" });
  });
});

const base = (n: number): PropostaEditorial => ({
  v: 1, metodo: "estruturacao", demonstracao: false, titulo: "T", objetivo: "o", tom: "t",
  slides: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, papel: i === 0 ? "capa" : "desenvolvimento", titulo: `A${i}`, texto: `a${i}`, fontes: [1] })),
  legenda: "L", alt: Array.from({ length: n }, () => ""), citacao: { titulo: null, url: null }, marca: { cor: "#000", origem: "neutra" },
});

describe("estruturas narrativas", () => {
  it("cinco estruturas, todas com a proibição de inventar", () => {
    expect(FRAMEWORKS.map((f) => f.nome)).toEqual(["Editorial", "PAS", "AIDA", "Antes/Depois/Ponte", "Direto ao valor"]);
    for (const f of FRAMEWORKS) expect(regrasFramework(f)).toMatch(/Proibido acrescentar promessas/);
    expect(obterFramework("xpto")).toBeNull();
  });
  it("aceitar mantém ids (composição) e traz texto e § da proposta", () => {
    const p = base(3); p.slides = p.slides.map((s, i) => ({ ...s, id: `n${i}`, titulo: `B${i}`, fontes: [i + 2] }));
    const r = fundirProposta(base(3), p);
    expect(r.ok).toBe(true);
    if (r.ok === true) {
      expect(r.conteudo.slides.map((s) => s.id)).toEqual(["s0", "s1", "s2"]);
      expect(r.conteudo.slides[1].titulo).toBe("B1");
      expect(r.conteudo.slides[2].fontes).toEqual([4]);
    }
  });
  it("contagem diferente é recusada (nunca apaga a composição)", () => {
    expect(fundirProposta(base(3), base(5))).toEqual({ ok: false, motivo: "contagem", atual: 3, proposta: 5 });
  });
});

describe("transferência de ficheiros", () => {
  it("falha de rede é reportada, sem abrir separador", async () => {
    const r = await transferirFicheiro("https://x/y.pdf", "y.pdf", { fetch: vi.fn().mockRejectedValue(new TypeError("blocked")) } as never);
    expect(r.ok).toBe(false);
  });
});
