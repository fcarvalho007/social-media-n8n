import { describe, expect, it } from "vitest";
import { avaliarPublicacao, briefIndexavel, briefPublicavel, briefAutorizadoNaWeb } from "@/newsletter/lib/newsletter-engine/revista/regras-publicacao";

const completo = { estado: "publicado", tipo: "destaque", resumo: 2, implicacoes: 2, leitura: "Leitura aprovada", fonte: "https://example.org/noticia" };
describe("publicação independente dos Briefs", () => {
  it("a edição web pública abre antes do envio sem contar como enviada", () => {
    expect(avaliarPublicacao({ estado: "rascunho", snapshotEstado: "bloqueado", temSnapshot: true, destinoWeb: "publica" })).toEqual({ publica: true, enviada: false });
  });
  it("um Brief publicado completo é público", () => expect(briefPublicavel(completo)).toBe(true));
  it.each(["por_gerar", "gerado", "por_rever", "aprovado", "erro"])("%s nunca fica público", (estado) => expect(briefPublicavel({ ...completo, estado })).toBe(false));
  it("a leitura aprovada é obrigatória no Destaque", () => expect(briefPublicavel({ ...completo, leitura: "" })).toBe(false));
  it("um resumo vazio não fica público", () => expect(briefPublicavel({ ...completo, resumo: 0 })).toBe(false));
  it("implicações em falta não ficam públicas", () => expect(briefPublicavel({ ...completo, implicacoes: 0 })).toBe(false));
  it("a fonte original é obrigatória", () => expect(briefPublicavel({ ...completo, fonte: "" })).toBe(false));
  it("os Destaques de uma edição não enviada não indexam", () => expect(briefIndexavel({ tipo: "destaque", indexavel: true, enviada: false })).toBe(false));
  it("o Radar não indexa mesmo após envio", () => expect(briefIndexavel({ tipo: "radar", indexavel: true, enviada: true })).toBe(false));
});
describe("Briefs autorizados na publicação web de teste", () => {
 const destaques = ["iberia", "wikipedia", "booktok"].map((slug,i)=>({ noticiaId: String(i), brief: {slug} }));
 it.each(destaques)("abre cada um dos três links congelados", d => expect(briefAutorizadoNaWeb({enviada:false,noticiaId:d.noticiaId,slug:d.brief.slug,destaques})).toBe(true));
 it("não expõe outra notícia ou slug",()=>expect(briefAutorizadoNaWeb({enviada:false,noticiaId:"9",slug:"rascunho",destaques})).toBe(false));
 it("não expõe um Brief desligado da publicação",()=>expect(briefAutorizadoNaWeb({enviada:false,noticiaId:"0",slug:"outro",destaques})).toBe(false));
 it("não basta ter edição web sem links autorizados",()=>expect(briefAutorizadoNaWeb({enviada:false,noticiaId:"0",slug:"iberia",destaques:[]})).toBe(false));
 it("um quarto destaque não ganha acesso público de teste",()=>expect(briefAutorizadoNaWeb({enviada:false,noticiaId:"3",slug:"quarto",destaques:[...destaques,{noticiaId:"3",brief:{slug:"quarto"}}]})).toBe(false));
 it("outro rascunho não fica público",()=>expect(avaliarPublicacao({estado:"rascunho",snapshotEstado:"bloqueado",temSnapshot:true,destinoWeb:"rascunho"})).toEqual({publica:false,enviada:false}));
});

import { conteudoRevistoAlterado } from "@/newsletter/lib/newsletter-engine/revista/brief/estados";
describe("aprovação do conteúdo revisto",()=>{
 const actual={leitura_aprovada:"Leitura literal.",em_30_segundos:[{texto:"Síntese factual."}],porque_interessa:[{rotulo:"Impacto",texto:"Consequência."}],fonte_url:"https://example.org/fonte"};
 it("não revoga uma leitura guardada sem alterações",()=>expect(conteudoRevistoAlterado(actual,{...actual})).toBe(false));
 it.each(["leitura_aprovada","em_30_segundos","porque_interessa","fonte_url"])("exige nova aprovação quando %s muda",k=>expect(conteudoRevistoAlterado(actual,{[k]:"alterado"})).toBe(true));
 it("uma alteração literal não é ocultada por trim",()=>expect(conteudoRevistoAlterado(actual,{leitura_aprovada:"Leitura literal. "})).toBe(true));
});
