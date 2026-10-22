import { describe, expect, it } from "vitest";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";
import { avisosCarga, iconeSlide, ZONA_SEGURA } from "../../supabase/functions/_shared/motor/enriquecer";

const FONTE = [
  "Um guia sintético sobre hábitos de leitura em equipas pequenas.",
  "Em 2024, 37% das equipas inquiridas liam menos de um artigo por semana.",
  "Leitura partilhada significa escolher um texto curto e discuti-lo em conjunto.",
  "Por exemplo, uma equipa de cinco pessoas reservou vinte minutos à sexta-feira.",
  "Comece por um texto, marque uma hora e registe uma ideia por pessoa.",
].join("\n\n");

function docs() {
  const f = normalizarFonte(FONTE);
  const p = estruturarSemIa(f, { slides: 6 }, { titulo: null, url: null }, marcaDoProjeto(null));
  return { p, d: comporDocumentos(p, f.paragrafos) };
}

describe("critério visual na primeira composição", () => {
  it("capa: texto dentro do quadrado central da grelha e título Black", () => {
    const capa = docs().d.A.paginas[0];
    for (const c of capa.camadas) if (c.tipo === "texto" && c.id !== "num") {
      expect(c.y).toBeGreaterThanOrEqual(ZONA_SEGURA.gradeTopo);
      expect(c.y + c.h).toBeLessThanOrEqual(ZONA_SEGURA.gradeBase);
    }
    const t = capa.camadas.find((c) => c.tipo === "texto" && c.ref?.endsWith(".titulo"));
    expect(t?.tipo === "texto" && t.estilo.peso).toBe(900);
  });
  it("slides intermédios ganham ícone, progresso e seta; o último não tem seta", () => {
    const pgs = docs().d.A.paginas;
    expect(pgs[1].camadas.some((c) => c.id === "mod-icone")).toBe(true);
    expect(pgs.every((p) => p.camadas.some((c) => c.id === "mod-progresso"))).toBe(true);
    expect(pgs[pgs.length - 1].camadas.some((c) => c.id === "mod-seta")).toBe(false);
  });
  it("o texto aprovado e a ordem não mudam", () => {
    const { p, d } = docs();
    expect(d.A.paginas.map((x) => x.slide)).toEqual(p.slides.map((s) => s.id));
  });
  it("slide com número usa ícone de gráfico", () => {
    expect(iconeSlide({ id: "s3", papel: "desenvolvimento", titulo: "x", texto: "Subiu 37%" }, 2, 6)).toBe("grafico");
  });
  it("aviso de carga: mais de 4 pontos ou texto longo", () => {
    expect(avisosCarga([{ id: "s2", papel: "desenvolvimento", titulo: "x", texto: "- a\n- b\n- c\n- d\n- e" }])).toHaveLength(1);
    expect(avisosCarga([{ id: "s2", papel: "desenvolvimento", titulo: "x", texto: "curto" }])).toHaveLength(0);
  });
});

import { dividirTextoSlide } from "../../supabase/functions/_shared/motor/enriquecer";
describe("dividir slide e segundo gancho", () => {
  it("divide pelo parágrafo mais próximo do meio sem perder texto", () => {
    const t = "Primeira ideia com algum desenvolvimento aqui.\n\nSegunda ideia também desenvolvida.\n\nTerceira ideia final para fechar.";
    const r = dividirTextoSlide(t)!;
    expect(r).not.toBeNull();
    expect(`${r[0]} ${r[1]}`.replace(/\s+/g, " ")).toBe(t.replace(/\s+/g, " "));
  });
  it("texto curto não é dividido", () => { expect(dividirTextoSlide("Curto.")).toBeNull(); });
  it("slide 2 recebe faixa de segundo gancho", () => {
    const f = normalizarFonte(FONTE);
    const p = estruturarSemIa(f, { slides: 6 }, { titulo: null, url: null }, marcaDoProjeto(null));
    const pg = comporDocumentos(p, f.paragrafos).A.paginas[1];
    expect(pg.camadas.some((c) => c.id === "mod-gancho-faixa")).toBe(true);
  });
});
