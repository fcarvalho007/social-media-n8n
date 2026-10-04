import { linkSubscricao } from "../../nl-publico-config.ts";
// Renderer de email do formato Revista — proposta V4.
// Papel quente, marca em caixa alta, crónica em bloco azul, notícias em foco
// com painel «A minha leitura», radar escuro com chamada para a edição online,
// ferramentas em duas colunas, podcast amarelo, livro e serviços.
// 640px, tabelas, estilos inline, modo escuro por melhoria progressiva.

import type { EdicaoRevista, ServicoRevista } from "./compose.server.ts";
import { R, SANS, BLACK, SERIF, CTA_NOTICIA_PADRAO, ctaRecomendacao } from "./tokens.ts";
import { paragrafosCronica, sequenciaCronica } from "./sequencia-cronica.ts";
import { contagemSeleccao } from "./contagens.ts";
import { ROTULOS_REVISTA } from "./rotulos.ts";
import { paletaFerramenta } from "./cores-ferramenta.ts";

const URL_CANCELAR = linkSubscricao("cancelar");
const ENTIDADE = "Digital Sprint · Frederico Carvalho · Digital FC · Portugal";

export function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function fmtDataLonga(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Data curta em caixa alta: «19 AGO 2026». */
export function fmtDataCurta(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\./g, "")
    .toUpperCase();
}

function href(u: string): string {
  const v = (u || "").trim();
  return v ? esc(v) : "#";
}

/**
 * Marca de origem nos links de Brief enviados por email. O email não executa
 * código, por isso a contagem depende desta marca no endereço.
 */
export function urlBriefEmail(url: string): string {
  const v = (url || "").trim();
  if (!v) return v;
  return v.includes("?") ? `${v}&o=email` : `${v}?o=email`;
}

/** Parágrafos a partir de texto simples com quebras de linha. */
export function paragrafos(txt: string): string[] {
  return paragrafosCronica(txt);
}

const FF = `font-family:${SANS};`;
const ETIQUETA = `font-size:11px;line-height:18px;letter-spacing:1.2px;font-weight:bold;text-transform:uppercase;margin:0;${FF}`;
const CELULA = `${FF}vertical-align:top;`;

