import { readFileSync } from "node:fs";
import { it } from "vitest";
import { parse } from "opentype.js";
import { criarMedidor, type FonteOT, type PacoteProva, type Pagina } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, sistemaPadrao } from "../../supabase/functions/_shared/motor/sistema";
import { redesenharPagina, assinatura } from "../../supabase/functions/_shared/motor/redesenhar";
const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") });
function pg(i: number, sid: string): Pagina { return { id: `p${i}`, slide: sid, fundo: "#fff", camadas: [
 { id: `t${i}`, tipo: "texto", ref: `${sid}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700, tam: 72, linha: 1.1, alinh: "esq", cor: "#111", overflow: "cortar" } } ] } as Pagina; }
it("repro", () => {
  const slides = [0,1,2,3].map((i) => ({ id: `s${i+1}`, titulo: "Tráfego de Inteligência Artificial aos sites cai -3,9%", texto: i ? "Texto do corpo." : "" }));
  const doc = (v: "A"|"B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map((s, i) => pg(i, s.id)) });
  let p: PacoteProva = { v: 1, id: "x", nome: "x", sintetico: true, conteudo: { slides }, assets: {}, variantes: { A: doc("A"), B: doc("B") } } as PacoteProva;
  const sis = { ...sistemaPadrao(4, "editorial"), quebras: {} };
  p = aplicarSistema(p, sis, m).pacote;
  for (const modo of ["manter","explorar"] as const) {
  const r = redesenharPagina({ pacote: p, sistema: sis, variante: "A", indice: 0, m, incluirIA: false, imagens: "auto", modo });
  console.log(modo, r.aviso);
  for (const c of r.candidatos) { const t = c.pagina.camadas.find((x) => x.tipo === "texto")!; console.log(c.label, c.estilo, assinatura(c.pagina), t.x, t.y, t.w, (t as any).estilo.tam, c.pagina.fundo, c.pagina.camadas.map((x) => x.id).join(",")); }
  }
});
