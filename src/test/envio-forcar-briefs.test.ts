import { describe, expect, it } from "vitest";
import { pendentesPorNoticia, separarRigidos } from "../newsletter/lib/newsletter-engine/revista/prontidao-rotulos";

const MODULO = "../../supabase/functions/_shared/newsletter-engine/envio.server.ts";
const { filtrarRigidos } = await import(/* @vite-ignore */ MODULO);
const FORCAVEIS = ["briefs", "leituras", "factualidade", "fontes"];

const areas = [
  { chave: "briefs", estado: "bloqueada", severidade: "bloqueio" as const, mensagem: "B",
    itens: [{ noticiaId: "n1", titulo: "Notícia A", motivo: "Ainda não tem Brief.", accao: "gerar_brief" }] },
  { chave: "leituras", estado: "bloqueada", severidade: "bloqueio" as const, mensagem: "L",
    itens: [{ noticiaId: "n1", titulo: "Notícia A", motivo: "A sua leitura ainda não foi aprovada.", accao: "rever_leitura" },
            { noticiaId: "n2", titulo: "Notícia B", motivo: "A sua leitura ainda não foi aprovada.", accao: "rever_leitura" }] },
  { chave: "web", estado: "bloqueada", severidade: "bloqueio" as const, mensagem: "W" },
  { chave: "email", estado: "pronta", mensagem: "ok" },
];

describe("envio com Briefs por resolver", () => {
  it("agrupa os pontos por notícia", () => {
    const g = pendentesPorNoticia(areas);
    expect(g.map((x) => [x.titulo, x.pontos.length])).toEqual([["Notícia A", 2], ["Notícia B", 1]]);
  });
  it("só os bloqueios dos Briefs são ultrapassáveis", () => {
    expect(separarRigidos(areas)).toEqual({ forcaveis: ["B", "L"], fixos: ["W"] });
  });
  it("sem confirmação, os Briefs continuam a travar o envio", () => {
    expect(filtrarRigidos(areas, false, FORCAVEIS).rigidosRestantes).toEqual(["B", "L", "W"]);
  });
  it("com confirmação, os Briefs deixam de travar mas o resto trava", () => {
    expect(filtrarRigidos(areas, true, FORCAVEIS)).toEqual({ forcados: ["B", "L"], rigidosRestantes: ["W"] });
  });
});
