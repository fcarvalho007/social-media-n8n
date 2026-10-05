import { describe, expect, it } from "vitest";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte, type PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { sugerirRitmo } from "@/features/motor/variacoes";
import { aplicarResultado, calcularGravacao, type Gravado } from "@/features/motor/gravacao";

const FONTE = [
  "Um guia sintético de demonstração sobre hábitos de leitura em equipas pequenas.",
  "Em 2024, 37% das equipas inquiridas liam menos de um artigo por semana.",
  "Leitura partilhada significa escolher um texto curto e discuti-lo em conjunto.",
  "Por um lado há pouco tempo; por outro lado há vontade de aprender.",
  "Por exemplo, uma equipa de cinco pessoas reservou vinte minutos à sexta-feira.",
  "Comece por um texto, marque uma hora e registe uma ideia por pessoa.",
].join("\n\n");

function base() {
  const f = normalizarFonte(FONTE);
  const p = estruturarSemIa(f, { slides: 6 }, { titulo: null, url: null }, marcaDoProjeto(null));
  const pac: PacoteProva = { v: 1, id: "t", nome: "t", sintetico: true, conteudo: { slides: p.slides }, assets: {}, variantes: comporDocumentos(p) };
  const g: Gravado = { propostaVersao: 1, conteudo: p as unknown as PropostaEditorial, docs: { A: { versao: 4, documento: pac.variantes.A }, B: { versao: 7, documento: pac.variantes.B } } };
  return { pac, slides: p.slides, paragrafos: f.paragrafos, g, extras: { legenda: p.legenda, alt: p.alt } };
}

describe("ritmo visual só na variante ativa", () => {
  for (const [ativa, outra] of [["A", "B"], ["B", "A"]] as const) {
    it(`${ativa} muda, ${outra} fica intacta; grava só ${ativa} com a versão esperada`, () => {
      const { pac, slides, paragrafos, g, extras } = base();
      const r = sugerirRitmo(pac, slides, paragrafos, undefined, ativa);
      expect(r.variante).toBe(ativa);
      expect(r.pacote.variantes[outra]).toBe(pac.variantes[outra]);
      expect(r.plano.some((x) => x.muda)).toBe(true);
      expect(r.pacote.conteudo).toBe(pac.conteudo);
      expect(r.pacote.variantes[ativa].paginas.map((p) => p.id)).toEqual(pac.variantes[ativa].paginas.map((p) => p.id));
      r.plano.filter((x) => !x.muda).forEach((x) => expect(r.pacote.variantes[ativa].paginas[x.pagina]).toBe(pac.variantes[ativa].paginas[x.pagina]));
      const ped = calcularGravacao(g, r.pacote, extras)!;
      expect(ped.conteudo).toBeNull();
      expect(Object.keys(ped.documentos)).toEqual([ativa]);
      expect(ped.documentos[ativa]!.versao_esperada).toBe(g.docs[ativa].versao);
      // Revert: the previous package re-sent against the new version, the other variant still untouched.
      const g2 = aplicarResultado(g, ped, { proposta_versao: 1, documentos: { [ativa]: g.docs[ativa].versao + 1 } });
      const rev = calcularGravacao(g2, pac, extras)!;
      expect(Object.keys(rev.documentos)).toEqual([ativa]);
      expect(rev.documentos[ativa]!.versao_esperada).toBe(g.docs[ativa].versao + 1);
      expect(rev.documentos[ativa]!.documento).toBe(pac.variantes[ativa]);
    });
  }
  it("página com imagem existente fica igual e é marcada como tal", () => {
    const { pac, slides, paragrafos } = base();
    const pg = pac.variantes.B.paginas[2];
    const comImg = { ...pg, camadas: [...pg.camadas, { id: "img", nome: "img", tipo: "imagem", asset_id: "a1", x: 0, y: 0, w: 100, h: 100, z: 0 }] } as typeof pg;
    const p2: PacoteProva = { ...pac, variantes: { ...pac.variantes, B: { ...pac.variantes.B, paginas: pac.variantes.B.paginas.map((p, i) => (i === 2 ? comImg : p)) } } };
    const r = sugerirRitmo(p2, slides, paragrafos, undefined, "B");
    expect(r.pacote.variantes.B.paginas[2]).toBe(comImg);
    expect(r.plano[2]).toMatchObject({ muda: false, comImagem: true });
  });
});
