import { describe, expect, it } from "vitest";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";
import { composicoesPagina } from "../../supabase/functions/_shared/motor/composicoes";
import type { Camada, PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { estadoPublicacao, type PostResumo } from "@/features/motor/publicacao";
import { aplicarComposicaoSlide, slideDaPagina, sugerirRitmo } from "@/features/motor/variacoes";
import { acoesFalhaLink, dominioDe, resumoLeitura } from "@/features/motor/lerPagina";

const FONTE = [
  "Um guia sintético de demonstração sobre hábitos de leitura em equipas pequenas.",
  "Em 2024, 37% das equipas inquiridas liam menos de um artigo por semana.",
  "Leitura partilhada significa escolher um texto curto e discuti-lo em conjunto.",
  "Por um lado há pouco tempo; por outro lado há vontade de aprender.",
  "Por exemplo, uma equipa de cinco pessoas reservou vinte minutos à sexta-feira.",
  "Comece por um texto, marque uma hora e registe uma ideia por pessoa.",
].join("\n\n");

function pacote(): { pac: PacoteProva; slides: ReturnType<typeof estruturarSemIa>["slides"]; paragrafos: string[] } {
  const f = normalizarFonte(FONTE);
  const p = estruturarSemIa(f, { slides: 6 }, { titulo: null, url: null }, marcaDoProjeto(null));
  return { pac: { v: 1, id: "t", nome: "t", sintetico: true, conteudo: { slides: p.slides }, assets: {}, variantes: comporDocumentos(p) }, slides: p.slides, paragrafos: f.paragrafos };
}
const textos = (cs: Camada[]) => cs.filter((c) => c.tipo === "texto").map((c) => [c.id, c.tipo === "texto" ? c.ref : null]).sort();

describe("composições por slide", () => {
  it("5 composições distintas da mesma página mantêm texto (ids/ref) e não tocam no resto", () => {
    const { pac } = pacote();
    const pg = pac.variantes.A.paginas[2];
    const ops = composicoesPagina(pg, pac.conteudo);
    expect(ops.map((o) => o.id)).toEqual(["editorial", "tipografico", "paineis", "contraste", "assimetrica"]);
    expect(new Set(ops.map((o) => JSON.stringify(o.pagina.camadas))).size).toBe(5);
    for (const o of ops) expect(textos(o.pagina.camadas)).toEqual(textos(pg.camadas));
    const sid = slideDaPagina(pg)!;
    const r = aplicarComposicaoSlide(pac, sid, "contraste", ["A"]);
    expect(r.aplicadas).toEqual(["A"]);
    expect(r.pacote.variantes.B).toBe(pac.variantes.B);
    r.pacote.variantes.A.paginas.forEach((p, i) => i !== 2 && expect(p).toBe(pac.variantes.A.paginas[i]));
    expect(aplicarComposicaoSlide(pac, sid, "contraste", ["A", "B"]).aplicadas).toEqual(["A", "B"]);
  });
  it("sugerir ritmo mantém capa e fecho e é determinístico", () => {
    const { pac, slides, paragrafos } = pacote();
    const a = sugerirRitmo(pac, slides, paragrafos), b = sugerirRitmo(pac, slides, paragrafos);
    expect(JSON.stringify(a.pacote)).toBe(JSON.stringify(b.pacote));
    expect(a.pacote.variantes.A.paginas[0]).toBe(pac.variantes.A.paginas[0]);
    expect(a.pacote.variantes.A.paginas.at(-1)).toBe(pac.variantes.A.paginas.at(-1));
    expect(a.plano.some((x) => x.ritmo === "dado_chave")).toBe(true);
  });
});

describe("estado de publicação", () => {
  const t = { id: "t1", estado: "concluido" as const };
  const docs = [{ id: "d1", variante: "A" as const, versao_actual: 3, aprovada_versao: 3 }];
  const post = (p: Partial<PostResumo>): PostResumo => ({ id: "p", status: "published", selected_networks: ["instagram", "linkedin"], external_post_ids: null, scheduled_date: null, motor: { trabalho_id: "t1", variante: "A", versao: 3, redes: ["instagram", "linkedin"] }, redesFalhadas: [], ...p });
  const e = (posts: PostResumo[], extra = {}) => estadoPublicacao({ trabalho: t, docs, ligacoes: [], drafts: [], posts, agora: 0, ...extra });
  it("publicado só com referência externa em todas as redes da versão atual", () => {
    expect(e([post({ external_post_ids: { instagram: "1", linkedin: "2" } })]).grupo).toBe("publicados");
    expect(e([post({ external_post_ids: { instagram: "1" } })]).estado).toBe("parcial");
    expect(e([post({ status: "published", external_post_ids: null })]).grupo).toBe("por_publicar");
  });
  it("versão antiga publicada não conta; erro, agendado e por confirmar", () => {
    const antigo = e([post({ motor: { trabalho_id: "t1", variante: "A", versao: 2 }, external_post_ids: { instagram: "1" } })]);
    expect(antigo.grupo).toBe("por_publicar");
    expect(antigo.nota).toMatch(/Versão 2/);
    expect(e([post({ status: "failed" })]).estado).toBe("erro");
    expect(e([post({ status: "scheduled", scheduled_date: "2999-01-01" })]).estado).toBe("agendado");
    expect(e([], { ligacoes: [{ documento_id: "d1", documento_versao: 3, draft_id: null, draft_previsto: "x" }] }).estado).toBe("por_confirmar");
    expect(e([], { drafts: [{ id: "x", status: "draft", trabalho_id: "t1" }] }).estado).toBe("preparado");
    expect(e([]).estado).toBe("aprovado");
  });
});

describe("ler página", () => {
  it("só repete tempo/rede; domínio e resumo", () => {
    expect(acoesFalhaLink("tempo").repetir).toBe(true);
    expect(acoesFalhaLink("acesso").repetir).toBe(false);
    expect(dominioDe("https://www.exemplo.pt/a")).toBe("exemplo.pt");
    expect(dominioDe("javascript:alert(1)")).toBeNull();
    expect(resumoLeitura("a ".repeat(400), 20).previa.length).toBeLessThanOrEqual(21);
  });
});
