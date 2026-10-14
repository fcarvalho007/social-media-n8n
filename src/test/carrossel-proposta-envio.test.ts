import { describe, expect, it } from "vitest";
import { estadoProposta, ESTADO_APOS_CONFIRMACAO } from "../../supabase/functions/_shared/conteudos/proposta";
import { legendaComLink, paragrafoDestaque, validarCarrossel, CURSO_IA_URL, type DestaqueFonte } from "../../supabase/functions/_shared/conteudos/carrossel";
import { destaquesDaEdicao } from "../../supabase/functions/_shared/conteudos/fonte.server";

const real = (estado: string) => ({ estado, tipo: "real" });
const teste = (estado: string) => ({ estado, tipo: "teste" });
const job = (estado: string, confirmado_em: string | null = null) => ({ estado, confirmado_em });

describe("proposta de carrossel após envio", () => {
  it("só o teste interno enviado (caso 319) não propõe nada", () => {
    expect(estadoProposta({ campanhas: [teste("enviada")], job: null, conteudo: null })).toBe("nenhuma");
  });
  it("envio real aceite mas não confirmado fica a aguardar a E-goi", () => {
    expect(estadoProposta({ campanhas: [real("aceite")], job: null, conteudo: null })).toBe("a_confirmar");
    expect(estadoProposta({ campanhas: [real("aceite")], job: job("aguarda_confirmacao"), conteudo: null })).toBe("a_confirmar");
  });
  it("falhas, rascunhos e rejeições de campanha não propõem", () => {
    expect(estadoProposta({ campanhas: [real("rascunho"), real("falhada")], job: null, conteudo: null })).toBe("nenhuma");
  });
  it("confirmação «sent» passa a aguardar o clique humano, sem gerar sozinho", () => {
    expect(ESTADO_APOS_CONFIRMACAO).toBe("aguarda_criacao");
    const conteudo = { tem_carrossel: false, adiado_em: null };
    expect(estadoProposta({ campanhas: [real("enviada")], job: job("aguarda_criacao", "2026-10-15T09:00:00Z"), conteudo })).toBe("pronta_criar");
  });
  it("«Mais tarde» persiste como adiada", () => {
    const conteudo = { tem_carrossel: false, adiado_em: "2026-10-15T10:00:00Z" };
    expect(estadoProposta({ campanhas: [real("enviada")], job: job("aguarda_criacao", "x"), conteudo })).toBe("adiada");
  });
  it("com rascunho guardado oferece abrir, nunca criar de novo", () => {
    const conteudo = { tem_carrossel: true, adiado_em: null };
    expect(estadoProposta({ campanhas: [real("enviada")], job: job("concluido", "x"), conteudo })).toBe("rascunho");
    expect(estadoProposta({ campanhas: [real("enviada")], job: job("pendente", "x"), conteudo: { tem_carrossel: false, adiado_em: null } })).toBe("a_criar");
  });
});

const destaques: DestaqueFonte[] = [
  { titulo: "Península Ibérica", sintese: "Estudo aponta.", leitura: "A minha leitura literal.", fonteUrl: "https://tek.sapo.pt/x", publisher: "tek.sapo.pt", briefUrl: "https://hub/brief/a" },
  { titulo: "Wikipedia", sintese: "", leitura: "Outra.", fonteUrl: "https://www.searchenginejournal.com/y", publisher: "searchenginejournal.com" },
];

describe("fonte do carrossel a partir da versão enviada", () => {
  it("usa os 3 primeiros destaques da fotografia com leitura literal e Brief", () => {
    const ed = { destaques: [1, 2, 3, 4].map((n) => ({ titulo: `T${n}`, url: `https://www.fonte${n}.pt/a`, resumoFactual: `S${n}`, minhaLeitura: `  Leitura ${n} exata  `, brief: { url: `https://hub/brief/${n}` } })) };
    const r = destaquesDaEdicao(ed);
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ titulo: "T1", sintese: "S1", leitura: "  Leitura 1 exata  ", fonteUrl: "https://www.fonte1.pt/a", publisher: "fonte1.pt", briefUrl: "https://hub/brief/1" });
  });
  it("parágrafo do destaque transporta a leitura entre «» sem alteração", () => {
    expect(paragrafoDestaque(destaques[0], 0)).toContain("«A minha leitura literal.»");
    expect(paragrafoDestaque(destaques[0], 0)).toContain("Fonte: tek.sapo.pt");
  });
  it("legenda atribui as fontes, liga à edição e ao curso", () => {
    const slides = Array.from({ length: 6 }, (_, i) => ({ titulo: `S${i}`, texto: "t", fontes: i === 0 || i === 5 ? [] : [1] }));
    const c = validarCarrossel({ slides, legenda: "Texto." }, { paragrafos: ["p"] });
    const l = legendaComLink(c, { url: "https://fredericocarvalho.pt/c/", destaques, edicaoUrl: "https://hub/edicoes/320", cursoUrl: CURSO_IA_URL });
    expect(l).toContain("Ler a crónica: https://fredericocarvalho.pt/c/");
    expect(l).toContain("Edição completa: https://hub/edicoes/320");
    expect(l).toContain("Fontes dos destaques: tek.sapo.pt, searchenginejournal.com");
    expect(l).toContain(`Curso de inteligência artificial: ${CURSO_IA_URL}`);
  });
});
