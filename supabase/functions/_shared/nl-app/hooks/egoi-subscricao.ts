// Recebe da E-goi os cancelamentos feitos fora da aplicação (link nativo do
// email ou remoção manual) e regista-os em `subscricao_eventos`, para o painel
// interno mostrar a realidade completa.
//
// Segurança: o URL tem de trazer `?k=<chave>`, onde a chave é derivada do
// segredo de subscrição. Sem chave válida, o pedido é recusado.

import { createFileRoute } from "../_shim/router.ts";

function extrairEmail(o: unknown): string | null {
  if (!o || typeof o !== "object") return null;
  const procurar = (v: unknown, profundidade = 0): string | null => {
    if (profundidade > 4) return null;
    if (typeof v === "string") return v.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null;
    if (Array.isArray(v)) {
      for (const item of v) { const r = procurar(item, profundidade + 1); if (r) return r; }
      return null;
    }
    if (v && typeof v === "object") {
      for (const [chave, valor] of Object.entries(v)) {
        if (/mail/i.test(chave)) { const r = procurar(valor, profundidade + 1); if (r) return r; }
      }
      for (const valor of Object.values(v)) { const r = procurar(valor, profundidade + 1); if (r) return r; }
    }
    return null;
  };
  return procurar(o);
}

export const Route = createFileRoute("/api/public/hooks/egoi-subscricao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const { chaveWebhookEgoi, registarCancelamentoExterno } = await import("../lib/subscricao.server.ts");
        if (url.searchParams.get("k") !== chaveWebhookEgoi()) {
          return new Response("Não autorizado", { status: 401 });
        }

        const bruto = await request.text().catch(() => "");
        let corpo: unknown = null;
        try { corpo = JSON.parse(bruto); } catch { corpo = Object.fromEntries(new URLSearchParams(bruto)); }

        const email = extrairEmail(corpo);
        if (!email) return new Response("Sem email no payload", { status: 200 });

        const texto = bruto.toLowerCase();
        const cancelou = /unsub|removed|deleted|opt.?out|spam|complaint|bounce/.test(texto);
        if (!cancelou) return new Response("Ignorado", { status: 200 });

        await registarCancelamentoExterno(email, corpo as Record<string, unknown>);
        return new Response("OK", { status: 200 });
      },
    },
  },
});
