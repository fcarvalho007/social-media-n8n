import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: Error) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void; let reject!: (e: Error) => void;
  const promise = new Promise<T>((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
}

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/contexts/ProjetoContext", () => ({
  useProjeto: () => ({ estado: "pronto", projetoId: "p1", projeto: { id: "p1", name: "Marca" }, projetos: [{ id: "p1", name: "Marca" }] }),
}));

const estudio = vi.hoisted(() => ({ listarArtigos: vi.fn(), guardarArtigo: vi.fn(), apagarArtigo: vi.fn() }));
vi.mock("@/services/estudio", () => estudio);

const conteudos = vi.hoisted(() => ({
  prepararDivulgacao: vi.fn(), guardarStory: vi.fn(),
  obterConteudo: vi.fn(), guardarCarrossel: vi.fn(), aceitarFonte: vi.fn(), enviarParaEstudioSocial: vi.fn(),
  gerarNovaProposta: vi.fn(), retomarJob: vi.fn(), validarCarrossel: vi.fn(), legendaComLink: vi.fn(),
  ESTADOS_JOB: {}, LIMITES: { titulo: 80, texto: 400, legenda: 2200 },
}));
vi.mock("@/services/conteudos", () => conteudos);
vi.mock("@/features/conteudos/exportar", () => ({
  desenharSlide: vi.fn(() => Promise.resolve()), exportarCarrossel: vi.fn(), gerarFicheiros: vi.fn(), descarregar: vi.fn(),
}));

import Artigos from "@/pages/Artigos";
import CarrosselCronica from "@/pages/CarrosselCronica";

const chaves = () => Object.keys(localStorage).filter((k) => k.startsWith("estudio:recuperacao"));
const ler = (k: string) => JSON.parse(localStorage.getItem(k)!).dados;

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

