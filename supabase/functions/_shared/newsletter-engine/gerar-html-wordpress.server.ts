// Gerador de HTML da página WordPress (LearnDash) da edição.
//
// Partilha 1:1 a linguagem visual do email — importa os blocos de
// `gerar-html-newsletter.ts` para que qualquer alteração à identidade se
// propague aos dois canais numa única edição.
//
// Extras específicos da página:
//  · inclui TODAS as notícias aprovadas (news + site);
//  · barra "Navegar pelas secções" com âncoras por categoria;
//  · botão 📋 "Copiar" por notícia (formato "título - url via Digital Sprint").

import {
  BG_PAGINA, BG_CARTAO, INK, INK_SEC, TENUE, TENUE_2, PRIMARIA, SOMBRA,
  esc, limparTitulo, fmtData,
  kicker, cabecalhoCategoria,
  blocoHeader, blocoDestaques, blocoContadores, blocoCronica, blocoPodcast,
  blocoConsultoria, blocoRecursos, blocoFerramentasSemana, blocoPersonalizada,
  carregarDadosEdicao,
  type DadosEdicao,
} from "./gerar-html-newsletter.server";

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
import { normalizarConsultoria } from "./gerar-html-newsletter.server";
import { CATEGORIAS, FONT_CORPO, FONT_TITULO } from "./design-tokens.server";
import { ajustarDescricao } from "./ajustar-descricao.server";



/* ─── helpers ─── */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function extrairResumo(html: string, palavras = 25): string {
  const txt = stripTags(html);
  if (!txt) return "";
  const partes = txt.split(" ");
  const corte = partes.slice(0, palavras).join(" ");
  return partes.length > palavras ? `${corte}…` : corte;
}

