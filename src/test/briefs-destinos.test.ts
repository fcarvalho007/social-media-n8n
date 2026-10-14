import { describe, expect, it } from "vitest";
import type { EdicaoRevista } from "../../supabase/functions/_shared/newsletter-engine/revista/compose.server";
import { montarHtmlRevista } from "../../supabase/functions/_shared/newsletter-engine/revista/render-email.server";
import { montarHtmlRevistaWeb } from "../../supabase/functions/_shared/newsletter-engine/revista/render-web.server";
import { montarTextoRevista } from "../../supabase/functions/_shared/newsletter-engine/revista/texto.server";

const fonte = "https://example.org/fonte-destaque";
const radar = "https://example.org/fonte-radar";
const url = "https://example.org/brief/aprovado";
const brief = { briefId: "b", versao: 1, tipo: "destaque" as const, papel: "destaque" as const, ordem: 1, slug: "aprovado", url, tituloEditorial: "Destaque", tituloApresentado: "Destaque", fonteUrl: fonte };
const edicao: EdicaoRevista = {
 edicao: { id: "teste", numero: 319, assunto: "Teste", data_envio_prevista: "2026-10-14", wordpress_post_url: null },
 preheader: "", cronica: { titulo: "Crónica", subtitulo: "", lede: "", excerto: "", url: "" },
 momento: null, pullQuote: "", momentoPosicao: 0, pullQuotePosicao: 0, ledePosicao: 0, imagem: null, imagemPosicao: 0,
 destaques: [{ itemId: "d", noticiaId: "d", titulo: "Destaque", url: fonte, categoria: "ia", categoriaRotulo: "IA", resumoFactual: "Síntese", minhaLeitura: "Leitura aprovada", ctaRotulo: "Ler notícia", data: null, brief }],
 radar: [{ itemId: "r", noticiaId: "r", titulo: "Radar", url: radar, categoria: "ia", categoriaRotulo: "IA", nota: "", brief: { ...brief, slug: "radar-interno", url: "https://example.org/brief/radar-interno", tipo: "radar", papel: "radar" } }],
 recomendacao: null, ferramentas: [], podcast: null, livro: null, servicos: null, atualidades: [], urlPagina: "https://example.org/edicoes/319", problemas: [],
};
describe("destinos editoriais em todos os renderizadores", () => {
 for (const [nome, render] of [["email", montarHtmlRevista], ["web/backup", (e: EdicaoRevista) => montarHtmlRevistaWeb(e).html]] as const) {
  it(`${nome}: título e botão do Destaque abrem o Brief`, () => {
   const doc = new DOMParser().parseFromString(render(edicao), "text/html");
   const links = [...doc.querySelectorAll("a")].filter(a => a.getAttribute("href") === url);
   expect(links).toHaveLength(2);
   expect([...doc.querySelectorAll("a")].some(a => a.getAttribute("href") === fonte)).toBe(true);
  });
  it(`${nome}: Radar liga diretamente à fonte mesmo com associação antiga`, () => {
   const doc = new DOMParser().parseFromString(render(edicao), "text/html");
   expect([...doc.querySelectorAll("a")].find(a => a.textContent === "Radar")?.getAttribute("href")).toBe(radar);
   expect(render(edicao)).not.toContain("/brief/radar-interno");
  });
  it(`${nome}: sem Brief publicado o Destaque usa a fonte`, () => {
   const sem = { ...edicao, destaques: edicao.destaques.map(d => ({ ...d, brief: undefined })) };
   const doc = new DOMParser().parseFromString(render(sem), "text/html");
   expect([...doc.querySelectorAll("a")].find(a => a.textContent === "Destaque")?.getAttribute("href")).toBe(fonte);
  });
 }
 it("texto: mantém Brief e atribuição no Destaque, Radar direto", () => {
  const texto = montarTextoRevista(edicao);
  expect(texto).toContain(url);
  expect(texto).toContain(fonte);
  expect(texto).toContain(radar);
  expect(texto).not.toContain("/brief/radar-interno");
 });
});