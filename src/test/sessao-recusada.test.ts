import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshSession, signOut, invoke } = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  signOut: vi.fn(async (_o?: unknown) => ({ error: null })),
  invoke: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { refreshSession, signOut, onAuthStateChange: vi.fn(), getSession: vi.fn() }, functions: { invoke } },
}));

import { tratarSessaoRecusada } from "@/lib/sessaoRecusada";

beforeEach(() => { refreshSession.mockReset(); signOut.mockClear(); invoke.mockReset(); });

describe("sessão recusada", () => {
  it("renovação recusada pelo servidor → termina sessão local", async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 400, message: "Invalid Refresh Token" } });
    expect(await tratarSessaoRecusada()).toBe(true);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("renovação bem-sucedida → mantém sessão", async () => {
    refreshSession.mockResolvedValue({ data: { session: { access_token: "x" } }, error: null });
    expect(await tratarSessaoRecusada()).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
  it("falha de serviço (5xx/rede) → não termina a sessão", async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: { status: 504, message: "timeout" } });
    expect(await tratarSessaoRecusada()).toBe(false);
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: "Failed to fetch" } });
    expect(await tratarSessaoRecusada()).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});
