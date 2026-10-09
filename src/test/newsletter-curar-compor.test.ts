import { describe, expect, it } from "vitest";
import { separarDestinos } from "@/newsletter/features/newsletter/revista/Atualidade";
import type { NoticiaAprovada } from "@/newsletter/features/newsletter/revista/data-revista";
import { modoRetirarNoticiaDaEdicao } from "@/newsletter/features/newsletter/data";

const noticia = (id: string, destino: string | null): NoticiaAprovada => ({
  id,
  titulo: `Notícia ${id}`,
  descricao: null,
  url: null,
  url_curto: null,
  categoria: "ia",
  ordem: 1,
  destino,
});

describe("Curar → Compor", () => {
  it("uma notícia aprovada com destino news fica por organizar", () => {
    const resultado = separarDestinos([noticia("aprovada", "news")], []);
    expect(resultado.porOrganizar.map((n) => n.id)).toEqual(["aprovada"]);
    expect(resultado.soSite).toEqual([]);
  });

  it("Só site é uma escolha explícita e não se confunde com por organizar", () => {
    const resultado = separarDestinos([noticia("site", "site")], []);
    expect(resultado.porOrganizar).toEqual([]);
    expect(resultado.soSite.map((n) => n.id)).toEqual(["site"]);
  });

  it("uma notícia já classificada não volta à fila", () => {
    const resultado = separarDestinos([noticia("radar", "news")], [{ noticia_id: "radar" }]);
    expect(resultado.porOrganizar).toEqual([]);
    expect(resultado.soSite).toEqual([]);
  });

  it("retirar uma cópia da edição apaga apenas essa cópia", () => {
    expect(modoRetirarNoticiaDaEdicao({ curadoria_origem_id: "origem" })).toBe("apagar_copia");
  });

  it("retirar a notícia original desassocia-a sem apagar a aprovação", () => {
    expect(modoRetirarNoticiaDaEdicao({ curadoria_origem_id: null })).toBe("desassociar_original");
  });
});