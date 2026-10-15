// DIGITALSPRINT launch artwork, expressed in the existing editable DocumentoGrafico.
// No second renderer, paid generation, source rewriting or publication.
import { dividirTexto, eSlideLeitura, TITULO_LEITURA, TITULO_SUBSCRICAO, ENDERECO_SUBSCRICAO, type Carrossel, type FonteCronica, type Slide } from "./carrossel.ts";
import type { StoryEdicao, PecaDivulgacao, DivulgacaoEdicao } from "./divulgacao.ts";
import { FONTE_DOC, validarPacote, type Camada, type CamadaTexto, type PacoteProva, type Pagina } from "../documento-grafico/nucleo.ts";

// Existing Revista palette, kept here to avoid an edge -> generated browser source dependency.
export const TINTAS = { tinta: "#171A21", papel: "#FAF9F5", lima: "#E7EF84", azul: "#0077B6", branco: "#FFFFFF", suave: "#CCD0D8" } as const;
export const ALVO_TEXTO_SLIDE = 200;
export type PapelDivulgacao = "capa" | "cronica" | "noticia" | "leitura" | "fecho";

export function papelSlide(s: Slide, fonte: FonteCronica, i: number, total: number): PapelDivulgacao {
  if (i === 0) return "capa";
  if (i === total - 1) return "fecho";
  if (eSlideLeitura(s)) return "leitura";
  return s.fontes.some(n => fonte.paragrafos[n - 1]?.startsWith("[Destaque")) ? "noticia" : "cronica";
}

/** Explicit editorial reflow: preserves every word, evidence and approved quotation. Never mutates the saved draft. */
export function repartirParaLeitura(c: Carrossel): Carrossel {
  const slides = c.slides.flatMap((s, i) => {
    const leitura = eSlideLeitura(s);
    const rodape = leitura ? "" : s.texto.match(/\n\nFonte original: [^\n]+$/)?.[0] ?? "";
    const original = leitura ? s.texto.replace(/^«/, "").replace(/»$/, "") : s.texto.slice(0, s.texto.length - rodape.length);
    const partes = i === 0 || i === c.slides.length - 1 ? [original] : dividirTexto(original, ALVO_TEXTO_SLIDE - (leitura ? 2 : 0));
    const titulo = leitura ? TITULO_LEITURA : s.titulo;
    return partes.map((t, k) => ({ ...s, titulo: partes.length > 1 && leitura ? `${titulo} · ${k + 1}/${partes.length}` : titulo, texto: leitura ? `«${t}»` : `${i === 0 ? t.replace(/a leitura de Frederico Carvalho/gi, "a minha leitura") : t}${k === partes.length - 1 ? rodape : ""}`, fontes: [...s.fontes] }));
  });
  if (slides.length > 20) throw new Error(`A divisão precisa de ${slides.length} slides. Encurta o texto ou prepara apenas os destaques antes de compor (máximo 20). Nada foi cortado.`);
  return { ...c, slides };
}

const texto = (id: string, t: string, x: number, y: number, w: number, h: number, tam: number, cor: string, peso: 400 | 700 = 400, ref?: string): CamadaTexto => ({
  id, nome: id, tipo: "texto", texto: ref ? undefined : t, ref, x, y, w, h, z: 3,
  estilo: { peso, familia: peso === 700 ? "grotesk" : "inter", tam, tamMin: peso === 700 && tam >= 70 ? 64 : tam >= 44 ? Math.max(36, Math.floor(tam * 0.83)) : tam, linha: 1.15, alinh: "esq", cor, overflow: "reduzir" },
});
const ret = (id: string, x: number, y: number, w: number, h: number, cor: string): Camada => ({ id, nome: id, tipo: "forma", forma: "ret", x, y, w, h, z: 1, estilo: { cor } });
const seta = (id: string, x: number, y: number, cor: string): Camada => ({ id, nome: "Continuar a ler", tipo: "forma", forma: "icone", x, y, w: 64, h: 64, z: 3, estilo: { cor, icone: "seta" } });

function identidade(escuro: boolean, numero: number, papel: string, i: number, total: number): Camada[] {
  const cor = escuro ? TINTAS.branco : TINTAS.tinta;
  return [texto("Marca", "DIGITALSPRINT", 80, 80, 700, 48, 34, escuro ? TINTAS.lima : TINTAS.tinta, 700),
    texto("Edição", `#${numero}`, 850, 85, 150, 42, 30, cor),
    texto("Tipo de conteúdo", papel, 80, 1145, 720, 45, 30, escuro ? TINTAS.lima : TINTAS.azul, 700),
    texto("Assinatura", "@fredericocarvalho", 80, 1204, 700, 40, 26, escuro ? TINTAS.suave : TINTAS.tinta),
    texto("Página", `${i + 1} / ${total}`, 850, 1204, 150, 40, 26, cor)];
}

