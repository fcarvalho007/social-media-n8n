import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "utilizador-r1" } }) }));
vi.mock("@/features/editor-grafico/fontes", () => ({
  carregarMedidor: async () => ({ largura: (t: string, n: number) => t.length * n * 0.5, ascendente: () => 0.8, descendente: () => 0.2, caminho: () => "M 0 0 L 1 1 Z" }),
}));
vi.mock("@/features/editor-grafico/desenho", () => ({
  carregarImagens: async () => ({}), compararPng: async () => ({ fracao: 0, perda: 0, piorZona: 0, diferenca: "data:image/png;base64," }),
  renderizarPaginaPng: async () => "data:image/png;base64,",
}));
vi.mock("@/features/editor-grafico/PaginaCanvas", () => ({
  PaginaCanvas: ({ onSelecionar }: { onSelecionar?: (id: string) => void }) => (
    <div data-testid={onSelecionar ? "canvas-toque" : "miniatura"} onPointerDown={() => onSelecionar?.("s1-titulo")}>Slide editável</div>
  ),
}));
vi.mock("@/services/conteudos", () => ({ renderProvaServidor: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

class ResizeObserverTeste {
  constructor(_cb: ResizeObserverCallback) {}
  observe() {}
  disconnect() {}
  unobserve() {}
}

async function abrirEditor() {
  const { default: EditorProva } = await import("@/pages/EditorProva");
  return render(<EditorProva />);
}

describe("Editor de carrosséis R1 no telemóvel", () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    Object.defineProperty(window, "ResizeObserver", { configurable: true, value: ResizeObserverTeste });
    Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: ResizeObserverTeste });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:prova") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("seleciona por toque, edita com teclado e desfaz/refaz", async () => {
    const vista = await abrirEditor();
    fireEvent.pointerDown(await screen.findByTestId("canvas-toque"), { pointerType: "touch" });
    const campo = await screen.findByLabelText(/Texto \(partilhado/);
    fireEvent.change(campo, { target: { value: "Texto por toque e teclado virtual" } });
    expect(campo).toHaveValue("Texto por toque e teclado virtual");

    fireEvent.click(screen.getByRole("button", { name: /Desfazer/ }));
    expect(await screen.findByLabelText(/Texto \(partilhado/)).not.toHaveValue("Texto por toque e teclado virtual");
    fireEvent.click(screen.getByRole("button", { name: /Refazer/ }));
    expect(await screen.findByLabelText(/Texto \(partilhado/)).toHaveValue("Texto por toque e teclado virtual");

    vista.unmount();
  });

  it("guarda localmente e oferece recuperação ao reabrir", async () => {
    const vista = await abrirEditor();
    fireEvent.pointerDown(await screen.findByTestId("canvas-toque"), { pointerType: "touch" });
    fireEvent.change(await screen.findByLabelText(/Texto \(partilhado/), { target: { value: "Texto recuperável" } });
    await act(() => new Promise((resolve) => setTimeout(resolve, 650)));
    expect(Object.keys(localStorage).some((k) => k.includes("utilizador-r1") && k.includes("editor-prova"))).toBe(true);
    vista.unmount();
    await abrirEditor();
    expect(await screen.findByText(/Há uma cópia local/)).toBeInTheDocument();
  });

  it("recusa JSON inválido sem perder o rascunho local", async () => {
    await abrirEditor();
    fireEvent.pointerDown(await screen.findByTestId("canvas-toque"));
    fireEvent.change(await screen.findByLabelText(/Texto \(partilhado/), { target: { value: "Rascunho que fica" } });
    await act(() => new Promise((resolve) => setTimeout(resolve, 650)));
    const antes = Object.values(localStorage).join("");

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["{inválido"], "invalido.json", { type: "application/json" })] } });
    await waitFor(() => expect(Object.values(localStorage).join("")).toBe(antes));
    expect(await screen.findByLabelText(/Texto \(partilhado/)).toHaveValue("Rascunho que fica");
  });
});