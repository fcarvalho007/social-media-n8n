import type { PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

export interface AvaliacaoSequencia {
  paginas: Array<{ n: number; imagem: boolean; forte: boolean; palavras: number; denso: boolean }>;
  avisos: string[];
}
const DENSO = 70;

/** Pure sequence check: never suggests an "ideal" number of slides. */
export function avaliarSequencia(p: PacoteProva, v: Variante): AvaliacaoSequencia {
  const doc = p.variantes[v];
  const quebras = doc.sistema?.quebras ?? {};
  const paginas = doc.paginas.map((pg, i) => {
    const palavras = pg.camadas.reduce((n, c) => {
      if (c.tipo !== "texto") return n;
      const [sid, campo] = (c.ref ?? "").split(".");
      const sl = p.conteudo.slides.find((x) => x.id === sid);
      const t = c.ref && sl ? (campo === "titulo" ? sl.titulo : sl.texto) : c.texto ?? "";
      return n + t.split(/\s+/).filter(Boolean).length;
    }, 0);
    return { n: i + 1, imagem: pg.camadas.some((c) => c.tipo === "imagem"), forte: i === 0 || !!quebras[String(i + 1)], palavras, denso: palavras > DENSO };
  });
  const avisos: string[] = [];
  let seguidas = 1;
  for (let i = 1; i < paginas.length; i++) {
    seguidas = paginas[i].imagem === paginas[i - 1].imagem && !paginas[i].forte ? seguidas + 1 : 1;
    if (seguidas === 4) avisos.push(`Slides ${i - 2}–${i + 1}: quatro páginas seguidas iguais (${paginas[i].imagem ? "com imagem" : "só texto"}).`);
  }
  const fortes = paginas.filter((x) => x.forte).length;
  if (paginas.length > 2 && fortes / paginas.length > 0.5) avisos.push(`${fortes} de ${paginas.length} páginas são fortes: o destaque perde efeito.`);
  const densas = paginas.filter((x) => x.denso).map((x) => x.n);
  if (densas.length) avisos.push(`Texto denso no(s) slide(s) ${densas.join(", ")}.`);
  return { paginas, avisos };
}