function paginaSlide(s: Slide, fonte: FonteCronica, i: number, total: number): Pagina {
  const papel = papelSlide(s, fonte, i, total), sid = `s${i + 1}`;
  const subscricao = papel === "fecho" && s.titulo === TITULO_SUBSCRICAO;
  const escuro = papel === "capa" || papel === "leitura" || subscricao;
  const fundo = escuro ? TINTAS.tinta : papel === "fecho" ? TINTAS.lima : TINTAS.papel;
  const camadas = identidade(escuro, fonte.numero, subscricao ? "Newsletter semanal" : { capa: "Newsletter", cronica: "Crónica", noticia: "Notícia", leitura: "Opinião", fecho: "Continua a leitura" }[papel], i, total);
  if (papel === "leitura") {
    camadas.push(texto("A minha leitura", TITULO_LEITURA, 80, 225, 920, 100, 76, TINTAS.lima, 700),
      texto("Leitura aprovada", "", 80, 400, 920, 660, s.texto.length > 220 ? 56 : 66, TINTAS.branco, 400, `${sid}.texto`));
  } else if (papel === "noticia") {
    const ref = s.fontes.map(n => fonte.paragrafos[n - 1] ?? "").find(p => p.startsWith("[Destaque"));
    const n = Number(ref?.match(/^\[Destaque (\d+)\]/)?.[1] ?? 0);
    const fonteOriginal = fonte.destaques?.[n - 1]?.publisher ?? "";
    camadas.push(texto("Título da notícia", "", 80, 230, 920, 420, s.titulo.length > 70 ? 76 : 88, TINTAS.tinta, 700, `${sid}.titulo`),
      texto("Factos", "", 80, 720, 920, 360, s.texto.length > ALVO_TEXTO_SLIDE ? 44 : 54, TINTAS.tinta, 400, `${sid}.texto`),
      ret("Faixa da fonte", 0, 1095, 1080, 100, TINTAS.lima),
      texto("Fonte original", `Notícia ${n || ""} · ${fonteOriginal || "ver referências"}`, 80, 1120, 920, 50, 28, TINTAS.tinta));
    camadas.splice(2, 1); // source occupies the role row, which would otherwise overlap it
  } else if (papel === "capa") {
    camadas.push(texto("Título", "", 80, 260, 920, 540, s.titulo.length > 75 ? 82 : s.titulo.length > 55 ? 94 : 106, TINTAS.branco, 700, `${sid}.titulo`),
      texto("Convite", "", 80, 810, 840, 300, 48, TINTAS.suave, 400, `${sid}.texto`),
      seta("Seta", 925, 1040, TINTAS.lima));
  } else if (subscricao) {
    camadas.push(ret("Linha azul", 0, 180, 1080, 8, TINTAS.azul),
      texto("Título", "", 80, 255, 920, 360, 106, TINTAS.branco, 700, `${sid}.titulo`),
      texto("Benefício", "", 80, 660, 920, 230, 54, TINTAS.suave, 400, `${sid}.texto`),
      ret("Convite de subscrição", 64, 930, 952, 170, TINTAS.lima),
      texto("Subscrever", "Subscreve a DIGITALSPRINT", 92, 950, 896, 55, 36, TINTAS.tinta, 700),
      texto("Endereço de subscrição", ENDERECO_SUBSCRICAO, 92, 1018, 896, 70, 62, TINTAS.tinta, 700));
  } else if (papel === "fecho") {
    camadas.push(texto("Título", "", 80, 260, 920, 360, 100, TINTAS.tinta, 700, `${sid}.titulo`),
      texto("Convite", "", 80, 740, 920, 320, s.texto.length > 200 ? 44 : 52, TINTAS.tinta, 400, `${sid}.texto`),
      seta("Seta", 920, 1080, TINTAS.tinta));
  } else {
    camadas.push(ret("Bloco da crónica", 0, 195, 1080, 440, TINTAS.azul),
      texto("Título da crónica", "", 80, 255, 920, 340, s.titulo.length > 60 ? 70 : 86, TINTAS.branco, 700, `${sid}.titulo`),
      texto("Crónica", "", 80, 690, 920, 440, s.texto.length > ALVO_TEXTO_SLIDE ? 44 : 54, TINTAS.tinta, 400, `${sid}.texto`));
  }
  // Emphasise existing evidence without inventing a graphic or changing a number's context.
  if (papel === "noticia" || papel === "leitura") {
    const corpo = s.texto.replace(/\n\nFonte original: [^\n]+$/, "");
    const camada = camadas.find(c => c.tipo === "texto" && c.ref === `${sid}.texto`) as CamadaTexto | undefined;
    if (camada) camada.marcas = [...corpo.matchAll(/(?<![\p{L}\p{N}])\d[\d.,]*(?:\s?(?:milhões|mil|%))?/gu)].slice(0, 3).map(m => ({ inicio: m.index!, fim: m.index! + m[0].length, peso: 700, ...(papel === "noticia" ? { realce: TINTAS.lima } : { sublinhado: TINTAS.lima }) }));
  }
  return { id: `p${i + 1}`, slide: sid, fundo, papel: { capa: "cover", cronica: "visual_story", noticia: "data", leitura: "concept", fecho: "conclusion" }[papel], camadas };
}

