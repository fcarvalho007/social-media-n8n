import { describe, expect, it } from "vitest";
import { caminhoFicheiro, classificarFalha, linhaRascunho, nomePagina, pacoteParaExportar } from "../../supabase/functions/_shared/motor/exportacao";
import { comporDocumentos, estruturarSemIa, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";

const P = "11111111-1111-4111-8111-111111111111";
const D = "22222222-2222-4222-8222-222222222222";
const H = "a".repeat(64);

describe("R6 exportação", () => {
  it("caminhos versionados e endereçados por conteúdo, sem travessia", () => {
    expect(caminhoFicheiro(P, D, 3, "slide-01.png", H)).toBe(`motor/${P}/${D}/v3/slide-01-${"a".repeat(16)}.png`);
    expect(caminhoFicheiro(P, D, 4, "slide-01.png", H)).not.toBe(caminhoFicheiro(P, D, 3, "slide-01.png", H));
    expect(() => caminhoFicheiro(P, D, 1, "../x.png", H)).toThrow();
    expect(() => caminhoFicheiro("../../x", D, 1, "a.png", H)).toThrow();
    expect(() => caminhoFicheiro(P, D, 0, "a.png", H)).toThrow();
    expect(nomePagina(9)).toBe("slide-10.png");
  });
  it("classifica falhas", () => {
    expect(classificarFalha(new RangeError("Array buffer allocation failed")).classe).toBe("memoria");
    expect(classificarFalha(Object.assign(new Error("x"), { name: "TimeoutError" })).classe).toBe("tempo");
    expect(classificarFalha(new Error("storage: upload falhou")).classe).toBe("armazenamento");
    const d = classificarFalha(new Error("página 1, camada 2: recurso desconhecido inválido."));
    expect(d.classe).toBe("documento");
    expect(d.definitiva).toBe(true);
    expect(classificarFalha(new Error("??")).definitiva).toBe(false);
  });
  it("pacote real de uma variante; recusa imagens externas/assets", () => {
    const fonte = normalizarFonte("Uma pequena equipa prepara a newsletter semanal.\n\nRevê as fontes antes de escrever.\n\nAprova antes de publicar.");
    const prop = estruturarSemIa(fonte, { slides: 3, objetivo: "", tom: "", titulo: "R6" } as never, { titulo: null, url: null }, { cor: "#123456", origem: "neutra" });
    const docs = comporDocumentos(prop);
    const pac = pacoteParaExportar(D, prop as never, "B", docs.B);
    expect(pac.sintetico).toBe(false);
    expect(pac.variantes.B.paginas.length).toBe(docs.B.paginas.length);
    const mau = structuredClone(docs.A);
    mau.paginas[0].camadas.push({ id: "img", tipo: "imagem", asset_id: "http://interno/x", x: 0, y: 0, w: 10, h: 10, z: 99 } as never);
    expect(() => pacoteParaExportar(D, prop as never, "A", mau)).toThrow();
  });
  it("rascunho segue o contrato atual, sem publicar", () => {
    const l = linhaRascunho({ id: D, userId: P, projectId: P, proposta: { legenda: "L", alt: ["a"], slides: [], titulo: "t" } as never, pngs: ["u1", "u2"], pdf: "p",
      trabalhoId: P, documentoId: D, variante: "A", versao: 2, propostaVersao: 5 });
    expect(l.status).toBe("draft");
    expect(l.publish_immediately).toBe(false);
    expect(l.formats).toEqual(["instagram_carousel", "linkedin_document"]);
    expect(l.origem).toMatchObject({ tipo: "carrossel_motor", versao: 2, proposta_versao: 5, pdf_url: "p" });
    expect(l.media_items[1].name).toBe("slide-02.png");
  });
});
