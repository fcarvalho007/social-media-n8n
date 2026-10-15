import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompositorDivulgacao } from "@/features/conteudos/CompositorDivulgacao";
import { guardarComposicao, type ConteudoCompleto } from "@/services/conteudos";
import { carrosselDivulgacao, prepararDivulgacaoBase } from "../../supabase/functions/_shared/conteudos/divulgacao";
import { fonteDivulgacao as fonte } from "@/dev/divulgacaoFixture";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/services/conteudos", () => ({ guardarComposicao: vi.fn() }));
vi.mock("@/features/conteudos/exportar", () => ({ exportarStory: vi.fn(), exportarCarrossel: vi.fn() }));
vi.mock("@/features/editor-grafico/EditorGrafico", () => ({ EditorGrafico: ({ pacoteInicial, onAlterado, direcaoPersonalizada }) => <button onClick={() => { const p = structuredClone(pacoteInicial); p.variantes.A.paginas[0].camadas[0].x = 120; onAlterado(p); }}>Mover camada · {direcaoPersonalizada}</button> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function dados(): ConteudoCompleto {
  return { conteudo: { id: "id", edicao_id: "id", fonte, fonte_aceite_em: null, carrossel: carrosselDivulgacao(fonte), versao: 1, divulgacao: prepararDivulgacaoBase(fonte, null), divulgacao_versao: 4, social_draft_id: null, actualizado_em: "" }, versoes: [], job: null };
}
describe("compositor de divulgação persistente", () => {
  it("só grava por ação explícita, com a versão de divulgação, sem reescrever a origem", async () => {
    const d = dados(), antes = JSON.stringify(d);
    vi.mocked(guardarComposicao).mockResolvedValue({ divulgacao: d.conteudo.divulgacao!, divulgacao_versao: 5 });
    render(<CompositorDivulgacao dados={d} peca="story" aoFechar={vi.fn()} />);
    expect(guardarComposicao).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Mover camada/ }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Guardar composição" })));
    expect(guardarComposicao).toHaveBeenCalledWith("id", 4, "story", expect.any(String), expect.objectContaining({ variantes: expect.objectContaining({ A: expect.objectContaining({ paginas: expect.arrayContaining([expect.objectContaining({ camadas: expect.arrayContaining([expect.objectContaining({ x: 120 })]) })]) }) }) }));
    expect(JSON.stringify(d)).toBe(antes);
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar composição" })).toBeDisabled());
  });
  it("um conflito mantém a composição no editor e permite repetir a gravação", async () => {
    vi.mocked(guardarComposicao).mockRejectedValue(new Error("Outro editor guardou uma versão mais recente."));
    render(<CompositorDivulgacao dados={dados()} peca="carrossel" aoFechar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Mover camada/ }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Guardar composição" })));
    expect(await screen.findByText(/A composição continua no editor/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar composição" })).toBeEnabled();
    const p = vi.mocked(guardarComposicao).mock.calls[0][4] as import("../../supabase/functions/_shared/documento-grafico/nucleo").PacoteProva;
    expect(p.variantes.A.paginas[0].camadas[0].x).toBe(120);
  });
});
