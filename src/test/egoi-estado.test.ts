import { describe, expect, it, vi } from "vitest";
import { consultarEstadoCampanha } from "../../supabase/functions/_shared/newsletter-engine/egoi-estado";

const H = "abc123";
const resp = (status: number, body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const item = (status: string, campaign_hash = H, channel = "email") => ({ campaign_hash, channel, status });

function chamar(r: Response) {
  const f = vi.fn(async (_u: RequestInfo | URL, _i?: RequestInit) => r);
  return { f, p: consultarEstadoCampanha("chave", H, f as unknown as typeof fetch) };
}

describe("estado da campanha E-goi", () => {
  it("usa só GET /campaigns filtrado por canal e hash", async () => {
    const { f, p } = chamar(resp(200, { items: [item("sent")] }));
    await p;
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe(`https://api.egoiapp.com/campaigns?channel=email&campaign_hash=${H}&limit=10`);
    expect(init?.method).toBe("GET");
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("sent confirma entrega", async () => {
    expect(await chamar(resp(200, { items: [item("sent")] })).p).toEqual({ ok: true, estado: "enviada", bruto: "sent" });
  });
  it("sending e queued não confirmam", async () => {
    expect(await chamar(resp(200, { items: [item("sending")] })).p).toMatchObject({ ok: true, estado: "a_enviar" });
    expect(await chamar(resp(200, { items: [item("queued")] })).p).toMatchObject({ ok: true, estado: "a_enviar" });
  });
  it("hash ou canal diferentes nunca contam como sent", async () => {
    expect(await chamar(resp(200, { items: [item("sent", "outro")] })).p).toMatchObject({ ok: false, status: 404 });
    expect(await chamar(resp(200, { items: [item("sent", H, "sms")] })).p).toMatchObject({ ok: false, status: 404 });
  });
  it("lista vazia ou resposta sem items é erro, não sent", async () => {
    expect(await chamar(resp(200, { items: [] })).p).toMatchObject({ ok: false });
    expect(await chamar(resp(200, {})).p).toMatchObject({ ok: false });
  });
  it("401 e 404 propagam erro", async () => {
    const a = await chamar(resp(401, "unauthorized")).p;
    expect(a).toMatchObject({ ok: false, status: 401 });
    expect((a as { mensagem: string }).mensagem).toContain("chave recusada");
    expect(await chamar(resp(404, "nf")).p).toMatchObject({ ok: false, status: 404 });
  });
  it("hash inválido não faz pedido", async () => {
    const f = vi.fn();
    expect(await consultarEstadoCampanha("k", "a/b?x", f as unknown as typeof fetch)).toMatchObject({ ok: false, status: 400 });
    expect(f).not.toHaveBeenCalled();
  });
});
