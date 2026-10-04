import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const invoke = vi.fn(() => new Promise<never>(() => {}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      setSession: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke },
  },
}));

import { AuthProvider, LIMITE_ENTRADA_MS } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";

describe("página de entrada com serviço sem resposta", () => {
  it("reativa o botão e mostra 'Serviço indisponível' ao fim do limite", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MemoryRouter><AuthProvider><Auth /></AuthProvider></MemoryRouter>);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "fredericodigital@gmail.com" } });
    const botao = screen.getByRole("button", { name: /entrar/i });
    fireEvent.click(botao);
    await waitFor(() => expect(botao).toBeDisabled());
    await act(async () => { vi.advanceTimersByTime(LIMITE_ENTRADA_MS + 10); });
    await waitFor(() => expect(botao).not.toBeDisabled());
    expect(screen.getByText(/Serviço indisponível/)).toBeTruthy();
    vi.useRealTimers();
  });
});