/** Botão com área clicável generosa e fallback sólido em Outlook. */
function botao(
  url: string, rotulo: string, fundo: string, cor: string, borda: string, classe = "",
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${FF}border-collapse:collapse;"><tr>
    <td bgcolor="${fundo}" class="${classe}" style="background:${fundo};border:1px solid ${borda};border-radius:4px;mso-padding-alt:13px 18px;${CELULA}">
      <a class="action ${classe}" href="${href(url)}" style="display:inline-block;padding:13px 18px;border-radius:4px;${FF}font-size:14px;line-height:20px;font-weight:bold;text-decoration:none;white-space:normal;overflow-wrap:anywhere;color:${cor};background:${fundo};">${esc(rotulo)} &rarr;</a>
    </td>
  </tr></table>`;
}

function tituloSeccao(numero: string, texto: string, primeiro = false): string {
  const padding = primeiro ? "0 24px 18px" : "30px 24px 0px";
  return `<tr><td class="px" style="padding:${padding};${CELULA}">
    <h2 style="border-top:2px solid ${R.navy};padding-top:18px;font-size:25px;line-height:31px;letter-spacing:-0.4px;margin:0;${FF}">
      <span class="text-link" style="color:${R.azul};font-size:14px;letter-spacing:0;">${esc(numero)} /</span>&nbsp; ${esc(texto)}
    </h2>
  </td></tr>`;
}

export function montarHtmlRevista(e: EdicaoRevista): string {
  const partes: string[] = [];
  const cont = contagemSeleccao(e);
  let n = 0;
  const proximo = () => String(++n).padStart(2, "0");

  /* linha de topo */
  partes.push(`<tr><td class="px" style="padding:22px 24px 0px;${CELULA}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;${FF}border-collapse:collapse;"><tr>
      <td class="header-left-cell" width="74%" style="width:74%;${CELULA}">
        <p class="label text-main" style="${ETIQUETA}color:${R.navy};">Marketing / Tecnologia / Negócio</p>
      </td>
      <td class="header-right-cell" width="26%" style="width:26%;text-align:right;${CELULA}">
        <a href="${href(e.urlPagina)}" class="text-main" style="font-size:14px;line-height:24px;font-weight:bold;color:${R.navy};text-decoration:underline;${FF}">Versão web &#8599;</a>
      </td>
    </tr></table>
  </td></tr>`);

  /* marca */
  partes.push(`<tr><td class="px" style="padding:24px 24px 0;${CELULA}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;${FF}border-collapse:collapse;"><tr>
      <td class="header-left-cell" width="74%" style="width:74%;vertical-align:bottom;">
        <div class="mast text-main" style="font-family:${BLACK};font-size:54px;line-height:51px;letter-spacing:-3px;font-weight:900;color:${R.navy};">DIGITAL<br><span class="text-link" style="color:${R.azul};">SPRINT<span class="text-main" style="color:${R.navy};">.</span></span></div>
      </td>
      <td class="header-right-cell edition-block" width="26%" style="width:26%;vertical-align:bottom;text-align:right;">
        <p class="edition text-main" style="font-family:${SERIF};font-size:30px;line-height:36px;font-style:italic;color:${R.navy};margin:0;">${e.edicao.numero}</p>
        <p class="text-main" style="font-size:10px;line-height:18px;letter-spacing:1px;color:${R.navy};margin:0;${FF}">EDIÇÃO</p>
      </td>
    </tr></table>
  </td></tr>`);

  /* autor + mote */
  partes.push(`<tr><td class="px" style="padding:23px 24px 24px;${CELULA}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid ${R.navy};${FF}border-collapse:collapse;"><tr>
      <td class="header-left-cell" width="61%" style="width:61%;padding-top:14px;${CELULA}">
        <p class="text-main" style="margin:0;${FF}font-size:13px;line-height:21px;color:${R.navy};"><strong>Frederico Carvalho</strong></p>
        <p class="text-muted" style="margin:0;${FF}font-size:13px;line-height:21px;color:${R.textoSec};">Consultor, autor e docente</p>
      </td>
      <td class="header-right-cell" width="39%" style="width:39%;padding-top:14px;text-align:right;${CELULA}">
        <p class="text-muted" style="margin:0;${FF}font-size:13px;line-height:21px;color:${R.textoSec};white-space:nowrap;">${esc(fmtDataLonga(e.edicao.data_envio_prevista))}</p>
      </td>
    </tr></table>
  </td></tr>`);

  if (e.promocao) {
    partes.push(`<tr><td class="px" style="padding:0 24px 22px;${CELULA}">
      <table role="presentation" width="100%" bgcolor="${R.painel}" class="panel-soft" style="width:100%;background:${R.painel};border-left:3px solid ${R.azul};${FF}border-collapse:collapse;"><tr><td style="padding:13px 16px;${CELULA}">
        <p class="text-body" style="margin:0;${FF}font-size:14px;line-height:22px;color:${R.texto};">${e.promocao.prefixo ? `${esc(e.promocao.prefixo)}: ` : ""}<a class="text-link" href="${href(e.promocao.url)}" style="${FF}font-size:14px;line-height:22px;font-weight:bold;color:${R.azul};text-decoration:underline;">${esc(e.promocao.linkTexto)} &rarr;</a></p>
      </td></tr></table>
    </td></tr>`);
  }

  /* crónica */
  partes.push(tituloSeccao(proximo(), ROTULOS_REVISTA.cronica, true));
  partes.push(`<tr><td class="px" bgcolor="${R.azul}" style="padding:25px 24px 25px;background:${R.azul};${CELULA}">
    <h1 class="hero" style="font-family:${SERIF};font-size:34px;line-height:39px;letter-spacing:-1.4px;color:${R.branco};padding-top:0;font-weight:normal;margin:0;">${esc(e.cronica.titulo)}</h1>
    ${e.cronica.subtitulo ? `<p style="font-size:17px;line-height:26px;color:${R.branco};padding-top:18px;margin:0;${FF}">${esc(e.cronica.subtitulo)}</p>` : ""}
  </td></tr>`);

  const pecaLede = () =>
    `<tr><td class="px" style="padding:23px 24px 0px;${CELULA}"><p class="text-body" style="font-size:16px;line-height:26px;color:${R.texto};margin:0;${FF}">${esc(e.cronica.lede)}</p></td></tr>`;

  const pecaParagrafo = (txt: string) =>
    `<tr><td class="px" style="padding:13px 24px 0px;${CELULA}"><p class="text-body" style="font-size:16px;line-height:26px;color:${R.texto};margin:0;${FF}">${esc(txt)}</p></td></tr>`;
  const pecaPullQuote = () => `<tr><td class="px" style="padding:22px 24px 0px;${CELULA}">
      <p class="text-main" style="margin:0;border-left:3px solid ${R.azul};padding-left:18px;font-family:${SERIF};font-size:21px;line-height:31px;color:${R.navy};">${esc(e.pullQuote)}</p>
    </td></tr>`;
  const pecaMomento = () => `<tr><td class="px" style="padding:22px 24px 0px;${CELULA}">
      <table role="presentation" width="100%" bgcolor="${R.painel}" class="panel-soft" style="background:${R.painel};${FF}border-collapse:collapse;"><tr><td style="padding:21px;${CELULA}">
        <p class="label text-link" style="${ETIQUETA}color:${R.azul};">${esc(e.momento?.etiqueta ?? "")}</p>
        <p class="text-main" style="padding-top:8px;font-family:${BLACK};font-size:40px;line-height:44px;font-weight:900;letter-spacing:-2px;color:${R.navy};margin:0;">${esc(e.momento?.valor ?? "")}</p>
        <p class="text-body" style="padding-top:9px;font-size:15px;line-height:25px;color:${R.texto};margin:0;${FF}">${esc(e.momento?.descricao ?? "")}</p>
      </td></tr></table>
    </td></tr>`;
  const pecaImagem = () => {
    const img = e.imagem;
    if (!img) return "";
    return `<tr><td class="px" style="padding:22px 24px 0px;${CELULA}">
      <img src="${href(img.url)}" width="556"${img.recortada ? ' height="200"' : ""} alt="${esc(img.alt)}" style="display:block;width:100%;max-width:556px;height:auto;border:0;outline:none;text-decoration:none;">
    </td></tr>`;
  };
  for (const peca of sequenciaCronica({
    excerto: e.cronica.excerto,
    lede: !!e.cronica.lede,
    ledePos: e.ledePosicao,
    pullQuote: !!e.pullQuote,
    pullQuotePos: e.pullQuotePosicao,
    momento: !!e.momento,
    momentoPos: e.momentoPosicao,
    imagem: !!e.imagem,
    imagemPos: e.imagemPosicao,
  })) {
    if (peca.tipo === "paragrafo") partes.push(pecaParagrafo(peca.texto));
    else if (peca.tipo === "lede") partes.push(pecaLede());
    else if (peca.tipo === "pull_quote") partes.push(pecaPullQuote());
    else if (peca.tipo === "imagem") partes.push(pecaImagem());
    else partes.push(pecaMomento());
  }


  if (e.cronica.url) {
    partes.push(`<tr><td class="px" style="padding:19px 24px 0px;${CELULA}">${botao(e.cronica.url, "Ler a crónica completa", R.azul, R.branco, R.azul)}</td></tr>`);
  }

  /* notícias em foco */
  if (e.destaques.length) {
    partes.push(tituloSeccao(proximo(), ROTULOS_REVISTA.destaques));
    e.destaques.forEach((d, i) => {
      const meta = d.categoriaRotulo;
      if (i > 0) {
        partes.push(`<tr><td class="px" style="padding:0 24px;${CELULA}"><div style="border-top:1px solid ${R.filete};font-size:0;line-height:0;">&nbsp;</div></td></tr>`);
      }
      partes.push(`<tr><td class="px" style="padding:24px 24px 25px;${CELULA}">
        <p class="label text-link" style="${ETIQUETA}color:${R.azul};">${esc(meta)}</p>
        <h3 class="story" style="font-size:25px;line-height:31px;letter-spacing:-0.5px;padding-top:9px;margin:0;${FF}">
          <a class="text-main" href="${href(d.url)}" style="${FF}font-size:25px;line-height:31px;font-weight:bold;color:${R.navy};text-decoration:none;">${esc(d.titulo)}</a>
        </h3>
        ${d.resumoFactual ? `<div style="padding-top:12px;${FF}"><p class="text-body" style="font-size:16px;line-height:26px;color:${R.texto};margin:0;${FF}">${esc(d.resumoFactual)}</p></div>` : ""}
        ${d.minhaLeitura ? `<table role="presentation" width="100%" bgcolor="${R.ferramentaFundo}" class="panel-blue" style="margin-top:14px;background:${R.ferramentaFundo};border-left:3px solid ${R.azul};${FF}border-collapse:collapse;"><tr><td style="padding:15px 17px;${CELULA}">
          <p class="text-main" style="font-family:${SERIF};font-size:16px;line-height:26px;color:${R.navy};margin:0;"><strong class="text-main" style="color:${R.navy};">A minha leitura:</strong> ${esc(d.minhaLeitura)}</p>
        </td></tr></table>` : ""}
        ${d.brief
          ? `<div style="padding-top:17px;${FF}">${botao(urlBriefEmail(d.brief.url), "Ler o Brief", R.fundoCartao, R.azul, R.azul, "paper text-link")}</div>
             ${d.url ? `<div style="padding-top:11px;${FF}"><a class="text-link" href="${href(d.url)}" style="${FF}font-size:13px;line-height:20px;color:${R.azul};text-decoration:underline;">Fonte original &#8599;</a></div>` : ""}`
          : d.url ? `<div style="padding-top:17px;${FF}">${botao(d.url, d.ctaRotulo || CTA_NOTICIA_PADRAO, R.fundoCartao, R.azul, R.azul, "paper text-link")}</div>` : ""}
      </td></tr>`);
    });
  }

  /* radar */
  if (e.radar.length) {
    partes.push(`<tr><td class="px" bgcolor="${R.escuro}" style="padding:25px 24px 18px;background:${R.escuro};${CELULA}">
      <h2 style="font-size:25px;line-height:31px;color:${R.branco};letter-spacing:-0.4px;margin:0;${FF}">
        <span style="font-size:14px;color:${R.amarelo};">${proximo()} /</span>&nbsp; ${ROTULOS_REVISTA.radar}
      </h2>
    </td></tr>`);
    e.radar.forEach((r) => {
      partes.push(`<tr><td class="px" bgcolor="${R.escuro}" style="padding:0px 24px 20px;background:${R.escuro};${CELULA}">
        <table role="presentation" width="100%" style="border-top:1px solid ${R.escuroFilete};${FF}border-collapse:collapse;"><tr>
          <td class="radar-topic" width="116" style="width:116px;padding-top:17px;padding-right:15px;${CELULA}">
            <p class="label" style="${ETIQUETA}color:${R.amarelo};">${esc(r.categoriaRotulo)}</p>
          </td>
          <td class="radar-body" style="padding-top:17px;${CELULA}">
            <h3 style="font-size:17px;line-height:24px;color:${R.branco};margin:0;${FF}">
              <a href="${href(r.brief ? urlBriefEmail(r.brief.url) : r.url)}" style="color:${R.branco};text-decoration:underline;${FF}">${esc(r.titulo)}${r.brief ? "" : " &#8599;"}</a>
            </h3>
            ${r.nota ? `<p style="font-size:14px;line-height:23px;color:${R.escuroTexto};padding-top:6px;margin:0;${FF}">${esc(r.nota)}</p>` : ""}
            ${r.brief && r.url ? `<p style="padding-top:6px;margin:0;${FF}"><a href="${href(r.url)}" style="font-size:13px;line-height:20px;color:${R.amarelo};text-decoration:underline;${FF}">Fonte &#8599;</a></p>` : ""}
          </td>
        </tr></table>
      </td></tr>`);
    });
    partes.push(`<tr><td class="px" bgcolor="${R.escuro}" style="padding:2px 24px 27px;background:${R.escuro};${CELULA}">
      <p style="font-size:15px;line-height:24px;color:${R.branco};padding-bottom:15px;margin:0;${FF}">${esc(cont.intro)}</p>
      ${botao(e.urlPagina, cont.botao, R.amarelo, R.navy, R.amarelo)}
    </td></tr>`);
  }

  /* ferramentas */
  if (e.ferramentas.length) {
    partes.push(tituloSeccao(proximo(), "Ferramentas"));
    const cartao = (f: EdicaoRevista["ferramentas"][number]) => {
      const cor = paletaFerramenta(f.cor);
      return `<div class="tool-col" style="display:inline-block;width:48%;max-width:100%;box-sizing:border-box;vertical-align:top;${FF}">
      <table role="presentation" width="100%" bgcolor="${cor.pastel}" style="border:1px solid ${cor.borda};border-top:4px solid ${cor.solid};background:${cor.pastel};${FF}border-collapse:collapse;"><tr><td style="padding:21px;${CELULA}">
        ${f.etiqueta ? `<p class="label" style="${ETIQUETA}color:${cor.ink};">${esc(f.etiqueta)}</p>` : ""}
        <h3 class="tool-title" style="font-size:21px;line-height:26px;letter-spacing:-0.3px;padding-top:10px;margin:0;${FF}">${esc(f.nome)}</h3>
        ${f.descricao ? `<p class="tool-desc text-body" style="font-size:15px;line-height:24px;color:${R.texto};padding-top:11px;margin:0;${FF}">${esc(f.descricao)}</p>` : ""}
        ${f.url ? `<div style="padding-top:18px;${FF}">${botao(f.url, f.ctaRotulo || `Abrir ${f.nome}`, cor.pastel, cor.ink, cor.solid)}</div>` : ""}
      </td></tr></table>
    </div>`;
    };
    const espaco = `<div class="tool-gap" style="display:inline-block;width:4%;height:16px;font-size:0;line-height:0;vertical-align:top;${FF}">&nbsp;</div>`;
    for (let i = 0; i < e.ferramentas.length; i += 2) {
      const a = e.ferramentas[i];
      const b = e.ferramentas[i + 1];
      partes.push(`<tr><td class="px" style="padding:18px 24px 0px;${CELULA}">
        <div style="font-size:0;line-height:0;text-align:left;${FF}">
          <!--[if mso]><table role="presentation" width="548"><tr><td width="268" valign="top"><![endif]-->
          ${cartao(a)}
          <!--[if mso]></td><td width="12" style="font-size:0;line-height:0">&nbsp;</td><td width="268" valign="top"><![endif]-->
          ${b ? `${espaco}${cartao(b)}` : ""}
          <!--[if mso]></td></tr></table><![endif]-->
        </div>
      </td></tr>`);
    }
  }

  /* podcast */
  if (e.podcast) {
    const pc = e.podcast;
    partes.push(tituloSeccao(proximo(), "Podcast"));
    partes.push(`<tr><td class="px" style="padding:18px 24px 0px;${CELULA}">
      <table role="presentation" width="100%" bgcolor="${R.amarelo}" style="background:${R.amarelo};${FF}border-collapse:collapse;"><tr><td style="padding:27px;${CELULA}">
        <p class="label" style="${ETIQUETA}color:${R.navy};">${esc([pc.etiqueta, pc.programa].filter(Boolean).join(" · "))}</p>
        ${pc.programa ? `<p class="podbrand" style="font-family:${BLACK};font-size:33px;line-height:35px;letter-spacing:-1.7px;font-weight:900;color:${R.navy};padding-top:17px;margin:0;">${esc(pc.programa)}</p>` : ""}
        <div style="border-top:1px solid ${R.amareloFilete};margin-top:23px;padding-top:19px;${FF}">
          <h3 style="${FF}font-size:25px;line-height:31px;letter-spacing:-0.4px;color:${R.navy};margin:0;">${esc(pc.tema)}</h3>
          ${pc.convidado ? `<p style="font-size:16px;line-height:26px;color:${R.navy};padding-top:7px;margin:0;${FF}">${esc(pc.convidado)}</p>` : ""}
          ${pc.pergunta ? `<p style="font-size:16px;line-height:26px;color:${R.navy};padding-top:11px;margin:0;${FF}">${esc(pc.pergunta)}</p>` : ""}
          ${pc.url ? `<div style="padding-top:18px;${FF}">${botao(pc.url, pc.cta, R.navy, R.amarelo, R.navy)}</div>` : ""}
        </div>
      </td></tr></table>
    </td></tr>`);
  }

  /* esta semana recomendo — logo a seguir ao podcast */
  if (e.recomendacao) {
    const rec = e.recomendacao;
    const cabeca = [rec.tipo, rec.meta].filter(Boolean).join(" · ");
    partes.push(tituloSeccao(proximo(), ROTULOS_REVISTA.recomendacao));
    partes.push(`<tr><td class="px" style="padding:18px 24px 0px;${CELULA}">
      <table role="presentation" width="100%" bgcolor="${R.painel}" class="panel-blue" style="background:${R.painel};${FF}border-collapse:collapse;"><tr><td style="padding:24px;${CELULA}">
        ${cabeca ? `<p class="label text-link" style="${ETIQUETA}color:${R.azul};">${esc(cabeca)}</p>` : ""}
        <h3 class="text-main" style="${FF}font-size:22px;line-height:30px;letter-spacing:-0.3px;color:${R.navy};padding-top:${cabeca ? "10px" : "0"};margin:0;">${
          rec.url
            ? `<a class="text-main" href="${href(rec.url)}" style="color:${R.navy};text-decoration:none;${FF}">${esc(rec.titulo)}</a>`
            : esc(rec.titulo)
        }</h3>
        ${rec.nota ? `<p class="text-body" style="font-size:15px;line-height:25px;color:${R.texto};padding-top:9px;margin:0;${FF}">${esc(rec.nota)}</p>` : ""}
        ${rec.url ? `<div style="padding-top:16px;${FF}">${botao(rec.url, ctaRecomendacao(rec.tipo), R.azul, R.branco, R.azul)}</div>` : ""}
      </td></tr></table>
    </td></tr>`);
  }

  /* livro — só quando não entra na grelha 2x2 (snapshots antigos) */
  const grelhaServicos = e.servicos?.cartoes ?? null;
  if (e.livro && !(grelhaServicos ?? []).some((c) => c.tipo === "livro")) {
    const l = e.livro;
    partes.push(`<tr><td class="px" style="padding:28px 24px 0px;${CELULA}">
      <table role="presentation" width="100%" style="border-top:1px solid ${R.filete};border-bottom:1px solid ${R.filete};${FF}border-collapse:collapse;"><tr><td style="padding:22px 0;${CELULA}">
        <p class="text-link" style="font-size:11px;line-height:18px;letter-spacing:1px;font-weight:bold;color:${R.azul};margin:0;${FF}">${esc(l.etiqueta.toUpperCase())}</p>
        <h2 class="text-main" style="font-size:24px;line-height:30px;letter-spacing:-0.4px;color:${R.navy};padding-top:8px;margin:0;${FF}">${esc(l.titulo)}</h2>
        ${l.texto ? `<p class="text-body" style="font-size:15px;line-height:24px;color:${R.texto};padding-top:10px;margin:0;${FF}">${esc(l.texto)}</p>` : ""}
        ${l.url ? `<div style="padding-top:14px;${FF}"><a class="text-link" href="${href(l.url)}" style="font-size:14px;line-height:23px;color:${R.azul};text-decoration:underline;${FF}">${esc(l.cta)} &rarr;</a></div>` : ""}
      </td></tr></table>
    </td></tr>`);
  }

  /* serviços — grelha 2x2 «Como te posso ajudar» */
  if (e.servicos) {
    const s = e.servicos;
    const cartoes = grelhaServicos?.length
      ? grelhaServicos
      : s.linhas.map((li) => ({ ...li, destaque: false, tipo: "servico" as const }));
    const cartaoServico = (c: ServicoRevista) => {
      const cheio = c.destaque === true;
      const fundo = cheio ? R.azulSuave : R.ferramentaFundo;
      const borda = cheio ? R.azulSuave : R.ferramentaBorda;
      const barra = cheio ? `border-left:4px solid ${R.azulSublinhado};` : "";
      return `<div class="offer-col" style="display:inline-block;width:48%;max-width:270px;vertical-align:top;${FF}">
      <table role="presentation" width="100%" bgcolor="${fundo}" class="panel-blue" style="background:${fundo};border:1px solid ${borda};${barra}${FF}border-collapse:collapse;"><tr><td style="padding:17px 16px;${CELULA}">
        <h3 class="text-main" style="font-size:18px;line-height:25px;letter-spacing:-0.3px;font-weight:bold;color:${R.navy};margin:0;${FF}">${esc(c.rotulo)}</h3>
        ${c.texto ? `<p class="text-body" style="font-size:14px;line-height:23px;color:${R.texto};padding-top:7px;margin:0;${FF}">${esc(c.texto)}</p>` : ""}
        ${c.url ? `<a class="text-link" href="${href(c.url)}" style="display:inline-block;padding-top:10px;padding-bottom:3px;font-size:14px;line-height:22px;font-weight:bold;color:${R.azul};text-decoration:underline;${FF}">${esc(c.cta)} &rarr;</a>` : ""}
      </td></tr></table>
    </div>`;
    };
    const espacoOferta = `<div class="offer-gap" style="display:inline-block;width:16px;height:14px;font-size:0;line-height:0;${FF}">&nbsp;</div>`;
    const filas: string[] = [];
    for (let i = 0; i < cartoes.length; i += 2) {
      const a = cartoes[i];
      const b = cartoes[i + 1];
      filas.push(`<div style="font-size:0;line-height:0;text-align:left;${i ? "padding-top:14px;" : ""}${FF}">
        <!--[if mso]><table role="presentation" width="556"><tr><td width="270" valign="top"><![endif]-->
        ${cartaoServico(a)}
        <!--[if mso]></td><td width="16" style="font-size:0;line-height:0">&nbsp;</td><td width="270" valign="top"><![endif]-->
        ${b ? `${espacoOferta}${cartaoServico(b)}` : ""}
        <!--[if mso]></td></tr></table><![endif]-->
      </div>`);
    }
    partes.push(tituloSeccao(proximo(), s.titulo));
    partes.push(`<tr><td class="px" style="padding:18px 24px 0px;${CELULA}">
      ${filas.join("\n")}
    </td></tr>`);
  }

  /* continuar a leitura */
  partes.push(`<tr><td class="px" style="padding:25px 24px 0px;${CELULA}">
    <p class="text-muted" style="font-size:14px;line-height:23px;color:${R.textoSec};margin:0;${FF}">${esc(cont.fecho)} <a class="text-link" href="${href(e.urlPagina)}" style="font-size:14px;line-height:23px;color:${R.azul};text-decoration:underline;${FF}">${esc(cont.fechoElo)}</a>.</p>
  </td></tr>`);

  /* assinatura */
  partes.push(`<tr><td class="px" style="padding:27px 24px 25px;${CELULA}">
    <p style="font-family:${SERIF};font-size:23px;line-height:30px;font-style:italic;margin:0;">Até à próxima leitura,</p>
    <p style="font-size:15px;line-height:25px;padding-top:7px;margin:0;${FF}"><strong>Frederico Carvalho</strong></p>
    <p class="text-body" style="font-size:14px;line-height:23px;padding-top:11px;color:${R.texto};margin:0;${FF}">Que notícia ou ferramenta gostavas de ver analisada?<br>Responde a este email.</p>
  </td></tr>`);

  /* rodapé */
  partes.push(`<tr><td class="px panel-soft" bgcolor="${R.painel}" style="padding:19px 24px 23px;background:${R.painel};${CELULA}">
    <p class="text-muted" style="font-size:11px;line-height:19px;color:${R.textoSec};margin:0;${FF}">
      ${esc(ENTIDADE)}<br>
      Recebes esta newsletter porque subscreveste em fredericocarvalho.pt.<br>
      <a class="text-muted" href="${URL_CANCELAR}" style="color:${R.textoSec};text-decoration:underline;${FF}">Cancelar a subscrição</a>
    </p>
    <p class="text-muted" style="font-size:11px;line-height:19px;color:${R.textoSec};padding-top:11px;margin:0;${FF}">
      Preparada com apoio de IA. Seleção e revisão editorial: Frederico Carvalho.
    </p>
  </td></tr>`);

  const titulo = e.edicao.assunto?.trim() || `Digital Sprint #${e.edicao.numero}`;

  return `<!DOCTYPE html>
<html lang="pt-PT" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<title>${esc(titulo)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,p,a,h1,h2,h3{font-family:Arial,Helvetica,sans-serif !important}.mast{font-size:87px!important;line-height:76px!important;letter-spacing:-6px!important}.px{padding-left:42px!important;padding-right:42px!important}</style>
<![endif]-->
<style>
  body{margin:0;padding:0;width:100%;background:${R.fundoExterior};word-spacing:normal;overflow-wrap:anywhere;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table{border-collapse:collapse;table-layout:auto}
  img{max-width:100%;height:auto}
  p,h1,h2,h3{margin:0}
  a:hover{text-decoration:none}
  @media screen and (min-width:681px){
    .outer{padding:28px 12px!important}
    .px{padding-left:42px!important;padding-right:42px!important}
    .mast{font-size:87px!important;line-height:76px!important;letter-spacing:-6px!important}
    .edition-block{text-align:right!important}
    
    .hero{font-size:45px!important;line-height:49px!important}
    .podbrand{font-size:43px!important;line-height:41px!important}
  }
  @media screen and (max-width:480px){
    /* Colunas duplas (ferramentas e serviços) passam a coluna única — abaixo
       de 681px não há largura útil para dois cartões de 270px lado a lado. */
    .offer-col{width:100%!important;max-width:100%!important}
    .offer-gap{display:block!important;width:100%!important;height:14px!important}
    .tool-col{display:block!important;width:100%!important;max-width:100%!important}
    .tool-gap{display:block!important;width:100%!important;height:16px!important}
  }
  @media screen and (min-width:481px) and (max-width:680px){
    .outer{padding:20px 10px!important}
    .px{padding-left:32px!important;padding-right:32px!important}
    .mast{font-size:64px!important;line-height:58px!important;letter-spacing:-3.6px!important}
    .hero{font-size:38px!important;line-height:43px!important}
  }
  @media screen and (max-width:480px){
    .header-left-cell,.header-right-cell{display:block!important;width:100%!important}
    .header-right-cell{text-align:left!important;padding-top:6px!important}
    .edition-block{padding-top:12px!important}
    .radar-topic{display:block!important;width:auto!important;padding-right:0!important;padding-bottom:5px!important}
    .radar-body{display:block!important;width:auto!important;padding-top:0!important}
    .action{display:block!important;text-align:center!important;white-space:normal!important}
  }
  @media screen and (max-width:360px){
    .outer{padding:12px 0!important}
    .px{padding-left:18px!important;padding-right:18px!important}
    .mast{font-size:46px!important;line-height:44px!important;letter-spacing:-2.4px!important}
    .hero{font-size:29px!important;line-height:34px!important}
    .action{font-size:13px!important;padding-left:14px!important;padding-right:14px!important}
  }

  @media(prefers-color-scheme:dark){
    .canvas{background:#101318!important}
    .paper{background:#20242b!important}
    .panel-soft{background:#282e36!important}
    .panel-blue{background:#283245!important}
    .text-main{color:#f4f4f0!important}
    .text-body{color:#d2d6df!important}
    .text-muted{color:#bdc4d0!important}
    .text-link{color:#8ed4f7!important}
  }
</style>
</head>
<body class="canvas">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  ${esc(e.preheader)}
  &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
</div>
<div role="article" aria-roledescription="email" aria-label="Digital Sprint ${e.edicao.numero}" lang="pt-PT">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${FF}border-collapse:collapse;"><tr><td class="outer" align="center" style="padding:0;${CELULA}">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${R.fundoCartao}" align="center" class="paper text-main" style="max-width:640px;background:${R.fundoCartao};color:${R.navy};${FF}border-collapse:collapse;text-align:left;">
${partes.join("\n")}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</div>
</body>
</html>`;
}
