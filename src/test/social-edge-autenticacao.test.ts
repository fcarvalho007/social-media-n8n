// @vitest-environment node
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
// Execute the real entrypoint handlers with denied sessions, not regex assertions.
async function handler(name: string, client: any) {
  const file = resolve("supabase/functions", name, "index.ts");
  const r = await build({
    stdin: {
      contents: readFileSync(file, "utf8"),
      loader: "ts",
      resolveDir: dirname(file),
    },
    write: false,
    bundle: true,
    platform: "node",
    format: "cjs",
    plugins: [{
      name: "test-runtime",
      setup(b) {
        b.onResolve(
          { filter: /^npm:@supabase\/supabase-js/ },
          () => ({ path: "client", namespace: "test-runtime" }),
        );
        b.onResolve(
          { filter: /^https:\/\/deno.land\/std.*server.ts/ },
          () => ({ path: "serve", namespace: "test-runtime" }),
        );
        b.onLoad(
          { filter: /.*/, namespace: "test-runtime" },
          (a) => ({
            contents: a.path === "client"
              ? "export const createClient=()=>globalThis.testClient;"
              : "export const serve=globalThis.Deno.serve;",
          }),
        );
      },
    }],
  });
  let fn: (req: Request) => Promise<Response>;
  // Dependencies are injected into an isolated lexical scope, never into production.
  const boot = new Function(
    "globalThis",
    "Deno",
    "Response",
    "Request",
    "fetch",
    r.outputFiles[0].text,
  );
  const outbound = vi.fn(() => {
    throw new Error("No outbound calls permitted in authentication tests");
  });
  boot(
    {
      testClient: client,
      Deno: {
        serve: (f: typeof fn) => {
          fn = f;
        },
      },
    },
    {
      serve: (f: typeof fn) => {
        fn = f;
      },
      env: {
        get: (key: string) =>
          key === "SUPABASE_URL"
            ? "https://test.invalid"
            : "configured-test-only",
      },
    },
    Response,
    Request,
    outbound,
  );
  return {
    request: async (method = "POST", body?: unknown) =>
      fn(
        new Request("https://hub.test/" + name, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
        }),
      ),
    outbound,
  };
}
describe("rotas sociais reais: recusa antes de qualquer acesso ou efeito externo", () => {
  for (
    const name of [
      "publish-to-getlate",
      "publish-proxy",
      "submit-to-n8n",
      "sync-getlate-posts",
      "get-getlate-accounts",
      "import-instagram-data",
      "import-instagram-profiles",
      "callback",
      "incoming",
    ]
  ) {
    it(`${name}: pedido anónimo não lê/escreve dados nem contacta fornecedores`, async () => {
      const table = vi.fn(() => {
        throw new Error("No database writes permitted");
      });
      const h = await handler(name, {
        from: table,
        auth: {
          getUser: async () => ({
            data: { user: null },
            error: new Error("No session"),
          }),
        },
      });
      expect((await h.request()).status).toBe(401);
      expect(h.outbound).not.toHaveBeenCalled();
      expect(table).not.toHaveBeenCalled();
    });
  }
  it("o agendador antigo nunca volta a publicar nem em POST nem em GET", async () => {
    const h = await handler("send-scheduled-posts", {});
    expect((await h.request()).status).toBe(410);
    expect((await h.request("GET")).status).toBe(410);
    expect(h.outbound).not.toHaveBeenCalled();
  });
});
