import { readFileSync } from "node:fs";
import { parse } from "opentype.js";
import { it } from "vitest";
import { criarMedidor, transbordos, type FonteOT } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { comporDocumentos, paraPacote, type PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";

function L(f: string): FonteOT {
  const b = readFileSync("public/fontes/" + f);
  return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) as unknown as FonteOT;
}
it("ov", () => {
  const m = criarMedidor({ 400: L("WorkSans-Regular.ttf"), 700: L("WorkSans-Bold.ttf") }, { montserrat: { 400: L("Montserrat-400.ttf"), 700: L("Montserrat-700.ttf") }, inter: { 400: L("Inter-400.ttf"), 700: L("Inter-700.ttf") } });
  let tot = 0, ov = 0;
  for (const tl of [20, 45, 70, 95, 130]) for (const xl of [100, 250, 400, 600]) {
    const papeis = ["capa", "contexto", "desenvolvimento", "fecho"] as const;
    const p = { v: 1, metodo: "ia", demonstracao: false, titulo: "t", objetivo: "", tom: "", legenda: "", alt: [], citacao: { titulo: null, url: null }, marca: { cor: "#3e5b46", origem: "neutra" },
      slides: papeis.map((papel, i) => ({ id: "s" + i, papel, titulo: "Palavra comprida ".repeat(20).slice(0, tl), texto: "Texto com frases normais e acentuação portuguesa. ".repeat(20).slice(0, xl), fontes: [1] })) } as unknown as PropostaEditorial;
    const d = comporDocumentos(p);
    for (const v of ["A", "B"] as const) { tot += 4; const t = transbordos(paraPacote("x", "x", p, d), v, m); ov += t.length; if (t.length) console.log(tl, xl, v, JSON.stringify(t)); }
  }
  console.log("transbordos", ov, "de", tot);
});
