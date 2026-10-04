import { linkSubscricao } from "../nl-publico-config.ts";
// Versão em texto simples da newsletter (multipart alternative).
//
// Emails só-HTML pontuam mal em quase todos os filtros anti-spam. Este módulo
// gera a alternativa em texto a partir dos MESMOS dados que o HTML, para que
// as duas versões nunca divirjam.

import type { DadosEdicao } from "./gerar-html-newsletter.server.ts";
import { construirPreheader, fmtData, limparTitulo } from "./gerar-html-newsletter.server.ts";
import { CATEGORIAS } from "./design-tokens.server.ts";

function htmlParaTexto(html: string | null | undefined): string {
  if (!html) return "";
  return String(html)
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nomeCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.nome ?? id;
}

export function montarTexto(d: DadosEdicao): string {
  const L: string[] = [];
  const urlPagina = d.edicao.wordpress_post_url?.trim() || "https://digitalsprint.pt";

  L.push(`DIGITAL SPRINT #${d.edicao.numero} — ${fmtData(d.edicao.data_envio_prevista)}`);
  L.push("Curadoria semanal de marketing e tecnologia, por Frederico Carvalho.");
  L.push("");
  L.push(construirPreheader(d));
  L.push("");

  const destaques = d.noticias.filter((n) => n.destaque);
  if (destaques.length) {
    L.push("DESTAQUES");
    L.push("---------");
    destaques.forEach((n, i) => {
      L.push(`${i + 1}. ${limparTitulo(n.titulo)}`);
      if (n.descricao) L.push(`   ${n.descricao.trim()}`);
      if (n.url) L.push(`   ${n.url}`);
      L.push("");
    });
  }

  const restantes = d.noticias.filter((n) => !n.destaque);
  if (restantes.length) {
    const porCat = new Map<string, typeof restantes>();
    for (const n of restantes) {
      const arr = porCat.get(n.categoria) ?? [];
      arr.push(n);
      porCat.set(n.categoria, arr);
    }
    for (const [cat, itens] of porCat) {
      L.push(nomeCategoria(cat).toUpperCase());
      L.push("---------");
      for (const n of itens) {
        L.push(`- ${limparTitulo(n.titulo)}`);
        if (n.descricao) L.push(`  ${n.descricao.trim()}`);
        if (n.url) L.push(`  ${n.url}`);
      }
      L.push("");
    }
  }

  const cronicaTexto = htmlParaTexto(d.cronica?.conteudo_html ?? null) || (d.cronica?.conteudo ?? "").trim();
  if (cronicaTexto) {
    L.push("A CRÓNICA DESTA SEMANA");
    L.push("----------------------");
    if (d.cronica?.titulo?.trim()) L.push(d.cronica.titulo.trim());
    L.push(cronicaTexto);
    L.push("");
    const leituras = htmlParaTexto(d.cronica?.leituras_recomendadas ?? null);
    if (leituras) {
      L.push("Leituras recomendadas:");
      L.push(leituras);
      L.push("");
    }
  }

  if (d.episodio) {
    L.push("PODCAST");
    L.push("-------");
    L.push(`${d.episodio.codigo ? `${d.episodio.codigo} · ` : ""}${d.episodio.titulo}`);
    if (d.episodio.url) L.push(d.episodio.url);
    L.push("");
  }

  const ferramentas = d.ferramentas.filter((f) => f.nome?.trim());
  if (ferramentas.length) {
    L.push("FERRAMENTAS DA SEMANA");
    L.push("---------------------");
    for (const f of ferramentas) {
      L.push(`- ${f.nome?.trim()}`);
      if (f.descricao) L.push(`  ${f.descricao.trim()}`);
      if (f.url) L.push(`  ${f.url}`);
    }
    L.push("");
  }

  L.push(`Ver todas as ${d.totalAprovadas} atualidades desta semana: ${urlPagina}`);
  L.push("");
  L.push("--");
  L.push("Frederico Carvalho");
  L.push("frederico.carvalho@digitalfc.pt");
  L.push("Frederico Carvalho · Digital FC — Portugal");
  L.push("");
  L.push("Recebes esta newsletter porque subscreveste a Digital Sprint em fredericocarvalho.pt.");
  L.push("Gerir a subscrição (pausar ou receber só uma vez por mês): " + linkSubscricao());
  L.push("Cancelar já: " + linkSubscricao("cancelar"));
  L.push("Esta newsletter foi produzida com o apoio de inteligência artificial.");

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
