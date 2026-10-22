import { describe, expect, it } from "vitest";
import { diferencasNarrativa, sincronizarComNarrativa } from "../../supabase/functions/_shared/motor/enriquecer";
import type { PacoteProva, Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const pg = (id: string, slide: string, img = false): Pagina => ({ id, slide, fundo: "#16181d", camadas: [
  { id: `t-${id}`, tipo: "texto", x: 96, y: 300, w: 888, h: 200, z: 1, ref: `${slide}.titulo`, estilo: { peso: 700, tam: 60, linha: 1.1, alinh: "esq", cor: "#fff" } } as never,
  { id: `x-${id}`, tipo: "texto", x: 96, y: 520, w: 888, h: 300, z: 1, ref: `${slide}.texto`, estilo: { peso: 400, tam: 40, linha: 1.3, alinh: "esq", cor: "#fff" } } as never,
  ...(img ? [{ id: `i-${id}`, tipo: "imagem", x: 0, y: 0, w: 10, h: 10, z: 0, asset_id: "a" } as never] : []),
] });
// Mirrors the real case: narrative s1..s6, pages miss s3/s4 and keep an orphan.
const pacote = (): PacoteProva => {
  const doc = (v: "A" | "B") => ({ v: 1, variante: v, largura: 1080, altura: 1350, fonte: "x", paginas: [pg(`${v}1`, "s1"), pg(`${v}2`, "s2", true), pg(`${v}x`, "orfa"), pg(`${v}5`, "s5"), pg(`${v}6`, "s6")] });
  return { v: 1, id: "p", nome: "x", sintetico: false, assets: {},
    conteudo: { slides: ["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => ({ id, titulo: `T ${id}`, texto: `Texto ${id}` })) },
    variantes: { A: doc("A"), B: doc("B") } } as unknown as PacoteProva;
};
const sids = (p: PacoteProva, v: "A" | "B") => p.variantes[v].paginas.map((x) => x.slide);

describe("acertar Composição com a Narrativa", () => {
  it("deteta slides sem página e páginas órfãs", () => {
    expect(diferencasNarrativa(pacote())).toEqual({ semPagina: ["s3", "s4"], orfas: 1 });
  });
  it("cria as páginas em falta, retira órfãs e segue a ordem da Narrativa em A e B", () => {
    const r = sincronizarComNarrativa(pacote(), {}, "#3E5B46");
    expect(sids(r, "A")).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(sids(r, "B")).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(diferencasNarrativa(r)).toEqual({ semPagina: [], orfas: 0 });
  });
  it("as páginas novas apontam para o seu próprio texto e não herdam imagens", () => {
    const r = sincronizarComNarrativa(pacote(), {}, "#3E5B46");
    const p3 = r.variantes.A.paginas[2]!;
    const refs = p3.camadas.filter((c) => c.tipo === "texto").map((c) => (c as { ref?: string }).ref);
    expect(refs).toEqual(["s3.titulo", "s3.texto"]);
    expect(p3.camadas.some((c) => c.tipo === "imagem")).toBe(false);
  });
  it("aplicar duas vezes não duplica barra de progresso nem setas", () => {
    const uma = sincronizarComNarrativa(pacote(), {}, "#3E5B46");
    const duas = sincronizarComNarrativa(uma, {}, "#3E5B46");
    const conta = (p: PacoteProva) => p.variantes.A.paginas.map((x) => x.camadas.filter((c) => c.id.startsWith("mod-progresso") || c.id === "mod-seta").length);
    expect(conta(duas)).toEqual(conta(uma));
    expect(conta(uma).at(-1)).toBe(2); // last page: progress only, no swipe arrow
  });
});
