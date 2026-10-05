import { describe, it, expect } from "vitest";
import { normalizarFonte, type PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";
import { factosUsados, propostaComSlide, respostaDemoSlide, validarRespostaSlide, type RegenBrief } from "../../supabase/functions/_shared/motor/regenerar";
import { fundirSelecao } from "@/features/motor/estruturas";

const fonte = normalizarFonte("Parágrafo um com 12 lojas.\n\nParágrafo dois: 60% online.\n\nParágrafo três sobre equipa.\n\nParágrafo quatro sobre seis meses.");
const base: PropostaEditorial = {
  v: 1, metodo: "ia", demonstracao: false, titulo: "Capa", objetivo: "o", tom: "t", legenda: "Legenda atual",
  slides: [
    { id: "s1", papel: "capa", titulo: "Capa", texto: "", fontes: [1] },
    { id: "s2", papel: "desenvolvimento", titulo: "Dois", texto: "60% online", fontes: [2] },
    { id: "s3", papel: "desenvolvimento", titulo: "Três", texto: "equipa", fontes: [3] },
    { id: "s4", papel: "fecho", titulo: "Fecho", texto: "", fontes: [] },
  ],
  alt: ["a1", "a2", "a3", "a4"], citacao: { titulo: null, url: null }, marca: { cor: "#334155", origem: "neutra" },
};
const rb = (modo: RegenBrief["modo"], indice = 1, b = base): RegenBrief => ({ slide_id: b.slides[indice].id, indice, modo, nota: "", base: b });
const resp = (o: unknown) => JSON.stringify(o);

describe("regenerar um slide", () => {
  it("«Outro facto» exige § novo, mantém papel e recusa números fora dos § citados", () => {
    expect(() => validarRespostaSlide(resp({ slide: { titulo: "x", texto: "y", fontes: [2] }, alt: "a" }), fonte, rb("facto"))).toThrow(/§ que o slide ainda não cita/);
    expect(() => validarRespostaSlide(resp({ slide: { titulo: "99 lojas", texto: "", fontes: [4] }, alt: "a" }), fonte, rb("facto"))).toThrow(/99/);
    expect(() => validarRespostaSlide(resp({ slide: { titulo: "x", texto: "", fontes: [9] }, alt: "a" }), fonte, rb("facto"))).toThrow(/não existe/);
    const r = validarRespostaSlide(resp({ slide: { papel: "capa", titulo: "Seis meses", texto: "", fontes: [4] }, alt: "alt novo" }), fonte, rb("facto"));
    expect(r.tipo).toBe("slide"); if (r.tipo !== "slide") return;
    expect(r.slide.papel).toBe("desenvolvimento");
  });
  it("«sem alternativa» só é aceite para «Outro facto»", () => {
    expect(validarRespostaSlide(resp({ sem_alternativa: true, motivo: "esgotado" }), fonte, rb("facto")).tipo).toBe("sem_alternativa");
    expect(() => validarRespostaSlide(resp({ sem_alternativa: true }), fonte, rb("claro"))).toThrow();
  });
  it("só o slide alvo muda: ids, outros slides, legenda e alt dos outros preservados; marca âmbito", () => {
    const r = validarRespostaSlide(resp({ slide: { titulo: "Seis meses", texto: "t", fontes: [4] }, alt: "alt novo" }), fonte, rb("facto"));
    if (r.tipo !== "slide") throw new Error();
    const p = propostaComSlide(rb("facto"), r, "ia");
    expect(p.escopo_slide).toBe("s2");
    expect(p.slides.map((s) => s.id)).toEqual(["s1", "s2", "s3", "s4"]);
    expect(p.slides[1]).toMatchObject({ id: "s2", papel: "desenvolvimento", titulo: "Seis meses", fontes: [4] });
    expect([p.slides[0], p.slides[2], p.slides[3]]).toEqual([base.slides[0], base.slides[2], base.slides[3]]);
    expect(p.alt).toEqual(["a1", "alt novo", "a3", "a4"]);
    expect(p.legenda).toBe("Legenda atual");
    expect(base.slides[1].titulo).toBe("Dois");
  });
  it("simulador usa um § livre da mesma fonte e explica quando não há alternativa factual", () => {
    expect(factosUsados(base, 1)).toEqual([1, 3]);
    const r = validarRespostaSlide(respostaDemoSlide(fonte, rb("facto")), fonte, rb("facto"));
    expect(r.tipo === "slide" && r.slide.fontes).toEqual([4]);
    const cheia = { ...base, slides: base.slides.map((s, i) => (i === 3 ? { ...s, papel: "desenvolvimento" as const, fontes: [4] } : s)) };
    expect(validarRespostaSlide(respostaDemoSlide(fonte, rb("facto", 1, cheia)), fonte, rb("facto", 1, cheia)).tipo).toBe("sem_alternativa");
  });
  it("alternativa de um slide só entra nesse slide e não perde escolhas híbridas dos outros", () => {
    const r = validarRespostaSlide(resp({ slide: { titulo: "Seis meses", texto: "t", fontes: [4] }, alt: "alt novo" }), fonte, rb("facto"));
    if (r.tipo !== "slide") throw new Error();
    const alt = { trabalho: "j-regen", framework: "slide:facto", conteudo: propostaComSlide(rb("facto"), r, "ia"), escopo: "s2" };
    const pas = { trabalho: "j-pas", framework: "pas", conteudo: { ...base, slides: base.slides.map((s) => ({ ...s, titulo: `PAS ${s.titulo}` })) } };
    const ok = fundirSelecao(base, [alt, pas], ["j-pas", "j-regen", null, null]);
    expect(ok.ok).toBe(true); if (!ok.ok) return;
    expect(ok.conteudo.slides.map((s) => s.titulo)).toEqual(["PAS Capa", "Seis meses", "Três", "Fecho"]);
    expect(ok.conteudo.origem_slides?.s2).toEqual({ framework: "slide:facto", trabalho: "j-regen" });
    expect(ok.conteudo.escopo_slide).toBeUndefined();
    expect(() => fundirSelecao(base, [alt], [null, null, "j-regen", null])).toThrow(/só para outro slide/);
    expect(() => fundirSelecao(base, [alt], ["j-regen", "j-regen", "j-regen", "j-regen"])).toThrow();
  });
});
