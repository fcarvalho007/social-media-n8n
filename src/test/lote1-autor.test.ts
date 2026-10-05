import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizarPerfil, regrasAutor, VOZ_BASE, OBJETIVO_LEITURA } from "../../supabase/functions/_shared/motor/autor";
import { promptSistema } from "../../supabase/functions/_shared/motor/gateway.server";
import { MODELO_IA } from "../../supabase/functions/_shared/motor/gateway.server";
import { OBJETIVOS } from "@/pages/CarrosselNovo";

describe("lote1: fornecedor real e voz do autor", () => {
  it("rótulo do modelo é DeepSeek real, sem Lovable AI", () => {
    const s = readFileSync("src/services/motor.ts", "utf8");
    expect(s).not.toMatch(/Lovable AI|GPT-6|Astra/);
    expect(s).toMatch(/deepseek-flash/);
    expect(MODELO_IA).toBe("deepseek-flash");
    expect(readFileSync("src/features/motor/LimitesIa.tsx", "utf8")).toMatch(/não são créditos da Lovable/);
  });
  it("sem perfil gravado usa a base confirmada; perfil inválido é limpo", () => {
    expect(normalizarPerfil(null).voz).toEqual(VOZ_BASE);
    expect(normalizarPerfil({ voz: ["critico", "xpto", "critico"], notas: " x " })).toMatchObject({ voz: ["critico"], notas: "x", apresentacao: "" });
  });
  it("prompt recebe voz e separa factos de leitura, sem inventar", () => {
    const sem = promptSistema(null);
    expect(sem).not.toMatch(/Voz do autor/);
    const com = promptSistema(null, { voz: ["consultor"], notas: "Fintech" }, true);
    expect(com).toMatch(/Voz: Autor consultor/);
    expect(com).toMatch(/Fintech/);
    expect(com).toMatch(/leitura do autor/);
    expect(com).toMatch(/Nunca inventes estudos, números, métricas, citações/);
    expect(regrasAutor(normalizarPerfil(null), false)).toMatch(/só no fecho/);
  });
  it("«Opinião» passou a «A minha leitura» e o servidor reconhece-a", () => {
    const o = OBJETIVOS.find((x) => x.id === "opiniao")!;
    expect(o.nome).toBe(OBJETIVO_LEITURA);
    expect(o.desc).not.toMatch(/ponto de vista da fonte/);
    const m = readFileSync("supabase/functions/mc-motor/index.ts", "utf8");
    expect(m).toMatch(/mc_perfis_autor/);
    expect(m).toMatch(/OBJETIVO_LEITURA/);
    expect(readFileSync("supabase/functions/_shared/motor/worker.server.ts", "utf8")).toMatch(/t\.brief\.autor/);
  });
});

describe("lote1: modo não-thinking e limite de saída", () => {
  it("todos os clientes DeepSeek desligam thinking; motor envia JSON e max_tokens", () => {
    for (const f of ["supabase/functions/_shared/deepseek-direto.ts", "supabase/functions/_shared/nl-app/lib/deepseek.server.ts", "supabase/functions/_shared/newsletter-engine/deepseek.server.ts"])
      expect(readFileSync(f, "utf8")).toMatch(/thinking: \{ type: "disabled" \}/);
    const g = readFileSync("supabase/functions/_shared/motor/gateway.server.ts", "utf8");
    expect(g).toMatch(/json: true, stream: true, maxTokens: MAX_TOKENS_MOTOR/);
  });
});
