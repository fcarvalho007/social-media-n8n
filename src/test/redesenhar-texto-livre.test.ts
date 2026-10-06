import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { sistemaPadrao } from "../../supabase/functions/_shared/motor/sistema";
import { assinatura, hashConteudo, redesenharPagina } from "../../supabase/functions/_shared/motor/redesenhar";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Mirrors a real cover: hand-typed title (no editorial ref) and a small logo.
const capa = (): Pagina => ({ id: "p0", slide: "s1", papel: "cover", fundo: "#000000", camadas: [
  { id: "texto-1", tipo: "texto", texto: "Tráfego de Inteligência Artificial cai -3,9%", x: 68, y: 376, w: 949, h: 447, z: 1, manual: true,
    estilo: { peso: 700, tam: 100, linha: 1.1, alinh: "esq", cor: "#f4f1f1", overflow: "cortar", familia: "montserrat" } },
  { id: "logo", tipo: "imagem", asset_id: "logo", x: 634, y: 123, w: 415, h: 108, z: 2, recorte: "cover", manual: true },
] } as Pagina);

function pacote(): PacoteProva {
  const slides = [{ id: "s1", titulo: "Tráfego de IA", texto: "" }, { id: "s2", titulo: "Dois", texto: "Corpo." }];
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: [capa(), { ...capa(), id: "p1", slide: "s2" }] });
  return { v: 1, id: "t", nome: "t", sintetico: true, conteudo: { slides }, assets: { logo: { id: "logo", mime: "image/png", largura: 400, altura: 100, dados: PNG } }, variantes: { A: doc("A"), B: doc("B") } } as PacoteProva;
}

describe("redesenhar com texto escrito à mão", () => {
  it("devolve 5 versões todas diferentes, sem mudar texto nem mexer no logótipo", () => {
    const p = pacote();
    const r = redesenharPagina({ pacote: p, sistema: { ...sistemaPadrao(2, "editorial"), quebras: {} }, variante: "A", indice: 0, m, incluirIA: false });
    expect(r.candidatos).toHaveLength(5);
    const sigs = r.candidatos.map((c) => assinatura(c.pagina));
    expect(new Set([...sigs, assinatura(p.variantes.A.paginas[0])]).size).toBe(6);
    const h0 = hashConteudo(p.variantes.A.paginas[0], p.conteudo);
    for (const c of r.candidatos) {
      expect(hashConteudo(c.pagina, p.conteudo)).toBe(h0);
      const logo = c.pagina.camadas.find((x) => x.id === "logo")!;
      expect([logo.x, logo.y, logo.w, logo.h]).toEqual([634, 123, 415, 108]);
      const t = c.pagina.camadas.find((x) => x.id === "texto-1");
      expect(t && t.tipo === "texto" && t.estilo.tam).toBeGreaterThanOrEqual(60);
    }
    expect(r.candidatos.filter((c) => c.disruptiva).length).toBe(2);
  });
});
