import { describe, expect, it } from "vitest";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";
import { aplicarCapa, propostasCapa } from "../../supabase/functions/_shared/motor/capas";
import { ZONA_SEGURA } from "../../supabase/functions/_shared/motor/enriquecer";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const FONTE = [
  "Em 2024, 37% das equipas liam menos de um artigo por semana.",
  "Leitura partilhada significa escolher um texto curto e discuti-lo.",
  "Uma equipa de cinco pessoas reservou vinte minutos à sexta-feira.",
  "Comece por um texto e registe uma ideia por pessoa.",
].join("\n\n");

function pacote(): PacoteProva {
  const f = normalizarFonte(FONTE);
  const p = estruturarSemIa(f, { slides: 5 }, { titulo: null, url: null }, marcaDoProjeto(null));
  return { v: 1, id: "t", nome: "t", sintetico: true, conteudo: { slides: p.slides }, assets: {}, variantes: comporDocumentos(p, f.paragrafos) };
}

describe("três propostas de capa", () => {
  it("são três estratégias com geometria e fundo distintos", () => {
    const o = propostasCapa(pacote(), "A", "#3e5b46");
    expect(o.map((x) => x.id)).toEqual(["manifesto", "dado", "foto"]);
    const assinaturas = o.map((x) => x.pagina.fundo + x.pagina.camadas.map((c) => `${c.id}@${c.x},${c.y}`).join("|"));
    expect(new Set(assinaturas).size).toBe(3);
  });
  it("texto aprovado dentro do quadrado seguro da grelha", () => {
    for (const o of propostasCapa(pacote(), "A", "#3e5b46")) {
      if (!o.cabe) continue;
      for (const c of o.pagina.camadas) if (c.tipo === "texto" && c.ref) {
        expect(c.y).toBeGreaterThanOrEqual(ZONA_SEGURA.gradeTopo);
        expect(c.y + c.h).toBeLessThanOrEqual(ZONA_SEGURA.gradeBase);
      }
    }
  });
  it("aplicar a capa só muda a página 1 da variante e mantém o texto", () => {
    const pac = pacote();
    const o = propostasCapa(pac, "A", "#3e5b46")[1];
    const r = aplicarCapa(pac, "A", o);
    expect(r.variantes.A.paginas[0]).toBe(o.pagina);
    expect(r.variantes.B).toBe(pac.variantes.B);
    expect(r.conteudo).toBe(pac.conteudo);
    expect(r.variantes.A.paginas.map((p) => p.slide)).toEqual(pac.variantes.A.paginas.map((p) => p.slide));
  });
  it("sem imagem, a capa fotográfica assinala «Imagem por escolher»", () => {
    const foto = propostasCapa(pacote(), "A", "#3e5b46")[2];
    expect(foto.aviso).toMatch(/Imagem por escolher/);
  });
});
