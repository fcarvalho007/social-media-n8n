import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const svc = vi.hoisted(() => ({
  listarProjetos: vi.fn(),
  listarIdentidades: vi.fn(),
  getMarca: vi.fn(),
  setMarca: vi.fn(),
}));
vi.mock("@/services/estudio", () => svc);

import { ProjetoProvider, useProjeto } from "@/contexts/ProjetoContext";

let api: ReturnType<typeof useProjeto>;
function Sonda() {
  api = useProjeto();
  return <div data-testid="s">{api.estado}|{api.projetoId ?? "todos"}|{api.erro ?? ""}</div>;
}
const P = [{ id: "a", name: "DIGITALSPRINT", color: null }, { id: "b", name: "Outro", color: null }];
const I = [{ id: "i1", chave: "digitalsprint", nome: "DIGITALSPRINT", tipo: "newsletter", project_id: "a" }];

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  svc.listarProjetos.mockResolvedValue(P);
  svc.listarIdentidades.mockResolvedValue(I);
  svc.getMarca.mockResolvedValue("a");
});

describe("contexto de projeto", () => {
  it("carrega a escolha persistida", async () => {
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("pronto|a|"));
    expect(api.projeto?.name).toBe("DIGITALSPRINT");
  });

  it("repõe a escolha anterior se guardar falhar", async () => {
    svc.setMarca.mockRejectedValue(new Error("sem rede"));
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(api.estado).toBe("pronto"));
    await act(async () => { await expect(api.escolher("b")).rejects.toThrow("sem rede"); });
    expect(screen.getByTestId("s").textContent).toBe("pronto|a|");
  });

  it("mostra erro (não lista vazia) quando o carregamento falha e permite repetir", async () => {
    svc.listarProjetos.mockRejectedValueOnce(new Error("permissão negada"));
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("erro|todos|permissão negada"));
    act(() => api.recarregar());
    await waitFor(() => expect(api.estado).toBe("pronto"));
  });

  it("filtra identidades pelo projeto sem misturar marcas", async () => {
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(api.estado).toBe("pronto"));
    expect(api.identidadesDoProjeto("a").map((i) => i.id)).toEqual(["i1"]);
    expect(api.identidadesDoProjeto("b")).toEqual([]);
  });

  it("projeto guardado que já não existe volta a todos", async () => {
    svc.getMarca.mockResolvedValue("apagado");
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("pronto|todos|"));
  });
});
