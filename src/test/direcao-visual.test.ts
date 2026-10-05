import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, paginaParaSvg, validarPacote, type Camada, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, migrarLegado, paginasComAjustes, quebrasPadrao, recolorir, sistemaDoPacote, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { estadoInicial, reduzir } from "@/features/editor-grafico/estado";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });

const PNG1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
function pagina(i: number, sid: string): Pagina {
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", camadas: [
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
    ...(i === 2 ? [{ id: "foto", tipo: "imagem", asset_id: "a1", x: 0, y: 0, w: 1080, h: 1350, z: 1, recorte: "cover", foco: { x: 0.5, y: 0.5 } } as Camada] : []),
  ] };
}
function pacote(n = 8): PacoteProva {
  const slides = Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, titulo: i === 0 ? "Visibilidade em IA" : "Medir antes de mudar", texto: i === 0 ? "" : "A equipa comparou semanas e temas antes de escolher." }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pagina(i, s.id)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: { a1: { id: "a1", mime: "image/png", largura: 1, altura: 1, dados: PNG1 } }, variantes: { A: doc("A"), B: doc("B") } };
}
const sis = (extra: Partial<SistemaVisual> = {}): SistemaVisual => ({ estilo: "editorial", variante: "A", paleta: "navy-editorial", quebras: quebrasPadrao(8), ...extra });
const geo = (p: Pagina) => p.camadas.map((c) => `${c.id}:${c.x},${c.y},${c.w},${c.h}:${c.tipo === "texto" ? c.estilo.tam : ""}:${c.tipo === "imagem" ? `${c.recorte}${JSON.stringify(c.foco)}` : ""}`).join("|");

describe("direção visual no documento (fonte de verdade única)", () => {
  it("o sistema, papel e composição ficam no documento e sobrevivem a gravar/ler (validarPacote) com SVG idêntico", () => {
    const r = aplicarSistema(pacote(), sis(), m).pacote;
    expect(sistemaDoPacote(r)).toMatchObject({ estilo: "editorial", variante: "A", paleta: "navy-editorial" });
    expect(r.variantes.A.paginas[0].papel).toBe("cover");
    const lido = validarPacote(JSON.parse(JSON.stringify(r)));
    expect(lido.variantes.A.sistema).toEqual(r.variantes.A.sistema);
    r.variantes.A.paginas.forEach((p, i) => {
      expect(lido.variantes.A.paginas[i].papel).toBe(p.papel);
      expect(paginaParaSvg(lido, "A", i, m)).toBe(paginaParaSvg(r, "A", i, m));
    });
  });

  it("documentos antigos sem os campos novos continuam válidos e iguais", () => {
    const p = pacote();
    expect(validarPacote(JSON.parse(JSON.stringify(p)))).toEqual(JSON.parse(JSON.stringify(p)));
  });

  it("trocar só a paleta muda cores e mantém geometria, tamanhos, imagem, recorte, foco, papel e modo", () => {
    const a = aplicarSistema(pacote(), sis(), m).pacote;
    const b = recolorir(a, "navy-editorial", "navy-signal");
    for (const v of ["A", "B"] as const) a.variantes[v].paginas.forEach((p, i) => {
      expect(geo(b.variantes[v].paginas[i])).toBe(geo(p));
      expect(b.variantes[v].paginas[i].papel).toBe(p.papel);
      expect(b.variantes[v].paginas[i].composicao).toEqual(p.composicao);
    });
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
    expect(sistemaDoPacote(b)?.paleta).toBe("navy-signal");
  });

  it("ajustes manuais (título movido, foco da imagem) sobrevivem à paleta e são contados antes de mudar estilo", () => {
    const a = aplicarSistema(pacote(), sis(), m).pacote;
    let st = estadoInicial(a);
    st = reduzir(st, { tipo: "pagina", indice: 2 });
    const t = st.pacote.variantes.A.paginas[2].camadas.find((c) => c.tipo === "texto" && c.ref?.endsWith(".titulo"))!;
    st = reduzir(st, { tipo: "camada", id: t.id, patch: { y: t.y + 50 } });
    const f = st.pacote.variantes.A.paginas[2].camadas.find((c) => c.tipo === "imagem")!;
    st = reduzir(st, { tipo: "camada", id: f.id, patch: { foco: { x: 0.2, y: 0.8 } } as Partial<Camada> });
    const ed = st.pacote;
    expect(paginasComAjustes(ed)).toBe(1);
    const pal = recolorir(ed, "navy-editorial", "navy-digital");
    expect(pal.variantes.A.paginas[2].camadas.find((c) => c.id === t.id)).toMatchObject({ y: t.y + 50, manual: true });
    expect(pal.variantes.A.paginas[2].camadas.find((c) => c.id === f.id)).toMatchObject({ foco: { x: 0.2, y: 0.8 } });
    // Changing style: "manter" keeps them, "recriar" rebuilds.
    const manter = aplicarSistema(ed, sis({ estilo: "revista" }), m, undefined, {}, { ajustes: "manter" }).pacote;
    expect(manter.variantes.A.paginas[2].camadas.find((c) => c.id === t.id)).toMatchObject({ y: t.y + 50 });
    const recriar = aplicarSistema(ed, sis({ estilo: "revista" }), m, undefined, {}, { ajustes: "recriar" }).pacote;
    expect(paginasComAjustes(recriar)).toBe(0);
  });

  it("rascunho: cancelar repõe exatamente o documento anterior; aplicar gera um único passo de desfazer", () => {
    const a = aplicarSistema(pacote(), sis(), m).pacote;
    let st = estadoInicial(a);
    const antes = JSON.stringify(st.pacote);
    const revista = aplicarSistema(a, sis({ estilo: "revista", variante: "B" }), m).pacote;
    st = reduzir(st, { tipo: "previsualizar", pacote: revista, variante: "B" });
    expect(st.variante).toBe("B");
    expect(st.passado.length).toBe(0);
    const cancelado = reduzir(st, { tipo: "previsualizar", pacote: a, variante: "A" });
    expect(JSON.stringify(cancelado.pacote)).toBe(antes);
    const aplicado = reduzir(st, { tipo: "confirmar", antes: a });
    expect(aplicado.pacote).toBe(revista);
    const desfeito = reduzir(aplicado, { tipo: "desfazer" });
    expect(JSON.stringify(desfeito.pacote)).toBe(antes);
    expect(desfeito.variante).toBe("A");
  });

  it("papel vindo da narrativa é respeitado (um número não força 'data')", () => {
    const p = pacote();
    p.conteudo.slides[3] = { ...p.conteudo.slides[3], texto: "42% das equipas mediram antes." };
    for (const v of ["A", "B"] as const) p.variantes[v].paginas[3] = { ...p.variantes[v].paginas[3], papel: "standard" };
    const r = aplicarSistema(p, sis(), m).pacote;
    expect(r.variantes.A.paginas[3].papel).toBe("standard");
  });

  it("migração legada copia sistema e escolhas para o documento, uma vez e num só sentido", () => {
    const p = migrarLegado(pacote(), sis({ paleta: "navy-sage" }), { "A:s3": { modo: "hero", papel: "case_study" } });
    expect(sistemaDoPacote(p)?.paleta).toBe("navy-sage");
    expect(p.variantes.A.paginas[2]).toMatchObject({ papel: "case_study", composicao: { modo: "hero" } });
    expect(migrarLegado(p, sis(), { "A:s3": { modo: "split" } }).variantes.A.paginas[2].composicao).toEqual({ modo: "hero" });
  });
});
