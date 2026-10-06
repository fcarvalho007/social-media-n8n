import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { sistemaPadrao, type SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { ASSET_IA_PENDENTE, aplicarCandidato, hashConteudo, imagemInadequada, redesenharPagina, substituirImagemIA } from "../../supabase/functions/_shared/motor/redesenhar";
import { construirPromptComposicao, regiaoSujeito } from "../../supabase/functions/_shared/motor/promptVisual";
import { modelosImagem, resolverModeloImagem } from "../../supabase/functions/_shared/motor/imagemModelo.server";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
function pagina(i: number, sid: string, papel?: string): Pagina {
  return { id: `p${i}`, slide: sid, fundo: "#ffffff", ...(papel ? { papel } : {}), camadas: [
    { id: `img${i}`, tipo: "imagem" as const, asset_id: "foto", x: 0, y: 0, w: 1080, h: 1350, z: 1, recorte: "cover" as const },
    { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `${sid}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400, tam: 40, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
  ] } as Pagina;
}
function pacote(papel?: string): PacoteProva {
  const slides = Array.from({ length: 4 }, (_, i) => ({ id: `s${i + 1}`, titulo: "O que a Semrush consegue medir (e o que não consegue)", texto: "Dados observáveis e lacunas." }));
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pagina(i, s.id, i === 1 ? papel : undefined)) });
  return { v: 1, id: "fx", nome: "fx", sintetico: true, conteudo: { slides }, assets: { foto: { id: "foto", mime: "image/png", largura: 1080, altura: 1350, dados: PNG } }, variantes: { A: doc("A"), B: doc("B") } };
}
const sis: SistemaVisual = { ...sistemaPadrao(4, "editorial"), quebras: {} };

describe("redesenhar com imagem IA obrigatória", () => {
  it("5 propostas com exatamente 1 AI_IMAGE_COMPOSITION, conteúdo intacto", () => {
    const p = pacote();
    const r = redesenharPagina({ pacote: p, sistema: sis, variante: "A", indice: 1, m });
    const ia = r.candidatos.filter((c) => c.strategy === "AI_IMAGE_COMPOSITION");
    expect(ia).toHaveLength(1);
    expect(r.candidatos.length).toBeLessThanOrEqual(5);
    expect(ia[0].pendente).toBe(true);
    expect(ia[0].promptIA).toMatch(/no text/i);
    expect(hashConteudo(ia[0].pagina, p.conteudo)).toBe(hashConteudo(p.variantes.A.paginas[1], p.conteudo));
    expect(ia[0].pagina.camadas.some((c) => c.tipo === "imagem" && c.asset_id === ASSET_IA_PENDENTE)).toBe(true);
  });
  it("sem IA em páginas de dados/comparação e com 'sem novas'", () => {
    expect(imagemInadequada("data")).toBe(true);
    const r = redesenharPagina({ pacote: pacote("data"), sistema: sis, variante: "A", indice: 1, m });
    expect(r.candidatos.some((c) => c.requiresAiImage)).toBe(false);
    const r2 = redesenharPagina({ pacote: pacote(), sistema: sis, variante: "A", indice: 1, m, imagens: "sem_novas" });
    expect(r2.candidatos.some((c) => c.requiresAiImage)).toBe(false);
  });
  it("substituir/regenerar só troca a imagem", () => {
    const p = pacote();
    const c = redesenharPagina({ pacote: p, sistema: sis, variante: "A", indice: 1, m }).candidatos.find((x) => x.requiresAiImage)!;
    const a = substituirImagemIA(c, "nova1", { modelo: "x" });
    const b = substituirImagemIA(a, "nova2");
    const geo = (x: typeof c) => x.pagina.camadas.map((l) => [l.id, l.x, l.y, l.w, l.h]);
    expect(geo(b)).toEqual(geo(c));
    expect(b.pendente).toBe(false);
    expect(b.pagina.camadas.find((l) => l.tipo === "imagem")).toMatchObject({ asset_id: "nova2" });
    const ap = aplicarCandidato(p, "A", 1, b);
    expect(ap.variantes.A.paginas[0]).toBe(p.variantes.A.paginas[0]);
  });
  it("prompt coloca o sujeito oposto ao texto e proíbe texto", () => {
    expect(regiaoSujeito("left")).toBe("right");
    const t = construirPromptComposicao({ titulo: "O que a Semrush consegue medir (e o que não consegue)", papel: "concept", estilo: "editorial", variante: "A", paleta: "navy-editorial", modo: "full_bleed", regiao: "left" });
    expect(t).toMatch(/subject positioned on the right/);
    expect(t).toMatch(/shadow/);
    expect(t).not.toMatch(/semrush/i);
  });
  it("resolvedor de modelo respeita configuração e fallback", () => {
    expect(resolverModeloImagem("fast", () => undefined).modelo).toBe("seedream/5-flash-text-to-image");
    const env: Record<string, string> = { AI_IMAGE_FAST_MODEL: "a/fast", AI_IMAGE_QUALITY_MODEL: "a/q", AI_IMAGE_FALLBACK_MODEL: "a/fb" };
    expect(resolverModeloImagem("quality", (k) => env[k])).toEqual({ modelo: "a/q", fallback: "a/fb" });
    expect(modelosImagem((k) => env[k])).toEqual(expect.arrayContaining(["a/fast", "a/q", "a/fb"]));
  });
});