function formatarDataTitulo(iso: string | null | undefined): string {
  const dt = iso ? new Date(iso) : new Date();
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${dt.getFullYear()}`;
}

/* ─── blocos específicos do WordPress ─── */

/** Cartão de notícia idêntico ao do email, com ícone 📋 discreto na mesma linha do "Ler no site →". */
function cartaoNoticiaComCopiar(n: DadosEdicao["noticias"][number]): string {
  const tituloLimpo = limparTitulo(n.titulo);
  const url = n.url ?? "";
  const copiarPayload = esc(`${tituloLimpo}${url ? ` - ${url}` : ""} via Digital Sprint`);
  const titulo = esc(tituloLimpo);
  const link = n.url ? esc(n.url) : "";
  const tituloHtml = link
    ? `<a href="${link}" style="color:${INK};text-decoration:none;">${titulo}</a>`
    : titulo;
  const descHtml = n.descricao
    ? `<div style="margin:7px 0 0 0;font-family:${FONT_CORPO};font-size:14.5px;line-height:1.6;color:${INK_SEC};">${esc(ajustarDescricao(n.descricao))}</div>`
    : "";
  const iconeCopiar = `<button type="button" class="ds-copiar" data-copiar="${copiarPayload}" aria-label="Copiar título e link"
        style="background:transparent;border:0;padding:0;margin-left:10px;color:${TENUE};cursor:pointer;font-size:14px;line-height:1;vertical-align:middle;">📋</button>`;
  const lerHtml = link
    ? `<a href="${link}" style="color:${PRIMARIA};font-weight:600;text-decoration:none;">Ler no site →</a><span style="color:${TENUE_2};margin-left:8px;font-size:13px;">${esc(hostname(url))}</span>${iconeCopiar}`
    : `<span style="color:${TENUE_2};font-size:13px;">${iconeCopiar}</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border:0;border-radius:12px;margin-bottom:10px;${SOMBRA}"><tr><td style="padding:18px 20px;border:0;outline:none;">
    <div style="margin:0;font-family:${FONT_TITULO};font-size:17px;font-weight:600;line-height:1.35;color:${INK};">${tituloHtml}</div>
    ${descHtml}
    <div style="margin:12px 0 0 0;font-family:${FONT_CORPO};font-size:13px;">${lerHtml}</div>
  </td></tr></table>`;
}

/** Categorias com âncoras (#categoria-{id}) + cartão-notícia com botão Copiar. */
function blocoCategoriasWp(todas: DadosEdicao["noticias"]): {
  html: string;
  grupos: Array<{ id: string; nome: string; emoji: string; accent: string; total: number }>;
} {
  const grupos = CATEGORIAS
    .map((c) => ({ ...c, itens: todas.filter((n) => !n.destaque && n.categoria === c.id) }))
    .filter((g) => g.itens.length > 0);
  if (grupos.length === 0) return { html: "", grupos: [] };

  const gruposHtml = grupos.map((g, gi) => {
    const itens = g.itens.map(cartaoNoticiaComCopiar).join("");
    return `<tr><td id="categoria-${g.id}" data-cat="${g.id}" style="padding:0 0 ${gi === grupos.length - 1 ? "0" : "18"}px 0;scroll-margin-top:96px;">
      ${cabecalhoCategoria(g)}
      ${itens}
    </td></tr>`;
  }).join("");

  const html = `<tr><td style="padding:10px 4px;">${kicker("📰", "A ATUALIDADE", { subtitulo: "Explora por categoria" })}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${gruposHtml}</table>
  </td></tr>`;

  return {
    html,
    grupos: grupos.map((g) => ({ id: g.id, nome: g.nome, emoji: g.emoji, accent: g.accent, total: g.itens.length })),
  };
}

/** Barra de navegação por âncoras — chips brancos com sombra suave. */
function blocoNavegacao(
  grupos: Array<{ id: string; nome: string; emoji: string; accent: string; total: number }>,
  totalNoticias: number,
  tempoLeitura: number,
): string {
  if (grupos.length === 0) return "";
  const chips = grupos.map((g) =>
    `<a href="#categoria-${g.id}" class="ds-chip"
       style="display:inline-block;background:${BG_CARTAO};border:0;color:${INK};font-family:${FONT_CORPO};padding:8px 14px;border-radius:999px;text-decoration:none;font-size:13px;font-weight:600;margin:0 8px 8px 0;${SOMBRA}">
       <span style="color:${g.accent};">${g.emoji}</span> ${esc(g.nome)} <span style="color:${TENUE};font-weight:500;">(${g.total})</span>
     </a>`
  ).join("");
  const stats = `<p style="margin:0 0 12px 0;font-family:${FONT_CORPO};font-size:12px;color:${TENUE};letter-spacing:0.02em;">
    <strong style="color:${INK_SEC};font-weight:700;">${totalNoticias}</strong> notícias · <strong style="color:${INK_SEC};font-weight:700;">${grupos.length}</strong> categorias · <strong style="color:${INK_SEC};font-weight:700;">${tempoLeitura} min</strong> de leitura
  </p>`;
  const inner = `${kicker("🧭", "NAVEGAR PELAS SECÇÕES")}${stats}${chips}`;
  return `<tr><td class="ds-nav-wrap" style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border-radius:14px;${SOMBRA}">
      <tr><td style="padding:22px 24px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function blocoRodape(edicao: DadosEdicao["edicao"]): string {
  return `<tr><td style="padding:20px 4px 0 4px;text-align:center;font-family:${FONT_CORPO};color:${TENUE};font-size:12px;">
    <p style="margin:0;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:${TENUE_2};">Digital Sprint · #${edicao.numero} · ${esc(fmtData(edicao.data_envio_prevista))}</p>
    <p style="margin:8px 0 0 0;">Por Frederico Carvalho · <a href="https://digitalsprint.pt" style="color:${PRIMARIA};text-decoration:none;">digitalsprint.pt</a></p>
  </td></tr>`;
}

/* ─── entrada principal ─── */

export interface HtmlWordpress {
  html: string;
  resumoTexto: string;
  tituloLesson: string;
}

