import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chamarGateway, classificarStatus, lerStream, promptUtilizador } from "../../supabase/functions/_shared/motor/gateway.server";
import { normalizarFonte, validarRespostaModelo } from "../../supabase/functions/_shared/motor/proposta";

const g = globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } };
beforeEach(() => { g.Deno = { env: { get: (k) => (k === "DEEPSEEK_API_KEY" ? "teste" : undefined) } }; });
afterEach(() => { delete g.Deno; });

const sse = (partes: string[]) => new Response(new ReadableStream({ start(c) { const e = new TextEncoder(); for (const p of partes) c.enqueue(e.encode(p)); c.close(); } }), { status: 200 });
const resp = (status: number) => new Response("{}", { status });
const f = (r: Response | Error) => (async () => { if (r instanceof Error) throw r; return r; }) as unknown as typeof fetch;

describe("classificação de falhas do Gateway", () => {
  it("credencial, saldo, acesso, limite de taxa e pedido inválido são recusas conhecidas", async () => {
    for (const [st, c] of [[401, "credencial"], [402, "saldo"], [403, "acesso"], [429, "limite_taxa"], [400, "pedido_invalido"]] as const) {
      const r = await chamarGateway("m", "s", "u", f(resp(st)));
      expect(r).toMatchObject({ tipo: "recusado", classe: c, status: st });
    }
  });
  it("5xx, rede e fluxo interrompido são desconhecidos (nunca repetidos às cegas)", async () => {
    expect((await chamarGateway("m", "s", "u", f(resp(503)))).tipo).toBe("desconhecido");
    expect((await chamarGateway("m", "s", "u", f(new Error("timeout")))).tipo).toBe("desconhecido");
    expect((await chamarGateway("m", "s", "u", f(sse(['data: {"choices":[{"delta":{"content":"{\\"a\\""}}]}\n'])))).tipo).toBe("desconhecido");
    expect(classificarStatus(500)).toBe("desconhecido");
  });
  it("sem chave falha antes do pedido", async () => {
    g.Deno = { env: { get: () => undefined } };
    expect((await chamarGateway("m", "s", "u", f(resp(200)))).tipo).toBe("erro_antes_pedido");
  });
  it("lê o fluxo completo, com contagem de tokens", async () => {
    const r = await chamarGateway("m", "s", "u", f(sse([
      'data: {"choices":[{"delta":{"content":"{\\"ok\\":"}}]}\n',
      'data: {"choices":[{"delta":{"content":"1}"},"finish_reason":"stop"}]}\n',
      'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n', "data: [DONE]\n",
    ])));
    expect(r).toMatchObject({ tipo: "resposta", texto: '{"ok":1}', tokensEntrada: 10, tokensSaida: 5 });
  });
  it("lerStream tolera frames partidos", async () => {
    const s = await lerStream(sse(['data: {"choices":[{"delta":{"content":"ab"}}', ']}\ndata: [DONE]\n']).body!);
    expect(s).toMatchObject({ texto: "ab", completo: true });
  });
});

describe("contrato da resposta", () => {
  const fonte = normalizarFonte("Uma equipa prepara a newsletter semanal.\n\nAntes de publicar, a equipa revê as fontes e aprova o texto.");
  const ok = { titulo: "Como sai a newsletter", legenda: "Do rascunho à aprovação.", alt: ["Capa", "Revisão", "Fecho"], slides: [
    { papel: "capa", titulo: "Newsletter semanal", texto: "Uma pequena equipa.", fontes: [1] },
    { papel: "desenvolvimento", titulo: "Rever antes", texto: "Fontes revistas e texto aprovado.", fontes: [2] },
    { papel: "fecho", titulo: "Aprovar primeiro", texto: "Nada sai sem aprovação.", fontes: [] },
  ] };
  it("aceita JSON válido (também dentro de bloco de código) e usa o alt do modelo", () => {
    const r = validarRespostaModelo("```json\n" + JSON.stringify(ok) + "\n```", fonte, 3);
    expect(r.alt).toEqual(["Capa", "Revisão", "Fecho"]);
  });
  it("recusa JSON inválido, número errado de slides e slide sem referência", () => {
    expect(() => validarRespostaModelo("não é json", fonte)).toThrow(/JSON/);
    expect(() => validarRespostaModelo(JSON.stringify(ok), fonte, 4)).toThrow(/Pedidos 4/);
    const sem = { ...ok, slides: ok.slides.map((s, i) => (i === 1 ? { ...s, fontes: [] } : s)) };
    expect(() => validarRespostaModelo(JSON.stringify(sem), fonte)).toThrow(/referência/);
  });
  it("o pedido de reparação inclui o erro anterior e a fonte como dados", () => {
    const p = promptUtilizador(fonte.paragrafos, { slides: 3 }, "Slide 2: falta referência");
    expect(p).toContain("rejeitada: Slide 2");
    expect(p).toContain("§2: Antes de publicar");
  });
});
