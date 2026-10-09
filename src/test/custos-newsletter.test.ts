import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { areaDe, filtrar, rotuloAcao } from "@/features/custos/agregar";
import type { RegistoCusto } from "@/services/custos";

const reg = (id: string, acao: string): RegistoCusto => ({ id, criado_em: new Date().toISOString(), fornecedor: "deepseek", modelo: "deepseek-flash", acao, estado: "concluido", unidades: {}, custo_eur: 0.01, custo_origem: "calculado" });

describe("custos da newsletter na página Custos", () => {
  it("separa newsletter de estúdio pela origem do registo", () => {
    expect(areaDe(reg("nl:1", "email"))).toBe("newsletter");
    expect(areaDe(reg("mc:1", "carrossel"))).toBe("estudio");
    const r = filtrar([reg("nl:1", "email"), reg("mc:1", "carrossel")], { periodo: "tudo", fornecedor: "todos", pesquisa: "", area: "newsletter" });
    expect(r.map((x) => x.id)).toEqual(["nl:1"]);
  });
  it("mostra nomes legíveis", () => {
    expect(rotuloAcao("curadoria_fila")).toBe("Curadoria (RSS)");
    expect(rotuloAcao("acao_nova")).toBe("acao_nova");
  });
  it("todos os ficheiros da newsletter que chamam a IA registam o custo", () => {
    const raiz = "supabase/functions/_shared/nl-app";
    const ficheiros: string[] = [];
    const andar = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) andar(p); else if (p.endsWith(".ts")) ficheiros.push(p); } };
    andar(raiz);
    // Files that only define or pass the AI helpers through; their callers register usage.
    const definem = ["lib/deepseek.server.ts", "lib/ia-extractor.server.ts", "lib/ia-ferramentas.server.ts", "edge-shared/pipeline-newsletter.ts", "lib/extrair-noticia.server.ts"];
    const semRegisto = ficheiros.filter((f) => {
      const s = readFileSync(f, "utf8");
      const chama = /await\s+(chamarDeepSeek|chamarIaExtrator|extrairComIA)\(/.test(s);
      return chama && !definem.some((d) => f.endsWith(d)) && !/nl_ia_uso|registarUso/.test(s);
    });
    expect(semRegisto).toEqual([]);
  });
  it("os emails registam a origem «email» em todos os pedidos", () => {
    for (const f of ["lib/reprocessar-email.server.ts", "hooks/email-newsletter.ts"]) {
      const s = readFileSync(`supabase/functions/_shared/nl-app/${f}`, "utf8");
      expect(s).toContain('registarUsoEmail(r.modelo, r.usage, "email_extrair")');
      expect(s).toContain('registarUsoEmail(r.modelo, r.usage, "email_blocos")');
    }
  });
});
