import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { it } from "vitest";
import { parse } from "opentype.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { criarMedidor, paginaParaSvg, type Familia, type FonteOT, type PacoteProva, type Peso } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, sistemaPadrao } from "../../supabase/functions/_shared/motor/sistema";
import { FICHEIROS_EXTRA } from "@/features/editor-grafico/fontes";
const ler = (f: string) => { const b = readFileSync(`public${f}`); return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) as unknown as FonteOT; };
it.skipIf(!process.env.AMOSTRAS)("amostras", async () => {
  const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
  for (const [f, ps] of Object.entries(FICHEIROS_EXTRA)) { extras[f as Familia] = {}; for (const [p, u] of Object.entries(ps ?? {})) extras[f as Familia]![Number(p) as Peso] = ler(u!); }
  const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") }, extras);
  await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
  const slides = [
    { id: "s1", titulo: "IA influencia menos compras do que se pensa", texto: "O que os dados mostram." },
    { id: "s2", titulo: "A confiança ainda pesa mais", texto: "Os consumidores continuam a decidir com base em marcas que já conhecem e em recomendações de pessoas próximas." },
    { id: "s3", titulo: "Agora, o que fazer", texto: "Reforçar a prova social e medir o impacto real." },
  ];
  const pag = (s: typeof slides[0], i: number) => ({ id: `p${i}`, slide: s.id, fundo: "#fff", camadas: [
    { id: `t${i}`, tipo: "texto" as const, ref: `${s.id}.titulo`, x: 96, y: 200, w: 888, h: 300, z: 2, estilo: { peso: 700 as const, tam: 72, linha: 1.1, alinh: "esq" as const, cor: "#111", overflow: "cortar" as const } },
    { id: `b${i}`, tipo: "texto" as const, ref: `${s.id}.texto`, x: 96, y: 560, w: 888, h: 500, z: 2, estilo: { peso: 400 as const, tam: 40, linha: 1.4, alinh: "esq" as const, cor: "#333", overflow: "cortar" as const } }] });
  const doc = (v: "A" | "B") => ({ v: 1 as const, variante: v, largura: 1080 as const, altura: 1350 as const, fonte: "WorkSans@1" as const, paginas: slides.map(pag) });
  const base: PacoteProva = { v: 1, id: "a", nome: "a", sintetico: true, conteudo: { slides }, assets: {}, variantes: { A: doc("A"), B: doc("B") } };
  mkdirSync("/tmp/browser/dv", { recursive: true });
  for (const e of ["editorial", "impacto", "revista", "fotografico", "didatico"] as const) for (const v of ["A", "B"] as const) {
    const r = aplicarSistema(base, { ...sistemaPadrao(3), estilo: e, variante: v, paleta: e === "revista" ? "terracota" : "azul" }, m).pacote;
    for (const i of [0, 1]) writeFileSync(`/tmp/browser/dv/${e}-${v}-${i}.png`, new Resvg(paginaParaSvg(r, v, i, m), { fitTo: { mode: "width", value: 270 } }).render().asPng());
  }
}, 120000);
