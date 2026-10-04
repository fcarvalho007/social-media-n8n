import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const svc = vi.hoisted(() => ({
  listarProjetos: vi.fn(),
  listarIdentidades: vi.fn(),
  getMarca: vi.fn(),
  setMarca: vi.fn(),
}));
vi.mock("@/services/estudio", () => svc);

import { ProjetoProvider, ProjetoProviderPorConta, useProjeto } from "@/contexts/ProjetoContext";
import { notificarProjetosAlterados } from "@/lib/eventosProjetos";

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

  it("não muda a marca enquanto a gravação está pendente e recusa escolhas concorrentes", async () => {
    let resolver!: () => void;
    svc.setMarca.mockImplementation(() => new Promise<void>((r) => { resolver = r; }));
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(api.estado).toBe("pronto"));
    let p!: Promise<void>;
    act(() => { p = api.escolher("b"); });
    expect(screen.getByTestId("s").textContent).toBe("pronto|a|");
    await act(async () => { await expect(api.escolher(null)).rejects.toThrow(); });
    expect(svc.setMarca).toHaveBeenCalledTimes(1);
    await act(async () => { resolver(); await p; });
    expect(screen.getByTestId("s").textContent).toBe("pronto|b|");
  });

  it("falha a ler a preferência mostra erro em vez de todos", async () => {
    svc.getMarca.mockRejectedValueOnce(new Error("leitura falhou"));
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("erro|todos|leitura falhou"));
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

  it("projeto recém-criado fica disponível no seletor sem recarregar a página", async () => {
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(api.estado).toBe("pronto"));
    svc.listarProjetos.mockResolvedValue([...P, { id: "novo", name: "NOVO", color: null }]);
    act(() => notificarProjetosAlterados());
    await waitFor(() => expect(api.projetos.map((p) => p.id)).toContain("novo"));
    expect(api.projetoId).toBe("a");
  });

  it("recarga pedida durante gravação pendente espera e não troca a escolha", async () => {
    let resolver!: () => void;
    svc.setMarca.mockImplementation(() => new Promise<void>((r) => { resolver = r; }));
    render(<ProjetoProvider><Sonda /></ProjetoProvider>);
    await waitFor(() => expect(api.estado).toBe("pronto"));
    let p!: Promise<void>;
    act(() => { p = api.escolher("b"); });
    svc.getMarca.mockResolvedValue("b");
    act(() => notificarProjetosAlterados());
    expect(svc.listarProjetos).toHaveBeenCalledTimes(1);
    await act(async () => { resolver(); await p; });
    await waitFor(() => expect(svc.listarProjetos).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("pronto|b|"));
  });

  it("troca de conta não herda o estado anterior", async () => {
    const { rerender } = render(<ProjetoProviderPorConta userId="u1"><Sonda /></ProjetoProviderPorConta>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("pronto|a|"));
    svc.listarProjetos.mockResolvedValue([P[1]]);
    svc.getMarca.mockResolvedValue(null);
    rerender(<ProjetoProviderPorConta userId="u2"><Sonda /></ProjetoProviderPorConta>);
    await waitFor(() => expect(screen.getByTestId("s").textContent).toBe("pronto|todos|"));
    expect(api.projetos.map((p) => p.id)).toEqual(["b"]);
  });
});
