import { describe, expect, it } from "vitest";
import { INTENCOES, linhasBriefing, normalizarBriefing } from "../../supabase/functions/_shared/motor/briefing";
import { promptSistema, promptUtilizador, REGRAS_ESTRUTURA } from "../../supabase/functions/_shared/motor/gateway.server";
import { promptSistemaSlide } from "../../supabase/functions/_shared/motor/regenerar";
import { regrasFramework, obterFramework } from "../../supabase/functions/_shared/motor/frameworks";
import { consultarLeitura, LIMITES_LEITURA } from "../../supabase/functions/_shared/motor/leitura";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { slideQuebra, sugerirRitmo } from "@/features/motor/variacoes";

describe("intenção editorial", () => {
  it("tem cinco escolhas e normaliza valores desconhecidos para null", () => {
    expect(INTENCOES.map((i) => i.nome)).toEqual(["Crónica crítica", "Guia prático", "Leitura de dados", "Antes/depois", "Apresentar solução"]);
    expect(normalizarBriefing({ intencao: "xpto" }).intencao).toBeNull();
    expect(normalizarBriefing({ intencao: "dados" }).intencao).toBe("dados");
    expect(normalizarBriefing(null).intencao).toBeNull();
  });
  it("entra no prompt do utilizador e nunca autoriza provas inventadas", () => {
    const l = linhasBriefing(normalizarBriefing({ intencao: "solucao", cta: "guardar" }));
    expect(l[0]).toMatch(/^Intenção editorial: Apresentar solução/);
    expect(l[0]).toMatch(/sem urgência artificial, ROI, depoimentos/);
    const u = promptUtilizador(["a"], { slides: 3, briefing: { intencao: "antes_depois" } });
    expect(u).toMatch(/Antes\/depois: .*não o inventes/);
    for (const i of INTENCOES) expect(i.regra).not.toMatch(/\d+%/);
  });
  it("sem intenção não acrescenta linha (trabalhos antigos inalterados)", () => {
    expect(linhasBriefing(normalizarBriefing({ cta: "refletir" })).some((x) => x.startsWith("Intenção"))).toBe(false);
  });
});

describe("instruções de estrutura", () => {
  it("geração inclui capa, slide 2 autónomo, uma ideia, títulos informativos e fecho com uma ação", () => {
    const s = promptSistema(null, null);
    expect(s).toContain(REGRAS_ESTRUTURA);
    expect(REGRAS_ESTRUTURA).toMatch(/Slide 2: autónomo/);
    expect(REGRAS_ESTRUTURA).toMatch(/Uma ideia principal/);
    expect(REGRAS_ESTRUTURA).toMatch(/UMA ação/);
    expect(s).toMatch(/Usa apenas factos presentes na fonte/);
  });
  it("frameworks e slide individual mantêm as regras e o fecho deixa de contradizer o apelo", () => {
    expect(promptSistema("pas", null)).toContain(REGRAS_ESTRUTURA);
    expect(regrasFramework(obterFramework("pas")!)).toMatch(/no máximo uma ação, a do apelo final/);
    expect(promptSistemaSlide("claro", null)).toMatch(/Slide 2: autónomo/);
  });
});

describe("consultor de leitura", () => {
  const s = (papel: string, titulo: string, texto: string, id = Math.random().toString()) => ({ id, papel, titulo, texto });
  it("deteta densidade, várias ideias, lista longa, título longo e genérico", () => {
    const longo = Array.from({ length: LIMITES_LEITURA.palavrasSlide + 5 }, () => "palavra").join(" ");
    const c = consultarLeitura([
      s("capa", "Tese", ""),
      s("contexto", "Contexto", `${longo}.`),
      s("desenvolvimento", "Um título com muitas palavras que não acaba nunca e continua sem parar aqui mesmo agora", "Primeira frase longa aqui. Segunda frase longa aqui. Terceira frase longa aqui. Quarta frase longa aqui."),
      s("desenvolvimento", "Passos", "- a\n- b\n- c\n- d\n- e\n- f"),
      s("fecho", "Fecho", "Comenta e guarda este carrossel."),
    ]);
    const tipos = c.map((x) => `${x.slide}:${x.tipo}`);
    expect(tipos).toEqual(expect.arrayContaining(["1:denso", "1:titulo_generico", "2:titulo_longo", "2:varias_ideias", "3:lista_longa", "4:fecho_varias_acoes"]));
    expect(c.every((x) => x.acao.length > 0 && !/abandono|viral|score|pontua/i.test(x.problema + x.acao))).toBe(true);
  });
  it("slide 2 como continuação é assinalado; slides limpos não", () => {
    expect(consultarLeitura([s("capa", "A tese", ""), s("contexto", "Mas há outro lado", "Texto curto e claro.")]).map((x) => x.tipo)).toEqual(["slide2_continuacao"]);
    expect(consultarLeitura([s("capa", "A tese do autor", ""), s("contexto", "Porque isto importa agora", "Texto curto e claro.")])).toEqual([]);
  });
  it("não altera os slides recebidos", () => {
    const sl = [s("capa", "Contexto", "Mas"), s("contexto", "E depois", "x")];
    const antes = JSON.stringify(sl);
    consultarLeitura(sl);
    expect(JSON.stringify(sl)).toBe(antes);
  });
});

describe("ritmo visual com quebra a meio", () => {
  const FONTE = ["Um guia sintético de teste sobre leitura.", "Em 2024, 37% das equipas liam pouco.", "Leitura partilhada significa discutir um texto.", "Por exemplo, uma equipa reservou vinte minutos.", "Comece por um texto curto.", "Registe uma ideia por pessoa."].join("\n\n");
  const f = normalizarFonte(FONTE);
  const p = estruturarSemIa(f, { slides: 6 }, { titulo: null, url: null }, marcaDoProjeto(null));
  const pac: PacoteProva = { v: 1, id: "t", nome: "t", sintetico: true, conteudo: { slides: p.slides }, assets: {}, variantes: comporDocumentos(p) };
  it("escolhe um slide interior perto do meio", () => {
    const i = slideQuebra(p.slides)!;
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(p.slides.length - 1);
    expect(Math.abs(i - (p.slides.length - 1) / 2)).toBeLessThanOrEqual(1);
    expect(slideQuebra(p.slides.slice(0, 2))).toBeNull();
  });
  it("não muda texto, capa nem fecho e é determinística", () => {
    const a = sugerirRitmo(pac, p.slides, f.paragrafos), b = sugerirRitmo(pac, p.slides, f.paragrafos);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.pacote.conteudo).toBe(pac.conteudo);
    expect(a.pacote.variantes.A.paginas[0]).toBe(pac.variantes.A.paginas[0]);
    expect(a.pacote.variantes.A.paginas.at(-1)).toBe(pac.variantes.A.paginas.at(-1));
    if (a.quebra) expect(a.plano[a.quebra.pagina].muda).toBe(true);
  });
});
