import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { erroDeSessao } from "@/lib/sessaoRecusada";

describe("sessão expirada vs falta de permissão", () => {
  it("JWT expirado conta como sessão, não como permissão", () => {
    expect(erroDeSessao("PGRST301", true)).toBe(true);
  });
  it("42501 sem sessão é sessão expirada", () => {
    expect(erroDeSessao("42501", false)).toBe(true);
  });
  it("42501 com sessão válida é mesmo falta de permissão", () => {
    expect(erroDeSessao("42501", true)).toBe(false);
  });
});