function pacote(id: string, nome: string, paginas: Pagina[], slides: PacoteProva["conteudo"]["slides"], story = false): PacoteProva {
  const doc = { v: 1 as const, largura: 1080 as const, altura: story ? 1920 as const : 1350 as const, formato: story ? "story" as const : "carrossel" as const, fonte: FONTE_DOC as typeof FONTE_DOC, paginas };
  return { v: 1, id, nome, sintetico: false, conteudo: { slides }, assets: {}, variantes: { A: { ...doc, variante: "A" }, B: structuredClone({ ...doc, variante: "B" }) } };
}

export function comporCarrossel(id: string, c: Carrossel, fonte: FonteCronica): PacoteProva {
  const slides = c.slides.map((s, i) => {
    const leitura = eSlideLeitura(s);
    // Source attribution has its own editable layer instead of swelling the body copy.
    const corpo = s.texto.replace(/\n\nFonte original: [^\n]+$/, "");
    return { id: `s${i + 1}`, titulo: leitura ? TITULO_LEITURA : s.titulo, texto: i === 0 ? corpo.replace(/a leitura de Frederico Carvalho/gi, "a minha leitura") : corpo };
  });
  return pacote(id, `DIGITALSPRINT ${fonte.numero} · Carrossel`, c.slides.map((s, i) => paginaSlide(s, fonte, i, c.slides.length)), slides);
}

export function comporStory(id: string, s: StoryEdicao, numero: number): PacoteProva {
  const camadas: Camada[] = [
    texto("Marca", "DIGITALSPRINT", 80, 270, 720, 60, 42, TINTAS.lima, 700),
    texto("Edição", `#${numero}`, 850, 280, 150, 50, 32, TINTAS.branco),
    texto("Título da crónica", "", 80, 425, 920, 540, s.titulo.length > 100 ? 82 : 106, TINTAS.branco, 700, "s1.titulo"),
    ret("Papel da crónica", 0, 1010, 1080, 910, TINTAS.papel),
    texto("Excerto", "", 80, 1040, 920, 350, s.texto.length > 210 ? 44 : 48, TINTAS.tinta, 400, "s1.texto"),
    texto("Convite à leitura", s.cta, 80, 1400, 820, 70, 48, TINTAS.azul, 700),
    seta("Seta da leitura", 925, 1395, TINTAS.azul),
    texto("Tipo de conteúdo", "Crónica", 80, 355, 820, 50, 30, TINTAS.lima),
    texto("Assinatura", "@fredericocarvalho", 80, 1620, 920, 42, 28, TINTAS.tinta),
  ];
  return pacote(id, `DIGITALSPRINT ${numero} · Story`, [{ id: "p1", slide: "s1", papel: "visual_story", fundo: TINTAS.tinta, camadas }], [{ id: "s1", titulo: s.titulo, texto: s.texto }], true);
}

export function assinaturaComposicao(peca: PecaDivulgacao, fonte: FonteCronica, c: Carrossel | null, story: StoryEdicao): string {
  return JSON.stringify([peca, fonte.hash, peca === "story" ? story : c?.slides]);
}

export function validarComposicao(v: unknown, peca: PecaDivulgacao, id: string): PacoteProva {
  const p = validarPacote(v, { real: true });
  if (p.id !== id || [p.variantes.A, p.variantes.B].some(d => d.formato !== peca)) throw new Error("A composição não corresponde a esta peça.");
  return p;
}

/** Persist the incumbent artwork as editable drafts, without replacing any manual composition. */
export function prepararComposicoesEmFalta(id: string, fonte: FonteCronica, c: Carrossel | null, d: DivulgacaoEdicao, agora = new Date().toISOString()): DivulgacaoEdicao {
  if (d.composicoes?.story && (!c || d.composicoes.carrossel)) return d;
  const composicoes = { ...d.composicoes };
  if (!composicoes.story) composicoes.story = { pacote: validarComposicao(comporStory(id, d.story, fonte.numero), "story", id), base_assinatura: assinaturaComposicao("story", fonte, c, d.story), guardado_em: agora };
  if (c && !composicoes.carrossel) composicoes.carrossel = { pacote: validarComposicao(comporCarrossel(id, c, fonte), "carrossel", id), base_assinatura: assinaturaComposicao("carrossel", fonte, c, d.story), guardado_em: agora };
  return { ...d, composicoes };
}
