// Reading consultant: deterministic editorial checks on the narrative (no AI, no scores, no
// predictions). Thresholds are editorial guidance for mobile reading, not engagement forecasts.
// Pure module shared by browser and tests; it never changes the narrative.

export interface SlideLeitura { id: string; papel: string; titulo: string; texto: string }

export type TipoConselho = "denso" | "varias_ideias" | "lista_longa" | "titulo_longo" | "titulo_generico" | "slide2_continuacao" | "fecho_varias_acoes" | "capa_longa";

export interface Conselho {
  slide: number; // 0-based
  slideId: string;
  tipo: TipoConselho;
  problema: string;
  acao: string;
}

/** Editorial guidance limits (mobile reading). Exported so the UI can state them honestly. */
export const LIMITES_LEITURA = { palavrasSlide: 45, frasesSlide: 3, itensLista: 5, palavrasTitulo: 14 } as const;

const palavras = (t: string) => (t.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
const frases = (t: string) => t.split(/(?<=[.!?…])\s+(?=[\p{Lu}\d«"])/u).map((x) => x.trim()).filter((x) => palavras(x) >= 3);
const ITEM = /(?:^|\n)\s*(?:\d{1,2}[.)]|[-•–])\s+\S/g;
const GENERICOS = /^(?:contexto|introdução|conclusão|resumo|nota|ideia|ponto \d+|parte \d+|slide \d+|fonte|fecho|o problema|a solução|porquê\??)$/i;
const CONTINUA = /^(?:e|mas|além disso|também|por isso|assim|ou seja|então|porém|contudo|no entanto)\b/i;
const ACOES = /\b(?:comenta|comentem|guarda|guardem|partilha|partilhem|subscreve|subscrevam|lê|leiam|segue|sigam|clica|cliquem|envia|enviem|marca|marquem)\b/gi;

/** Checks every slide; returns at most a few concrete notices per slide, each with a free action. */
export function consultarLeitura(slides: SlideLeitura[]): Conselho[] {
  const out: Conselho[] = [];
  slides.forEach((s, i) => {
    const add = (tipo: TipoConselho, problema: string, acao: string) => out.push({ slide: i, slideId: s.id, tipo, problema, acao });
    const nP = palavras(s.texto);
    const nF = frases(s.texto).length;
    const nItens = (s.texto.match(ITEM) ?? []).length;
    const nT = palavras(s.titulo);
    // Cover rule: title + one short framing sentence, never a paragraph. Advice only; text is never cut.
    if (i === 0 && (nF > 1 || nP > 24)) add("capa_longa", `Capa com ${nF > 1 ? `${nF} frases` : `${nP} palavras`} no texto (regra da capa: título e uma frase curta).`, "Capa: encurta para uma frase.");
    if (nP > LIMITES_LEITURA.palavrasSlide) add("denso", `${nP} palavras no texto (orientação: até ${LIMITES_LEITURA.palavrasSlide} por slide).`, "Encurta o texto ou move uma parte para outro slide.");
    if (s.papel !== "fecho" && nF > LIMITES_LEITURA.frasesSlide) add("varias_ideias", `${nF} frases: pode haver mais do que uma ideia principal.`, "Fica com a ideia principal e passa o resto para outro slide.");
    if (nItens > LIMITES_LEITURA.itensLista) add("lista_longa", `Lista com ${nItens} itens (orientação: até ${LIMITES_LEITURA.itensLista}).`, "Divide a lista ou fica com os itens essenciais.");
    if (nT > LIMITES_LEITURA.palavrasTitulo) add("titulo_longo", `Título com ${nT} palavras (orientação: até ${LIMITES_LEITURA.palavrasTitulo}).`, "Encurta o título e passa o pormenor para o texto.");
    if (s.papel !== "capa" && s.papel !== "fecho" && GENERICOS.test(s.titulo.trim().replace(/[.:]$/, ""))) add("titulo_generico", "Título genérico: lido em sequência não conta o raciocínio.", "Escreve no título a ideia que o slide defende.");
    if (i === 1 && CONTINUA.test(s.titulo.trim() || s.texto.trim())) add("slide2_continuacao", "O slide 2 começa como continuação da capa; quem o vê sozinho perde o contexto.", "Reescreve a abertura para que o slide se perceba sozinho.");
    if (s.papel === "fecho" && new Set((`${s.titulo} ${s.texto}`.match(ACOES) ?? []).map((a) => a.toLowerCase().slice(0, 4))).size > 1) add("fecho_varias_acoes", "O fecho pede mais do que uma ação.", "Fica só com a ação do apelo final.");
  });
  return out;
}
