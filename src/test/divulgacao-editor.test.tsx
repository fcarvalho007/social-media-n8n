import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DivulgacaoEditor } from "../features/conteudos/DivulgacaoEditor";
import { fonteDivulgacao as fonte } from "../dev/divulgacaoFixture";
import { prepararDivulgacaoBase } from "../../supabase/functions/_shared/conteudos/divulgacao";

vi.mock("@/features/conteudos/exportar", () => ({ desenharStory: vi.fn(async () => {}), exportarStory: vi.fn(async () => {}) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("revisão das peças", () => {
  it("editar exige gravar; rever não publica e uma nova edição exige revisão", async () => {
    const inicial = prepararDivulgacaoBase(fonte, null);
    const guardar = vi.fn(async (_id, versao, story, estado) => ({ divulgacao: { ...inicial, story, estado }, divulgacao_versao: versao + 1 }));
    render(<DivulgacaoEditor id="test" fonte={fonte} inicial={inicial} versaoInicial={1} onActualizar={vi.fn()} onAlterado={vi.fn()} api={{ guardar, preparar: vi.fn() }}><p>Editor do carrossel</p></DivulgacaoEditor>);
    const input = screen.getByLabelText(/Convite à leitura/);
    await act(async () => { fireEvent.change(input, { target: { value: "Ler a crónica completa" } }); });
    expect(screen.getByRole("button", { name: "Marcar como revisto" })).toBeDisabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Guardar Story" })); });
    await waitFor(() => expect(guardar).toHaveBeenCalledWith("test", 1, expect.objectContaining({ cta: "Ler a crónica completa" }), "rascunho"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Marcar como revisto" })); });
    await screen.findByText("Revisto · publicação manual");
    expect(guardar).toHaveBeenLastCalledWith("test", 2, expect.anything(), "revisto");
    await act(async () => { fireEvent.change(input, { target: { value: "Outra leitura" } }); });
    expect(screen.getByText("Alterações por guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como revisto" })).toBeDisabled();
  });
  it("um conflito mantém o texto e mostra uma recuperação clara", async () => {
    const inicial = prepararDivulgacaoBase(fonte, null);
    render(<DivulgacaoEditor id="test" fonte={fonte} inicial={inicial} versaoInicial={1} onActualizar={vi.fn()} onAlterado={vi.fn()} api={{ guardar: vi.fn().mockRejectedValue(new Error("Outro editor guardou uma versão mais recente. Copia o teu texto antes de reabrir.")), preparar: vi.fn() }}><p>Editor do carrossel</p></DivulgacaoEditor>);
    const input = screen.getByLabelText(/Convite à leitura/);
    await act(async () => { fireEvent.change(input, { target: { value: "O meu texto" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Guardar Story" })); });
    await screen.findByText(/Outro editor guardou/);
    expect(input).toHaveValue("O meu texto");
    expect(screen.getByRole("button", { name: "Guardar Story" })).toBeEnabled();
  });
});
