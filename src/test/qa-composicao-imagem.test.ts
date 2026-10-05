// Visual QA artefacts (skipped unless /tmp/foto.jpg exists): 8 pages per style through the server SVG→PNG path.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { parse } from "opentype.js";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { criarMedidor, paginaParaSvg, type Familia, type FonteOT, type PacoteProva, type Peso } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarSistema, quebrasPadrao } from "../../supabase/functions/_shared/motor/sistema";
import { ESTILOS } from "../../supabase/functions/_shared/motor/estilos";
import { FICHEIROS_EXTRA } from "@/features/editor-grafico/fontes";

const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ler = (f: string) => parse(ab(readFileSync(`public${f}`))) as unknown as FonteOT;
it.skipIf(!existsSync("/tmp/foto.jpg"))("QA visual da composição de imagem", async () => {
  const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
  for (const [fam, pesos] of Object.entries(FICHEIROS_EXTRA)) for (const [p, f] of Object.entries(pesos ?? {})) (extras[fam as Familia] ??= {})[Number(p) as Peso] = ler(f as string);
  const m = criarMedidor({ 400: ler("/fontes/WorkSans-Regular.ttf"), 700: ler("/fontes/WorkSans-Bold.ttf") }, extras);
  await initWasm(readFileSync("node_modules/@resvg/resvg-wasm/index_bg.wasm"));
  const fontes = ["/fontes/WorkSans-Regular.ttf", "/fontes/WorkSans-Bold.ttf", ...Object.values(FICHEIROS_EXTRA).flatMap((x) => Object.values(x ?? {}) as string[])].map((f) => new Uint8Array(readFileSync(`public${f}`)));
  const foto = readFileSync("/tmp/foto.jpg");
  const asset = { id: "a1", mime: "image/jpeg" as const, largura: 1000, altura: 1500, bytes: foto.length, hash: "h", dados: foto.toString("base64") };
  const S = [
    ["Visibilidade em IA: o que mudou em 2026", "Uma leitura curta para equipas de marketing."],
    ["O contexto", "As equipas começaram a medir a presença da marca nas respostas dos assistentes de IA, comparando semanas e temas para perceber o que mudou."],
    ["62% das PME", "abandonaram uma ferramenta no primeiro ano."],
    ["Antes vs depois", "Por um lado medição manual; por outro, painéis automáticos com alertas."],
    ["O que é visibilidade", "Significa aparecer citado como fonte."],
    ["O caso da cooperativa", "A cooperativa testou um assistente durante três meses e reduziu o tempo de resposta."],
    ["Passos", "- medir\n- comparar\n- decidir"],
    ["Conclusão", "Medir antes de mudar."],
  ];
  const slides = S.map(([titulo, texto], i) => ({ id: `s${i + 1}`, titulo, texto }));
  const comImg = new Set([0, 1, 5, 7]);
  const pag = (i: number) => ({ id: `p${i}`, slide: `s${i + 1}`, fundo: "#ffffff", camadas: [
    ...(comImg.has(i) ? [{ id: `img${i}`, tipo: "imagem", asset_id: "a1", x: 96, y: 800, w: 888, h: 400, z: 1, recorte: "cover" }] : []),
    { id: `t${i}`, tipo: "texto", ref: `s${i + 1}.titulo`, x: 96, y: 200, w: 888, h: 200, z: 2, estilo: { peso: 700, tam: 64, linha: 1.1, alinh: "esq", cor: "#111111", overflow: "cortar" } },
    { id: `b${i}`, tipo: "texto", ref: `s${i + 1}.texto`, x: 96, y: 420, w: 888, h: 300, z: 2, estilo: { peso: 400, tam: 36, linha: 1.4, alinh: "esq", cor: "#333333", overflow: "cortar" } },
    { id: "num", tipo: "texto", texto: `${i + 1}/8`, x: 96, y: 1260, w: 200, h: 40, z: 3, estilo: { peso: 400, tam: 26, linha: 1.2, alinh: "esq", cor: "#666666", overflow: "cortar" } },
  ] });
  const doc = (v: "A" | "B") => ({ v: 1, variante: v, largura: 1080, altura: 1350, fonte: "WorkSans@1", paginas: slides.map((_, i) => pag(i)) });
  const base = { v: 1, id: "qa", nome: "qa", sintetico: true, conteudo: { slides }, assets: { a1: asset }, variantes: { A: doc("A"), B: doc("B") } } as unknown as PacoteProva;
  mkdirSync("/tmp/qa", { recursive: true });
  for (const e of ESTILOS) for (const v of ["A", "B"] as const) {
    const r = aplicarSistema(base, { estilo: e.id, variante: v, paleta: "navy-digital", quebras: quebrasPadrao(8) }, m);
    for (let i = 0; i < 8; i++) writeFileSync(`/tmp/qa/${e.id}-${v}-${i + 1}.png`, new Resvg(paginaParaSvg(r.pacote, v, i, m), { fitTo: { mode: "width", value: 270 }, font: { fontBuffers: fontes, loadSystemFonts: false, defaultFontFamily: "Work Sans" } }).render().asPng());
  }
}, 120_000);
