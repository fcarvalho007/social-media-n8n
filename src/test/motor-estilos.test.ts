import { describe, expect, it } from "vitest";
import { aplicarEstilo, ESTILOS } from "../../supabase/functions/_shared/motor/estilos";
import { FAMILIAS, PARES_FONTES, type DocumentoGrafico } from "../../supabase/functions/_shared/documento-grafico/nucleo";

const estilo = { tamanho: 40, peso: 700 as const, cor: "#000000", alinhamento: "esq" as const, entrelinha: 1.2 };
function doc(): DocumentoGrafico {
  return {
    versao: 1, largura: 1080, altura: 1350, fonte: "WorkSans@1",
    paginas: [{ id: "p1", fundo: "#ffffff", camadas: [
      { id: "t", tipo: "texto", ref: { slide: "s1", campo: "titulo" }, x: 0, y: 0, largura: 900, altura: 200, texto: "Título", estilo },
      { id: "livre", tipo: "texto", x: 0, y: 400, largura: 900, altura: 200, texto: "Nota minha", estilo: { ...estilo, cor: "#123456" } },
    ] }],
  } as unknown as DocumentoGrafico;
}

describe("estilos do motor", () => {
  it("tem 6 estilos com pares de fontes válidos e Montserrat+Inter por omissão", () => {
    expect(ESTILOS).toHaveLength(6);
    for (const e of ESTILOS) expect(PARES_FONTES.some((p) => p.id === e.par)).toBe(true);
    expect(PARES_FONTES[0]).toMatchObject({ titulo: "montserrat", corpo: "inter" });
    for (const p of PARES_FONTES) { expect(FAMILIAS).toContain(p.titulo); expect(FAMILIAS).toContain(p.corpo); }
  });

  it("nunca muda o texto e só recolore camadas manuais quando pedido", () => {
    const e = ESTILOS[1];
    const r = aplicarEstilo(doc(), e.paleta, e.par);
    const [t, livre] = r.doc.paginas[0].camadas as Array<{ texto: string; estilo: { cor: string } }>;
    expect(t.texto).toBe("Título");
    expect(livre.texto).toBe("Nota minha");
    expect(livre.estilo.cor).toBe("#123456");
    expect(r.manuais).toBeGreaterThan(0);
    const r2 = aplicarEstilo(doc(), e.paleta, e.par, true);
    expect((r2.doc.paginas[0].camadas[1] as unknown as { estilo: { cor: string } }).estilo.cor).not.toBe("#123456");
  });
});
