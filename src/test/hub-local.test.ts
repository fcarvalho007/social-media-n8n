// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { criarClienteHubLocal } from "../dev/supabaseHubLocal";
import { DEMO_PROJECT_ID, DEMO_USER_ID } from "../dev/hubFixtures";
import viteConfig from "../../vite.config";

describe("demonstração local da plataforma", () => {
  it("navega por fixtures sem abrir uma ligação ao Cloud", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const client = criarClienteHubLocal();
    const projetos = await client.from("projects").select("*");
    const artigos = await client.from("art_rascunhos").select("*").eq("project_id", DEMO_PROJECT_ID);
    const rascunhos = await client.from("posts_drafts").select("id", { count: "exact", head: true }).eq("status", "draft");
    expect(projetos.data).toHaveLength(2);
    expect(artigos.data).toHaveLength(1);
    expect(rascunhos.count).toBe(2);
    expect((await client.auth.getUser()).data.user.id).toBe(DEMO_USER_ID);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("persiste só as alterações permitidas no armazenamento da demonstração", async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    const client = criarClienteHubLocal(storage);
    const guardado = await client.from("art_rascunhos").insert({ titulo: "Texto de teste", project_id: DEMO_PROJECT_ID }).select().single();
    expect(guardado.error).toBeNull();
    const reaberto = criarClienteHubLocal(storage);
    const { data } = await reaberto.from("art_rascunhos").select().eq("titulo", "Texto de teste");
    expect(data).toHaveLength(1);
    expect([...values.keys()]).toEqual(["hub:demo:plataforma:v1"]);
  });

  it("recusa tabelas desconhecidas, evidência de envios e todas as funções externas", async () => {
    const client = criarClienteHubLocal();
    const resultados = await Promise.all([
      client.from("segredos").select(),
      client.from("nl_edicoes").update({ estado: "enviada" }),
      client.from("user_roles").insert({ role: "admin" }),
      client.rpc("nl_curadoria_decidir", { _id: "qualquer", _estado: "aprovada" }),
      client.functions.invoke("nl-newsletter", { body: { acao: "enviar" } }),
      client.functions.invoke("mc-motor", { body: { acao: "gerar" } }),
      client.auth.updateUser(),
    ]);
    resultados.forEach((r) => { expect(r.data).toBeNull(); expect(r.error?.code).toBe("LOCAL_ONLY"); });
  });

  it("serve a aplicação real, mas não permite compilar o modo de demonstração para produção", async () => {
    if (typeof viteConfig !== "function") throw new Error("Configuração Vite inesperada");
    const local = await viteConfig({ mode: "hub", command: "serve" });
    const producao = await viteConfig({ mode: "production", command: "build" });
    expect(local.resolve?.alias).toMatchObject({ "@/integrations/supabase/client": expect.stringContaining("supabaseHubLocal.ts"), "@/contexts/AuthContext": expect.stringContaining("authHubLocal.tsx") });
    expect(producao.resolve?.alias).not.toHaveProperty("@/integrations/supabase/client");
    expect(local.server?.headers?.["Content-Security-Policy"]).toContain("connect-src 'self'");
    expect(producao.server?.headers).toBeUndefined();
    expect(() => (viteConfig as (args: { mode: string; command: string }) => unknown)({ mode: "hub", command: "build" })).toThrow("apenas uma demonstração local");
  });
});