describe("Artigos — recuperação", () => {
  it("sair imediatamente (<300ms) depois de escrever conserva a cópia", async () => {
    estudio.listarArtigos.mockResolvedValue([]);
    const r = render(<MemoryRouter><Artigos /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "texto escrito" } });
    r.unmount();
    const [k] = chaves();
    expect(k).toBeDefined();
    expect(ler(k).corpo).toBe("texto escrito");
  });

  it("não permite trocar, apagar ou duplicar o rascunho enquanto o servidor confirma a gravação", async () => {
    const artigo = { id: "outro", titulo: "Outro artigo", resumo: "", corpo: "Texto de outro artigo", project_id: "p1", updated_at: new Date().toISOString() };
    estudio.listarArtigos.mockResolvedValue([artigo]);
    const g = deferred<Record<string, unknown>>();
    estudio.guardarArtigo.mockReturnValueOnce(g.promise);
    render(<MemoryRouter><Artigos /></MemoryRouter>);
    const outro = await screen.findByRole("button", { name: /Outro artigo.*Marca/ });
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Primeiro artigo" } });
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "Texto inicial" } });
    const guardar = screen.getByRole("button", { name: /Guardar rascunho/ });
    fireEvent.click(guardar);
    expect(screen.getByRole("button", { name: "Novo rascunho" })).toBeDisabled();
    expect(outro).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apagar Outro artigo" })).toBeDisabled();
    fireEvent.click(outro);
    fireEvent.click(screen.getByRole("button", { name: "Novo rascunho" }));
    fireEvent.submit(guardar.closest("form")!);
    expect(estudio.guardarArtigo).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Título")).toHaveValue("Primeiro artigo");
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "Texto posterior" } });
    await act(async () => { g.resolve({ ...artigo, id: "primeiro", titulo: "Primeiro artigo", corpo: "Texto inicial" }); });
    expect(screen.getByLabelText("Texto do artigo")).toHaveValue("Texto posterior");
    expect(screen.getByText("Alterações por guardar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo rascunho" })).toBeEnabled();
    expect(ler(chaves().find((k) => k.includes(":primeiro:"))!).corpo).toBe("Texto posterior");
  });

  it("a eliminação lenta bloqueia troca, edição e gravação até o servidor confirmar", async () => {
    const a = { id: "a", titulo: "Artigo A", resumo: "Resumo A", corpo: "Texto de A", project_id: "p1", updated_at: new Date().toISOString() };
    const b = { ...a, id: "b", titulo: "Artigo B", corpo: "Texto de B" };
    estudio.listarArtigos.mockResolvedValueOnce([a, b]).mockResolvedValue([b]);
    const d = deferred<void>();
    estudio.apagarArtigo.mockReturnValueOnce(d.promise);
    render(<MemoryRouter initialEntries={["/artigos?id=a"]}><Artigos /></MemoryRouter>);
    await screen.findByDisplayValue("Texto de A");
    fireEvent.click(screen.getByRole("button", { name: "Apagar Artigo A" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apagar" }));
    await waitFor(() => expect(estudio.apagarArtigo).toHaveBeenCalledWith("a"));
    const outro = screen.getByRole("button", { name: /Artigo B.*Marca/ });
    expect(outro).toBeDisabled();
    expect(screen.getByRole("button", { name: "Novo rascunho" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apagar Artigo B" })).toBeDisabled();
    expect(screen.getByLabelText("Texto do artigo")).toBeDisabled();
    expect(screen.getByLabelText("Título")).toBeDisabled();
    const guardar = screen.getByRole("button", { name: /Guardar rascunho/ });
    expect(guardar).toBeDisabled();
    fireEvent.click(outro); fireEvent.submit(guardar.closest("form")!);
    expect(estudio.guardarArtigo).not.toHaveBeenCalled();
    expect(estudio.apagarArtigo).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Texto do artigo")).toHaveValue("Texto de A");
    await act(async () => { d.resolve(); });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Apagar Artigo A" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Artigo B.*Marca/ }));
    expect(screen.getByLabelText("Texto do artigo")).toBeEnabled();
    expect(screen.getByLabelText("Texto do artigo")).toHaveValue("Texto de B");
  });

  it("uma falha de eliminação desbloqueia o artigo e conserva o texto que estava no editor", async () => {
    const a = { id: "a", titulo: "Artigo A", resumo: "", corpo: "Texto original", project_id: "p1", updated_at: new Date().toISOString() };
    estudio.listarArtigos.mockResolvedValue([a]);
    const d = deferred<void>(); estudio.apagarArtigo.mockReturnValueOnce(d.promise);
    render(<MemoryRouter initialEntries={["/artigos?id=a"]}><Artigos /></MemoryRouter>);
    await screen.findByDisplayValue("Texto original");
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "Texto alterado sem guardar" } });
    fireEvent.click(screen.getByRole("button", { name: "Apagar Artigo A" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Apagar" }));
    await act(async () => { d.reject(new Error("Não eliminado")); });
    expect(screen.getByLabelText("Texto do artigo")).toBeEnabled();
    expect(screen.getByLabelText("Texto do artigo")).toHaveValue("Texto alterado sem guardar");
    expect(screen.getByText("Alterações por guardar")).toBeInTheDocument();
    expect(ler(chaves().find((k) => k.includes(":a:"))!).corpo).toBe("Texto alterado sem guardar");
  });

  it("texto escrito durante a gravação fica com cópia e continua por guardar", async () => {
    estudio.listarArtigos.mockResolvedValue([]);
    const g = deferred<Record<string, unknown>>();
    estudio.guardarArtigo.mockReturnValue(g.promise);
    render(<MemoryRouter><Artigos /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "T" } });
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "a" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar rascunho/ }));
    fireEvent.change(screen.getByLabelText("Texto do artigo"), { target: { value: "a mais" } });
    await act(async () => { g.resolve({ id: "a1", titulo: "T", resumo: "", corpo: "a", project_id: "p1", updated_at: new Date().toISOString() }); });
    expect((screen.getByLabelText("Texto do artigo") as HTMLTextAreaElement).value).toBe("a mais");
    expect(screen.getByText("Alterações por guardar")).toBeTruthy();
    const k = chaves().find((x) => x.includes(":a1:"));
    expect(k && ler(k).corpo).toBe("a mais");
  });
});

