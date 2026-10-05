import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { normalizarLeitura, normalizarPerfil } from "../../supabase/functions/_shared/motor/autor";
import { chamarGateway, promptSistema, promptUtilizador } from "../../supabase/functions/_shared/motor/gateway.server";

const perfil = normalizarPerfil({
  voz: ["consultor", "pedagogico"], apresentacao: "Consultor e docente universitário.", publico: "PME portuguesas.",
  teses: "Estratégia antes da ferramenta.", objetivo_cronica: "Tese própria e ação útil.",
});

afterEach(() => { delete (globalThis as { Deno?: unknown }).Deno; });

describe("contexto do autor chega ao pedido real", () => {
  it("o corpo enviado à DeepSeek contém contexto, ângulo, leitura e regras de separação", async () => {
    (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => (k === "DEEPSEEK_API_KEY" ? "teste" : undefined) } };
    const f = vi.fn().mockResolvedValue(new Response("data: [DONE]\n", { status: 200 }));
    const sis = promptSistema(null, perfil, true, { angulo: "questionar_hype", especifica: "Só compensa com processos." });
    await chamarGateway("deepseek-flash", sis, promptUtilizador(["Facto A."], { slides: 3 }), f as unknown as typeof fetch);
    const corpo = JSON.parse(f.mock.calls[0][1].body);
    expect(corpo.model).toBe("deepseek-flash");
    expect(corpo.thinking).toEqual({ type: "disabled" });
    expect(corpo.response_format).toEqual({ type: "json_object" });
    expect(typeof corpo.max_tokens).toBe("number");
    const s = corpo.messages[0].content as string;
    for (const t of ["Consultor e docente", "PME portuguesas", "Estratégia antes da ferramenta", "Tese própria e ação útil", "Questionar o hype", "Só compensa com processos"]) expect(s).toContain(t);
    expect(s).toMatch(/não são factos da fonte/);
    expect(s).toMatch(/nunca uses o contexto do autor como fonte de factos/);
    expect(s).toMatch(/não repitas a biografia/);
    expect(s).toMatch(/clientes, falas nem experiências pessoais/);
    // facts stay in the user message, author context never does
    const u = corpo.messages[1].content as string;
    expect(u).toContain("§1: Facto A.");
    expect(u).not.toContain("Consultor e docente");
  });
  it("sem leitura do autor, interpretação só no fecho; ângulo inválido é ignorado", () => {
    expect(promptSistema(null, perfil, false)).toMatch(/só no fecho/);
    expect(normalizarLeitura("xpto", "a".repeat(500))).toEqual({ angulo: null, especifica: "a".repeat(300) });
  });
  it("servidor lê o perfil persistido do projeto, guarda snapshot e reformulação usa o snapshot do original", () => {
    const m = readFileSync("supabase/functions/mc-motor/index.ts", "utf8");
    expect(m).toMatch(/select\("voz, notas, apresentacao, publico, teses, objetivo_cronica"\)/);
    expect(m).toMatch(/autor, leitura, leitura_trabalho: leituraTrabalho/);
    expect(m).toMatch(/reuse the origin job's snapshot/);
    expect(readFileSync("supabase/functions/_shared/motor/worker.server.ts", "utf8")).toMatch(/t\.brief\.leitura_trabalho/);
  });
  it("nenhum perfil está fixo no código", () => {
    for (const f of ["supabase/functions/_shared/motor/autor.ts", "supabase/functions/mc-motor/index.ts", "src/features/motor/PerfilAutorPainel.tsx"])
      expect(readFileSync(f, "utf8")).not.toMatch(/Frederico|DIGITALFC|DIGITALSPRINT/);
  });
});
