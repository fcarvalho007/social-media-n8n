import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const m = vi.hoisted(() => ({ listar: vi.fn(), apagar: vi.fn(), ler: vi.fn() }));
vi.mock("@/services/estudio", () => ({ listarPorConcluir: m.listar, apagarPorConcluir: m.apagar, lerRascunhoSocial: m.ler }));
import { ContinuarOndeFicaste } from "@/features/painel/ContinuarOndeFicaste";

const item = { tipo: "social", id: "d1", titulo: "Post IA", etapa: "Rascunho · instagram", atualizado: "2026-10-20T10:00:00Z", miniatura: null };
const montar = () => render(<MemoryRouter><ContinuarOndeFicaste projetoId={null} edicao={{ numero: 320, estado: "rascunho" }} /></MemoryRouter>);

describe("Continuar onde ficaste", () => {
  beforeEach(() => { vi.clearAllMocks(); m.listar.mockResolvedValue({ itens: [item], total: 1 }); m.apagar.mockResolvedValue(undefined); });

  it("newsletter edition offers resume but never delete", async () => {
    montar();
    await screen.findByText("Post IA");
    expect(screen.getByText(/edição #320/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Apagar rascunho: Newsletter/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Apagar rascunho/ })).toHaveLength(1);
  });

  it("deleting asks for confirmation before calling the service", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Apagar rascunho: Post IA" }));
    expect(m.apagar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(m.apagar).toHaveBeenCalledWith(item));
  });
});