const fonte = { origem: "envio", numero: 7, titulo: "Crónica", url: "https://x", paragrafos: ["p1"] };
const conteudo = (versao: number, texto: string) => ({
  conteudo: { id: "c1", versao, fonte, fonte_aceite_em: null, social_draft_id: null, carrossel: { legenda: "L", slides: [{ titulo: "T", texto, fontes: [] }] } },
  job: null, versoes: [],
});
const renderCarrossel = (id = "c1") => render(
  <MemoryRouter initialEntries={[`/c/${id}`]}><Routes><Route path="/c/:id" element={<CarrosselCronica />} /></Routes></MemoryRouter>,
);

describe("Carrossel — gravação e refetch", () => {
  it("texto escrito durante o refetch da gravação não é substituído e mantém cópia", async () => {
    const refetch = deferred<ReturnType<typeof conteudo>>();
    conteudos.obterConteudo.mockResolvedValueOnce(conteudo(1, "original")).mockReturnValueOnce(refetch.promise);
    conteudos.guardarCarrossel.mockResolvedValue(undefined);
    renderCarrossel();
    const texto = await screen.findByLabelText(/^Texto/);
    fireEvent.change(texto, { target: { value: "editado" } });
    fireEvent.click(screen.getByRole("button", { name: /^Guardar$/ }));
    await waitFor(() => expect(conteudos.obterConteudo).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText(/^Texto/), { target: { value: "editado depois" } });
    await act(async () => { refetch.resolve(conteudo(2, "editado")); });
    expect((screen.getByLabelText(/^Texto/) as HTMLTextAreaElement).value).toBe("editado depois");
    expect(screen.getByText("Alterações por guardar")).toBeTruthy();
    const [k] = chaves();
    expect(ler(k).slides[0].texto).toBe("editado depois");
  });

  it("sem escrita posterior adota a cópia do servidor e limpa a recuperação", async () => {
    conteudos.obterConteudo.mockResolvedValueOnce(conteudo(1, "original")).mockResolvedValueOnce(conteudo(2, "editado"));
    conteudos.guardarCarrossel.mockResolvedValue(undefined);
    renderCarrossel();
    fireEvent.change(await screen.findByLabelText(/^Texto/), { target: { value: "editado" } });
    fireEvent.click(screen.getByRole("button", { name: /^Guardar$/ }));
    await waitFor(() => expect(screen.getByText("Guardado")).toBeTruthy());
    expect(chaves()).toHaveLength(0);
  });

  it("sair logo depois de escrever conserva a cópia", async () => {
    conteudos.obterConteudo.mockResolvedValueOnce(conteudo(1, "original"));
    const r = renderCarrossel();
    fireEvent.change(await screen.findByLabelText(/^Texto/), { target: { value: "rápido" } });
    r.unmount();
    expect(ler(chaves()[0]).slides[0].texto).toBe("rápido");
  });

  it("a primeira abertura não apaga a cópia local: oferece Restaurar e repõe o texto", async () => {
    const { chaveRecuperacao, guardarRecuperacao } = await import("@/lib/recuperacaoLocal");
    const copia = { legenda: "L", slides: [{ titulo: "T", texto: "texto local", fontes: [] }] };
    guardarRecuperacao(chaveRecuperacao("u1", "carrossel", "c1", null), copia);
    conteudos.obterConteudo.mockResolvedValueOnce(conteudo(1, "original"));
    renderCarrossel();
    const restaurar = await screen.findByRole("button", { name: "Restaurar" });
    expect(chaves()).toHaveLength(1);
    fireEvent.click(restaurar);
    expect((screen.getByLabelText(/^Texto/) as HTMLTextAreaElement).value).toBe("texto local");
  });

  it("resposta antiga é ignorada quando chega depois de uma mais recente", async () => {
    const lenta = deferred<ReturnType<typeof conteudo>>();
    conteudos.obterConteudo.mockReturnValueOnce(lenta.promise);
    const r = renderCarrossel("c1");
    conteudos.obterConteudo.mockResolvedValueOnce(conteudo(3, "da c2"));
    r.rerender(<MemoryRouter initialEntries={["/c/c2"]}><Routes><Route path="/c/:id" element={<CarrosselCronica key="c2" />} /></Routes></MemoryRouter>);
    expect(await screen.findByDisplayValue("da c2")).toBeTruthy();
    await act(async () => { lenta.resolve(conteudo(1, "da c1")); });
    expect(screen.queryByDisplayValue("da c1")).toBeNull();
  });
});