export async function gerarHtmlWordpress(edicaoId: string): Promise<HtmlWordpress> {
  const d = await carregarDadosEdicao(edicaoId, { incluirDestinoSite: true });
  console.log("[wp] episodio:", d.episodio?.titulo ?? "(sem episódio)", "url:", d.episodio?.url ?? "(sem url)");
  const destaques = d.noticias.filter((n) => n.destaque);
  const naNews = d.noticias;
  const tituloLesson = `Newsletter Digital Sprint - ${formatarDataTitulo(d.edicao.data_envio_prevista)}`;

  const { html: catsHtml, grupos } = blocoCategoriasWp(naNews);
  const totalNoticias = naNews.length;
  const tempoLeitura = Math.max(4, Math.round(totalNoticias * 0.6));

  const temCronica = !!(d.cronica && (d.cronica.conteudo_html?.trim() || d.cronica.conteudo?.trim()));

  // Ordem UX-web: navegação (índice) logo a seguir ao header — acima do fold.
  // Divergente do email de propósito: numa página, o índice pertence ao topo.
  const partes: string[] = [
    blocoHeader(d.edicao),
    blocoNavegacao(grupos, totalNoticias, tempoLeitura),
    blocoDestaques(destaques),
    blocoContadores(totalNoticias, totalNoticias, d.edicao.wordpress_post_url?.trim() || "https://digitalsprint.pt"),
    blocoCronica(d.cronica),
    temCronica ? blocoConsultoria(normalizarConsultoria(d.edicao.bloco_consultoria)) : "",
    blocoPodcast(d.episodio),
    catsHtml,
    blocoFerramentasSemana(d.ferramentas),
    blocoRecursos(),
  ];

  // Secções personalizadas definidas pelo editor.
  for (const s of d.seccoes) {
    if (s.tipo === "personalizada") partes.push(blocoPersonalizada(s));
  }

  partes.push(blocoRodape(d.edicao));

  const scriptCopiar = `
<script>
(function(){
  document.querySelectorAll('.ds-copiar').forEach(function(btn){
    btn.addEventListener('click', function(){
      var txt = btn.getAttribute('data-copiar') || '';
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(txt).then(function(){
        var o = btn.textContent;
        btn.textContent = '✓';
        btn.style.color = '${INK}';
        setTimeout(function(){ btn.textContent = o; btn.style.color = '${TENUE}'; }, 1500);
      }).catch(function(){});
    });
  });
  // Scrollspy — marca o chip da categoria visível.
  var cats = document.querySelectorAll('[data-cat]');
  var chips = {};
  document.querySelectorAll('.ds-chip').forEach(function(a){
    var href = a.getAttribute('href') || '';
    var id = href.replace('#categoria-', '');
    if (id) chips[id] = a;
  });
  if (cats.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        var id = e.target.getAttribute('data-cat');
        var chip = id && chips[id];
        if (!chip) return;
        if (e.isIntersecting) {
          chip.style.background = '${PRIMARIA}';
          chip.style.color = '#FFFFFF';
        } else {
          chip.style.background = '${BG_CARTAO}';
          chip.style.color = '${INK}';
        }
      });
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
    cats.forEach(function(c){ io.observe(c); });
  }
  // Botão "voltar ao topo".
  var top = document.createElement('button');
  top.type = 'button';
  top.className = 'ds-voltar-topo';
  top.setAttribute('aria-label', 'Voltar ao topo');
  top.innerHTML = '↑';
  top.style.cssText = 'position:fixed;right:20px;bottom:20px;width:44px;height:44px;border-radius:999px;border:none;background:${PRIMARIA};color:#FFFFFF;font-size:20px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px -4px rgba(15,23,42,0.28);opacity:0;pointer-events:none;transition:opacity 0.2s ease;z-index:50;';
  document.body.appendChild(top);
  top.addEventListener('click', function(){ window.scrollTo({ top:0, behavior:'smooth' }); });
  window.addEventListener('scroll', function(){
    if (window.scrollY > 400) { top.style.opacity = '1'; top.style.pointerEvents = 'auto'; }
    else { top.style.opacity = '0'; top.style.pointerEvents = 'none'; }
  }, { passive: true });
})();
</script>`;

  const estilos = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.ds-newsletter-wp { background:${BG_PAGINA}; padding:28px 12px; }
.ds-newsletter-wp * { box-sizing:border-box; }
.ds-newsletter-wp a { transition:opacity 0.15s ease; }
.ds-newsletter-wp a:hover { opacity:0.8; }
.ds-newsletter-wp .ds-chip { transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease; }
.ds-newsletter-wp .ds-chip:hover { box-shadow:0 4px 12px rgba(15,23,42,0.12) !important; transform: translateY(-1px); }
.ds-newsletter-wp .ds-copiar:hover { color:${INK} !important; }
.ds-newsletter-wp .ds-nav-wrap { position: sticky; top: 0; z-index: 20; background:${BG_PAGINA}; }
@media (max-width: 640px) {
  .ds-newsletter-wp .ds-nav-wrap { position: static; }
}
html { scroll-behavior:smooth; }
</style>`;

  const corpo = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_PAGINA};"><tr><td align="center" style="padding:0;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;">
${partes.filter(Boolean).join("\n")}
</table>
</td></tr></table>`;

  const html = `${estilos}\n<div class="ds-newsletter-wp">\n${corpo}\n</div>\n${scriptCopiar}`;
  const resumoTexto = extrairResumo(
    (d.cronica?.conteudo_html?.trim() || d.cronica?.conteudo?.trim() || ""),
    25,
  );
  return { html, resumoTexto, tituloLesson };
}
