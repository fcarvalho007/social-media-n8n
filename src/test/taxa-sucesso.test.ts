import { describe, expect, it } from "vitest";
import { taxaSucesso } from "@/lib/publicacao/taxaSucesso";
import { estadoPublicacao } from "@/features/motor/publicacao";

describe("taxa de sucesso", () => {
  it("1 de 2 publicações confirmadas dá 50%", () => {
    const t = taxaSucesso([
      { selected_networks: ["instagram"], external_post_ids: { instagram: "x" }, status: "published" },
      { selected_networks: ["instagram"], external_post_ids: null, status: "failed" },
    ]);
    expect(t).toMatchObject({ sucesso: 1, total: 2, pct: 50 });
  });
  it("agendados não contam", () => {
    expect(taxaSucesso([{ selected_networks: ["linkedin"], external_post_ids: null, status: "scheduled" }]).total).toBe(0);
  });
  it("carrossel do compositor publicado sem rascunho continua publicado", () => {
    const e = estadoPublicacao({
      trabalho: { id: "t", estado: "concluido" as never },
      docs: [{ id: "d", variante: "A", versao_actual: 584, aprovada_versao: 584 }],
      ligacoes: [], drafts: [],
      posts: [{ id: "p", status: "published", selected_networks: ["instagram", "linkedin"], external_post_ids: { instagram: "a", linkedin: "b" },
        scheduled_date: null, redesFalhadas: [], motor: { trabalho_id: "t", documento_id: "d", variante: "A", versao: 584, redes: ["instagram", "linkedin"] } }],
    });
    expect(e.estado).toBe("publicado");
  });
});
