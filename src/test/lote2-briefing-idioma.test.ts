import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { linhasBriefing, normalizarBriefing, slidesPorQuantidade, textoTom, TONS, PUBLICOS, CTAS } from "../../supabase/functions/_shared/motor/briefing";
import { detetarIdioma, hashTexto, validarTraducao, promptTraducaoSistema } from "../../supabase/functions/_shared/motor/traducao";
import { chamarGateway, promptSistema, promptUtilizador } from "../../supabase/functions/_shared/motor/gateway.server";

afterEach(() => { delete (globalThis as { Deno?: unknown }).Deno; });
const EN = "The company announced that revenue grew 37% in 2024, reaching 12.5 million euros. The board said this was the result of a new strategy and that the team will keep investing in automation for small businesses.";

describe("presets do briefing", () => {
  it("cada grupo tem pelo menos 3 presets reais", () => {
    expect(TONS.length).toBeGreaterThanOrEqual(3); expect(PUBLICOS.length).toBeGreaterThanOrEqual(3); expect(CTAS.length).toBeGreaterThanOrEqual(3);
  });
  it("escolhas chegam ao corpo enviado à DeepSeek", async () => {
    (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: () => "k" } };
    const f = vi.fn().mockResolvedValue(new Response("data: [DONE]\n", { status: 200 }));
    const b = normalizarBriefing({ publico: ["pme", "xpto"], publicoOutro: "Equipas comerciais", cta: "newsletter" });
    await chamarGateway("deepseek-flash", promptSistema(null), promptUtilizador(["Facto."], { slides: 3, tom: textoTom("critico", ""), briefing: b as unknown as Record<string, unknown> }), f as unknown as typeof fetch);
    const u = JSON.parse(f.mock.calls[0][1].body).messages[1].content as string;
    expect(u).toContain("Tom: Crítico e provocador");
    expect(u).toContain("Público deste carrossel: PME portuguesas; Equipas comerciais.");
    expect(u).toMatch(/Apelo final: .*newsletter, sem inventar nomes, endereços nem URLs/);
    expect(linhasBriefing(normalizarBriefing(null))).toEqual([]);
  });
  it("extensão respeita a capacidade da fonte", () => {
    expect(slidesPorQuantidade(5, 6)).toEqual({ breve: 3, equilibrado: 5, aprofundado: 6 });
    const r = slidesPorQuantidade(2, 2); expect(Math.max(r.breve, r.equilibrado, r.aprofundado)).toBe(2);
  });
  it("saída é sempre PT-PT e o servidor persiste idioma, briefing e tradução", () => {
    expect(promptSistema(null)).toMatch(/português europeu \(pt-PT\)/);
    const m = readFileSync("supabase/functions/mc-motor/index.ts", "utf8");
    expect(m).toMatch(/idioma_saida: "pt-PT"/);
    expect(m).toMatch(/briefing: briefingEd/);
    expect(m).toMatch(/never trusts the client copy/);
    expect(m).toMatch(/if \(otr && !traducao\) traducao = otr/);
  });
});

describe("tradução da fonte", () => {
  it("deteta inglês honestamente e não marca PT como estrangeiro", () => {
    expect(detetarIdioma(EN).idioma).toBe("en");
    expect(detetarIdioma("A empresa anunciou que as receitas cresceram 37% em 2024 e que a equipa vai continuar a investir em automação para as pequenas empresas do país.").idioma).toBe("pt");
    expect(detetarIdioma("curto").confianca).toBe("baixa");
  });
  it("hash muda com o texto (nova fonte invalida a tradução)", async () => {
    expect(await hashTexto("a")).not.toBe(await hashTexto("b"));
    expect((await hashTexto("a")).length).toBe(64);
  });
  it("valida §, números e URLs; bloqueia alterações", () => {
    const o = ["Revenue grew 37% in 2024.", "See https://ex.com/a for 12.5 million."];
    expect(validarTraducao(o, { paragrafos: ["As receitas cresceram 37% em 2024.", "Ver https://ex.com/a para 12,5 milhões."] }).ok).toBe(true);
    expect(validarTraducao(o, { paragrafos: ["Só um."] })).toMatchObject({ ok: false });
    expect(validarTraducao(o, { paragrafos: ["Cresceram 38% em 2024.", "Ver https://ex.com/a para 12,5 milhões."] })).toMatchObject({ ok: false, motivo: expect.stringMatching(/números de §1/) });
    expect(validarTraducao(o, { paragrafos: ["Cresceram 37% em 2024.", "Ver o site para 12,5 milhões."] })).toMatchObject({ ok: false });
    expect(promptTraducaoSistema()).toMatch(/Nunca uses português do Brasil/);
  });
  it("reserva única por hash, reutiliza válida, nunca repete resultado desconhecido, conta no mesmo orçamento", () => {
    const sql = readFileSync("drizzle/migrations/0026_mc_traducoes.sql", "utf8");
    expect(sql).toMatch(/UNIQUE \(project_id, hash_original, idioma_destino\)/);
    expect(sql).toMatch(/IF _r.estado = 'valida' THEN RETURN QUERY SELECT _r.id, _r.estado, true/);
    expect(sql).toMatch(/'reservada','pedido_enviado','desconhecido'\) THEN\s+RAISE EXCEPTION/);
    expect(sql).toMatch(/_dia := public.mc_uso_dia/);
    const srv = readFileSync("supabase/functions/_shared/motor/traducao.server.ts", "utf8");
    expect(srv).not.toMatch(/ai\.gateway\.lovable/);
    expect(readFileSync("supabase/functions/mc-motor/index.ts", "utf8")).toMatch(/body.confirmar !== true/);
  });
  it("UI descarta respostas antigas e não traduz sem confirmação", () => {
    const ui = readFileSync("src/features/motor/PainelIdioma.tsx", "utf8");
    expect(ui).toMatch(/stale: source changed meanwhile/);
    expect(ui).toMatch(/Confirmar tradução/);
    expect(ui).toMatch(/Avançar em PT-PT/);
    expect(ui).toMatch(/useState<EscolhaIdioma>\("pt"\)/);
  });
});
