// Public, anonymous API of the newsletter. Only explicitly published reads and token-signed
// subscription actions; nothing else from the private newsletter is reachable here.
//   GET  /edicoes                 sent editions (archive)
//   GET  /edicoes/:numero         sent edition page (unsent -> 404)
//   GET  /brief/:slug             brief of a sent edition (unpublished -> 404)
//   GET  /sitemap.xml
//   POST /subscricao/estado       { t }                   signed token required
//   POST /subscricao/accao        { t, accao, motivo? }   signed token required
//   POST /unsubscribe?t=          RFC 8058 one-click, signed token required
//   GET  /unsubscribe?t=          redirect to the management page
import { basePublica } from "../_shared/nl-publico-config.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200, cache = "no-store") =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": cache } });

const ACCOES = new Set(["cancelar", "pausar", "mensal", "reverter"]);
const tokenValido = (t: unknown): t is string => typeof t === "string" && t.length > 20 && t.length < 600 && /^[A-Za-z0-9_\-.]+$/.test(t);

async function edicoes() {
  const { listarEdicoesPublicas } = await import("../_shared/newsletter-engine/revista/publicacao.server.ts");
  return listarEdicoesPublicas();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);
  const i = partes.indexOf("nl-publico");
  const [a, b, c] = i >= 0 ? partes.slice(i + 1) : partes;

  try {
    if (req.method === "GET" && a === "edicoes" && !b) return json(await edicoes(), 200, "public, max-age=300");

    if (req.method === "GET" && a === "edicoes" && b) {
      const numero = Number(b);
      if (!Number.isInteger(numero) || numero <= 0 || numero > 100000) return json({ error: "Edição inválida" }, 400);
      const { obterPaginaEdicaoPublica } = await import("../_shared/newsletter-engine/revista/publicacao.server.ts");
      const p = await obterPaginaEdicaoPublica(numero);
      // Published-only: an edition that was not sent is never exposed publicly.
      if (!p || p.enviada !== true) return json({ error: "Não encontrada" }, 404);
      return json(p, 200, "public, max-age=300");
    }

    if (req.method === "GET" && a === "brief" && b) {
      const slug = b.toLowerCase();
      if (!/^[a-z0-9-]{1,160}$/.test(slug)) return json({ error: "Endereço inválido" }, 400);
      const { briefsActivos } = await import("../_shared/newsletter-engine/revista/brief/modelo.server.ts");
      if (!(await briefsActivos())) return json({ error: "Não encontrado" }, 404);
      const { obterBriefPublico } = await import("../_shared/newsletter-engine/revista/brief/publico.server.ts");
      const brief = await obterBriefPublico(slug);
      if (!brief || brief.enviada !== true) return json({ error: "Não encontrado" }, 404);
      return json(brief, 200, "public, max-age=300");
    }

    if (req.method === "GET" && a === "sitemap.xml") {
      const base = basePublica();
      if (!base) return new Response("Endereço público por configurar", { status: 503, headers: cors });
      const lista = await edicoes();
      const { briefsActivos } = await import("../_shared/newsletter-engine/revista/brief/modelo.server.ts");
      let briefs: Array<{ slug: string }> = [];
      if (await briefsActivos()) {
        const { listarBriefsIndexaveis } = await import("../_shared/newsletter-engine/revista/brief/publico.server.ts");
        briefs = await listarBriefsIndexaveis();
      }
      const locs = [`${base}/edicoes`, ...lista.map((e) => `${base}/edicoes/${e.numero}`), ...briefs.map((x) => `${base}/brief/${x.slug}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map((l) => `  <url><loc>${l}</loc></url>`).join("\n")}\n</urlset>`;
      return new Response(xml, { headers: { ...cors, "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
    }

    if (a === "subscricao" && req.method === "POST") {
      const corpo = await req.json().catch(() => null) as { t?: unknown; accao?: unknown; motivo?: unknown } | null;
      if (!tokenValido(corpo?.t)) return json({ ok: false, mensagem: "Ligação inválida ou incompleta." }, 400);
      const sub = await import("../_shared/nl-app/lib/subscricao.server.ts");
      if (b === "estado") return json(await sub.estadoSubscricao(corpo!.t as string));
      if (b === "accao") {
        const accao = String(corpo?.accao ?? "");
        if (!ACCOES.has(accao)) return json({ ok: false, mensagem: "Acção inválida." }, 400);
        const motivo = typeof corpo?.motivo === "string" ? corpo.motivo.slice(0, 500) : null;
        return json(await sub.aplicarAccao({ token: corpo!.t as string, email: null, accao: accao as "cancelar", motivo, origem: "pagina" }));
      }
      return json({ error: "Desconhecido" }, 404);
    }

    if (a === "unsubscribe") {
      let t = url.searchParams.get("t");
      if (req.method === "GET") {
        const base = basePublica();
        if (!base) return new Response("Endereço público por configurar", { status: 503 });
        const destino = new URL(`${base}/subscricao`);
        if (tokenValido(t)) destino.searchParams.set("t", t);
        destino.searchParams.set("a", "cancelar");
        return new Response(null, { status: 302, headers: { Location: destino.toString() } });
      }
      if (req.method === "POST") {
        if (!tokenValido(t)) {
          const p = new URLSearchParams(await req.text().catch(() => ""));
          t = p.get("t");
        }
        // Signed token only: an e-mail address alone never cancels a subscription.
        if (!tokenValido(t)) return new Response("Pedido inválido", { status: 400 });
        const { aplicarAccao } = await import("../_shared/nl-app/lib/subscricao.server.ts");
        const r = await aplicarAccao({ token: t, email: null, accao: "cancelar", motivo: "Cancelamento de um clique no cliente de email", origem: "um_clique" });
        return new Response(r.ok ? "OK" : "Pedido inválido", { status: r.ok ? 200 : 400 });
      }
    }

    return json({ error: "Desconhecido" }, 404);
  } catch (e) {
    console.error("[nl-publico] erro:", (e as Error).message);
    return json({ error: "Erro interno" }, 500);
  }
});
