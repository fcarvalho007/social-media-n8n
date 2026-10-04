import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { parse } from "opentype.js";
import { criarMedidor, type FonteOT, type PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";

// Real measurer from the same TTFs (no network); canvas replaced by a stub that
// exposes the same onAlterar contract used by the Konva canvas.
const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const medidor = criarMedidor({
  400: parse(ab(readFileSync("public/fontes/WorkSans-Regular.ttf"))) as unknown as FonteOT,
  700: parse(ab(readFileSync("public/fontes/WorkSans-Bold.ttf"))) as unknown as FonteOT,
});

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u-prova" } }) }));
vi.mock("@/services/conteudos", () => ({ renderProvaServidor: vi.fn() }));
vi.mock("@/features/editor-grafico/fontes", () => ({ carregarMedidor: () => Promise.resolve(medidor) }));
vi.mock("@/features/editor-grafico/desenho", () => ({
  carregarImagens: () => Promise.resolve({}), compararPng: vi.fn(), renderizarPaginaPng: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/editor-grafico/PaginaCanvas", () => ({
  PaginaCanvas: (p: { pacote: PacoteProva; variante: "A" | "B"; indice: number; interativo?: boolean; onAlterar?: (id: string, patch: { x: number }) => void }) => {
    const c = p.pacote.variantes[p.variante].paginas[p.indice].camadas[0];
    return p.interativo ? <button data-testid="mover" data-x={c.x} onClick={() => p.onAlterar?.(c.id, { x: c.x + 37 })}>mover</button> : null;
  },
}));

import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";
import { FIXTURES } from "@/features/editor-grafico/fixtures";
import { chaveRecuperacao } from "@/lib/recuperacaoLocal";

const pacote = FIXTURES[0];
const chave = chaveRecuperacao("u-prova", "editor-prova", pacote.id, null);
const montar = () => render(<EditorGrafico pacoteInicial={pacote} chaveLocal={chave} titulo="Prova" />);
const xAtual = () => Number(screen.getByTestId("mover").getAttribute("data-x"));

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true }); });

describe("Editor gráfico (prova identificada) — recuperação local", () => {
  it("editar, sair e reabrir oferece Restaurar e repõe a edição", async () => {
    const x0 = pacote.variantes.A.paginas[0].camadas[0].x;
    const a = montar();
    fireEvent.click(await screen.findByTestId("mover"));
    expect(xAtual()).toBe(x0 + 37);
    await act(() => new Promise((r) => setTimeout(r, 700))); // autosave 600 ms
    a.unmount();

    montar();
    await screen.findByTestId("mover");
    expect(xAtual()).toBe(x0); // reopens from the original document
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    expect(xAtual()).toBe(x0 + 37);
  });

  it("Descartar apaga a cópia local", async () => {
    const a = montar();
    fireEvent.click(await screen.findByTestId("mover"));
    await act(() => new Promise((r) => setTimeout(r, 700)));
    a.unmount();
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Descartar" }));
    expect(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes(pacote.id)) ?? "x")).toBeNull();
  });

  it("importar JSON inválido mantém o estado corrente", async () => {
    const { container } = montar();
    fireEvent.click(await screen.findByTestId("mover"));
    const x1 = xAtual();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    for (const conteudo of ["{ isto não é json", JSON.stringify({ ...pacote, variantes: { A: { paginas: [] } } })]) {
      const f = new File([conteudo], "x.json", { type: "application/json" });
      Object.defineProperty(f, "text", { value: () => Promise.resolve(conteudo) });
      fireEvent.change(input, { target: { files: [f] } });
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(xAtual()).toBe(x1);
      toast.error.mockClear();
    }
    expect(toast.success).not.toHaveBeenCalled();
  });
});
