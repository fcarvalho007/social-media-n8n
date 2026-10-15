import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "opentype.js";
import { comporCarrossel, comporStory, repartirParaLeitura, assinaturaComposicao, validarComposicao } from "../../supabase/functions/_shared/conteudos/apresentacao";
import { carrosselDivulgacao, prepararDivulgacaoBase } from "../../supabase/functions/_shared/conteudos/divulgacao";
import { verificarLeiturasLiterais, TITULO_SUBSCRICAO, legendaComLink, URL_SUBSCRICAO } from "../../supabase/functions/_shared/conteudos/carrossel";
import { criarMedidor, layoutTexto, resolverTexto, type FonteOT, type PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { fonteDivulgacao as fonte } from "../dev/divulgacaoFixture";

const ler = (nome: string) => { const b = readFileSync(`public/fontes/${nome}.ttf`); return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) as unknown as FonteOT; };
const m = criarMedidor({ 400: ler("WorkSans-Regular"), 700: ler("WorkSans-Bold") }, {
  grotesk: { 400: ler("SpaceGrotesk-400"), 700: ler("SpaceGrotesk-700") },
  inter: { 400: ler("Inter-400"), 700: ler("Inter-700") },
});
const story = prepararDivulgacaoBase(fonte, null).story;
const c = carrosselDivulgacao(fonte)!;
const normalizar = (t: string) => t.replace(/\s+/g, " ").trim();
function verificarEncaixe(p: PacoteProva) {
  for (const [i, pagina] of p.variantes.A.paginas.entries()) for (const camada of pagina.camadas) {
    expect(camada.x, `${i + 1}: ${camada.nome}`).toBeGreaterThanOrEqual(0);
    expect(camada.x + camada.w, `${i + 1}: ${camada.nome}`).toBeLessThanOrEqual(1080);
    expect(camada.y + camada.h, `${i + 1}: ${camada.nome}`).toBeLessThanOrEqual(p.variantes.A.altura);
    if (camada.tipo === "texto") expect(layoutTexto(resolverTexto(camada, p.conteudo), camada.estilo, camada.w, camada.h, m, camada.marcas).cortado, `${i + 1}: ${camada.nome}`).toBe(false);
  }
}
describe("composição editorial da divulgação", () => {
  it("não corta palavras nem altera a leitura de rascunhos antigos", () => {
    const longo = { ...c, slides: c.slides.map((s, i) => i === 1 ? { ...s, texto: "Uma frase. ".repeat(30) } : s) };
    const antes = JSON.stringify(longo), depois = repartirParaLeitura(longo);
    expect(JSON.stringify(longo)).toBe(antes);
    const textos = depois.slides.filter(s => s.titulo === longo.slides[1].titulo).map(s => s.texto).join(" ");
    expect(normalizar(textos)).toBe(normalizar(longo.slides[1].texto));
    expect(() => verificarLeiturasLiterais(depois, fonte)).not.toThrow();
  });
  it("mantém os rascunhos anteriores válidos e apresenta opinião na primeira pessoa", () => {
    const antigo = { ...c, slides: c.slides.map(s => ({ ...s, titulo: s.titulo.replace("A minha leitura", "A leitura de Frederico Carvalho") })) };
    expect(() => verificarLeiturasLiterais(antigo, fonte)).not.toThrow();
    const p = comporCarrossel("id", antigo, fonte);
    expect(p.conteudo.slides.some(s => s.titulo.includes("leitura de Frederico"))).toBe(false);
    expect(p.variantes.A.paginas.some(p => p.papel === "concept")).toBe(true);
    expect(() => validarComposicao(p, "carrossel", "id")).not.toThrow();
  });
  it("os 10 slides cabem com as fontes reais, incluindo títulos e fontes originais", () => {
    verificarEncaixe(comporCarrossel("id", c, fonte));
    const antigo = { ...c, slides: c.slides.map((s, i) => i === 0 ? { ...s, titulo: "3 destaques para ler com outra perspetiva", texto: "Da edição #319 da DIGITALSPRINT: os factos, as fontes e a leitura de Frederico Carvalho. Desliza para explorar." } : s) };
    verificarEncaixe(comporCarrossel("id", antigo, fonte));
    const legadoCronica = { ...c, slides: [c.slides[0], { titulo: "Autonomia não significa bom senso", texto: "A investigação PixelLeak identificou mais de 13 mil imagens internas de empresas publicadas em repositórios públicos do GitHub. Os agentes não estavam a roubar: apenas a cumprir uma tarefa. Resolveram um problema técnico e criaram um problema de segurança. Em 93% dos casos, as imagens estavam fora da monitorização habitual das empresas.", fontes: [1] }, ...c.slides.slice(1)] };
    verificarEncaixe(comporCarrossel("id", repartirParaLeitura(legadoCronica), fonte));
  });
  it("adapta títulos reais à capa e ao Story sem cortar texto", () => {
    const titulo = "A IA já trabalha sozinha. E nem sempre pede autorização";
    const real = { ...c, slides: c.slides.map((s, i) => i === 0 ? { ...s, titulo, texto: "Os agentes de Inteligência Artificial deixaram de ser uma promessa futurista. Já executam tarefas, tomam decisões e assumem compromissos. A questão deixou de ser o que conseguimos automatizar e passou a ser o que devemos autorizar." } : s) };
    verificarEncaixe(comporCarrossel("id", real, fonte));
    verificarEncaixe(comporStory("id", { ...story, titulo }, 319));
    const extenso = { ...real, slides: real.slides.map((s, i) => i === 0 ? { ...s, titulo: "Inteligência Artificial, autonomia e decisões: o que devemos autorizar nas nossas empresas e equipas" } : s) };
    verificarEncaixe(comporCarrossel("id", extenso, fonte));
  });
  it("o Story cabe, distingue a crónica e reserva espaço para o autocolante", () => {
    const p = comporStory("id", story, 319); verificarEncaixe(p);
    expect(p.variantes.A.altura).toBe(1920);
    expect(p.variantes.A.paginas[0].camadas.some(c => c.tipo === "texto" && c.texto === "Crónica")).toBe(true);
    expect(p.variantes.A.paginas[0].camadas.filter(c => c.tipo === "texto").every(c => c.y >= 250 && c.y + c.h <= 1690)).toBe(true);
  });
  it("a composição não se perde ao editar a legenda e deteta mudanças ao texto de origem", () => {
    expect(assinaturaComposicao("carrossel", fonte, c, story)).toBe(assinaturaComposicao("carrossel", fonte, { ...c, legenda: "Nova legenda" }, story));
    expect(assinaturaComposicao("story", fonte, c, story)).not.toBe(assinaturaComposicao("story", fonte, c, { ...story, titulo: "Outro título" }));
  });
  it("não aceita composições de outra peça, outro rascunho ou coordenadas inválidas", () => {
    const p = comporStory("id", story, 319);
    expect(() => validarComposicao(p, "story", "id")).not.toThrow();
    expect(() => validarComposicao(p, "carrossel", "id")).toThrow();
    expect(() => validarComposicao(p, "story", "outro")).toThrow();
    const invalido = structuredClone(p); invalido.variantes.A.paginas[0].camadas[0].w = NaN;
    expect(() => validarComposicao(invalido, "story", "id")).toThrow();
  });
  it("recusa mais de 20 slides em vez de apagar conteúdo", () => {
    const grande = { ...c, slides: Array.from({ length: 20 }, () => ({ titulo: "Argumento", texto: "Uma frase. ".repeat(30), fontes: [1] })) };
    expect(() => repartirParaLeitura(grande)).toThrow("Nada foi cortado");
  });
  it("o fecho promove a subscrição sem acumular fontes e mantém a leitura na legenda", () => {
    expect(c.slides.at(-1)?.titulo).toBe(TITULO_SUBSCRICAO);
    expect(c.slides.at(-1)?.texto).not.toMatch(/fontes|curso|legenda/i);
    const legenda = legendaComLink(c, fonte);
    expect(legenda).toContain(`${URL_SUBSCRICAO}?utm_source=instagram`);
    expect(legenda).toContain("Edição completa:");
    expect(c.legenda).toContain("Partilha");
  });
  it("realça números completos sem destacar o algarismo dentro de B2B", () => {
    const p = comporCarrossel("id", c, fonte);
    const s = p.conteudo.slides.find(s => s.texto.includes("B2B"))!;
    const corpo = p.variantes.A.paginas.flatMap(p => p.camadas).find(c => c.tipo === "texto" && c.ref === `${s.id}.texto`)!;
    expect(corpo.tipo === "texto" && corpo.marcas?.map(m => s.texto.slice(m.inicio, m.fim))).not.toContain("2");
  });
});
