// Versão em texto simples do formato Revista (multipart do envio E-goi).

import type { EdicaoRevista } from "./compose.server";
import { fmtDataLonga, urlBriefEmail } from "./render-email.server";
import { sequenciaCronica } from "./sequencia-cronica";
import { ctaRecomendacao } from "./tokens";
import { contagemSeleccao } from "./contagens";

export function montarTextoRevista(e: EdicaoRevista): string {
  const L: string[] = [];
  const cont = contagemSeleccao(e);
  L.push(`DIGITAL SPRINT — EDIÇÃO ${e.edicao.numero} — ${fmtDataLonga(e.edicao.data_envio_prevista)}`);
  L.push(`Ver no browser: ${e.urlPagina}`);
  L.push("");

  if (e.promocao) {
    L.push(`${e.promocao.prefixo ? `${e.promocao.prefixo}: ` : ""}${e.promocao.linkTexto} — ${e.promocao.url}`);
    L.push("");
  }

  const tit = [e.cronica.titulo, e.cronica.subtitulo].filter(Boolean).join(" ");
  if (tit) L.push(tit.toUpperCase());
  for (const peca of sequenciaCronica({
    excerto: e.cronica.excerto,
    lede: !!e.cronica.lede,
    ledePos: e.ledePosicao,
    pullQuote: !!e.pullQuote,
    pullQuotePos: e.pullQuotePosicao,
    momento: !!e.momento,
    momentoPos: e.momentoPosicao,
  })) {
    if (peca.tipo === "lede") { L.push(""); L.push(e.cronica.lede); }
    else if (peca.tipo === "paragrafo") { L.push(""); L.push(peca.texto); }
    else if (peca.tipo === "momento" && e.momento) {
      L.push("");
      L.push(`${e.momento.etiqueta.toUpperCase()}: ${e.momento.valor}`);
      if (e.momento.descricao) L.push(e.momento.descricao);
    } else if (peca.tipo === "pull_quote") { L.push(""); L.push(`«${e.pullQuote}»`); }
  }
  if (e.cronica.url) { L.push(""); L.push(`Ler a crónica completa: ${e.cronica.url}`); }

  if (e.destaques.length) {
    L.push(""); L.push("──────────"); L.push("TRÊS COISAS QUE NÃO IGNORARIA"); L.push("");
    for (const d of e.destaques) {
      L.push(d.titulo);
      if (d.resumoFactual) L.push(d.resumoFactual);
      if (d.minhaLeitura) L.push(`A minha leitura: ${d.minhaLeitura}`);
      if (d.brief) L.push(`Ler o Brief: ${urlBriefEmail(d.brief.url)}`);
      if (d.url) L.push(d.brief ? `Fonte original: ${d.url}` : d.url);
      L.push("");
    }
  }

  if (e.radar.length) {
    L.push("──────────"); L.push("RADAR"); L.push("Cinco leituras rápidas, sem comentário."); L.push("");
    for (const r of e.radar) {
      const ligacao = r.brief
        ? `${urlBriefEmail(r.brief.url)}${r.url ? `\nFonte: ${r.url}` : ""}`
        : r.url;
      L.push(`${r.categoriaRotulo.toUpperCase()} — ${r.titulo}${r.nota ? `\n${r.nota}` : ""}\n${ligacao}`);
    }
    L.push("");
    L.push(`${cont.botao}: ${e.urlPagina}`);
  }

  if (e.recomendacao) {
    const r = e.recomendacao;
    L.push(""); L.push("──────────");
    L.push(["ESTA SEMANA RECOMENDO", r.tipo, r.meta].filter(Boolean).join(" · ").toUpperCase());
    L.push(r.titulo);
    if (r.nota) L.push(r.nota);
    if (r.url) L.push(`${ctaRecomendacao(r.tipo)}: ${r.url}`);
  }

  if (e.ferramentas.length) {
    L.push(""); L.push("──────────"); L.push("FERRAMENTAS"); L.push("");
    for (const f of e.ferramentas) L.push(`${f.nome}${f.descricao ? ` — ${f.descricao}` : ""}\n${f.url}`);
  }

  if (e.podcast) {
    const pc = e.podcast;
    L.push(""); L.push("──────────");
    L.push([pc.etiqueta, pc.programa].filter(Boolean).join(" · ").toUpperCase());
    L.push(pc.tema);
    if (pc.convidado) L.push(pc.convidado);
    if (pc.pergunta) L.push(pc.pergunta);
    if (pc.url) L.push(`${pc.cta}: ${pc.url}`);
  }

  const grelhaServicos = e.servicos?.cartoes ?? null;
  if (e.livro && !(grelhaServicos ?? []).some((c) => c.tipo === "livro")) {
    const l = e.livro;
    L.push(""); L.push("──────────");
    L.push(l.etiqueta.toUpperCase());
    L.push(l.titulo);
    if (l.texto) L.push(l.texto);
    if (l.url) L.push(`${l.cta}: ${l.url}`);
  }

  if (e.servicos) {
    const s = e.servicos;
    L.push(""); L.push("──────────");
    L.push(s.titulo.toUpperCase());
    if (s.intro) L.push(s.intro);
    if (s.url) L.push(`${s.cta}: ${s.url}`);
    for (const li of (grelhaServicos?.length ? grelhaServicos : s.linhas)) {
      L.push("");
      L.push(`${li.rotulo}${li.texto ? ` · ${li.texto}` : ""}`);
      if (li.url) L.push(`${li.cta}: ${li.url}`);
    }
  }

  L.push(""); L.push("──────────");
  L.push(`${cont.fecho} ${cont.fechoElo}: ${e.urlPagina}`);
  L.push("");
  L.push("Frederico Carvalho");
  L.push("Responde a este email. Leio todas as respostas.");
  L.push("");
  L.push("Recebes a Digital Sprint porque subscreveste em fredericocarvalho.pt.");
  L.push("Gerir a subscrição: https://edicoes.digitalsprint.pt/subscricao?e={!email:URLENCODE}");
  L.push("Cancelar a subscrição: https://edicoes.digitalsprint.pt/subscricao?a=cancelar&e={!email:URLENCODE}");
  L.push("Frederico Carvalho · Digital FC — Portugal");
  L.push("Esta edição foi preparada com apoio de ferramentas de inteligência artificial e revista por Frederico Carvalho.");
  return L.join("\n");
}
