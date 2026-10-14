import process from "node:process";
import { createFileRoute } from "../_shim/router.ts";

// Rede de segurança da leitura automática de newsletters.
//
// Corre em cron: apanha os emails recebidos nas últimas 72 horas que ficaram
// por processar ou falharam (por exemplo, quando o pedido do webhook morreu a
// meio) e volta a passá-los pelo pipeline, com limite de tentativas.
//
// Auth: `apikey` com a chave publicável do projecto (padrão dos crons).

const JANELA_HORAS = 72;
const MAX_TENTATIVAS = 3;
const MAX_POR_CORRIDA = 5;

async function handler(request: Request): Promise<Response> {
  const chaveEsperada = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  const apikey = request.headers.get("apikey") ?? "";
  if (!chaveEsperada || apikey !== chaveEsperada) {
    return new Response(JSON.stringify({ ok: false, mensagem: "Não autorizado" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  const { supabaseAdmin } = await import("../_shim/admin.ts");
  const { reprocessarEmailGuardado } = await import("../lib/reprocessar-email.server.ts");

  const desde = new Date(Date.now() - JANELA_HORAS * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("nl_emails_recebidos")
    .select("id, assunto, processamento_tentativas")
    .in("processamento_estado", ["por_processar", "falhou", "a_processar"])
    .gte("recebido_em", desde)
    .order("recebido_em", { ascending: true })
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ ok: false, mensagem: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const pendentes = ((data ?? []) as Array<{ id: string; assunto: string | null; processamento_tentativas: number }>)
    .filter((e) => (e.processamento_tentativas ?? 0) < MAX_TENTATIVAS)
    .slice(0, MAX_POR_CORRIDA);

  // Em modo manual, nada vai à IA sozinho: os emails ficam na fila de entrada.
  const { modoManualActivo, enfileirar } = await import("../lib/fila-curadoria.server.ts");
  if (await modoManualActivo(supabaseAdmin as never)) {
    let enfileirados = 0;
    for (const e of pendentes) {
      enfileirados += await enfileirar(supabaseAdmin as never, [{
        origem: "email",
        email_recebido_id: e.id,
        titulo: e.assunto || "Email sem assunto",
      }]);
      await supabaseAdmin.from("nl_emails_recebidos")
        .update({ processamento_estado: "em_fila", processamento_erro: null } as never)
        .eq("id", e.id);
    }
    return new Response(JSON.stringify({ ok: true, modo: "manual", enfileirados }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const resultados: Array<{ id: string; ok: boolean; noticias?: number; erro?: string }> = [];


  for (const e of pendentes) {
    await supabaseAdmin.from("nl_emails_recebidos")
      .update({ processamento_tentativas: (e.processamento_tentativas ?? 0) + 1 } as never)
      .eq("id", e.id);
    try {
      const r = await reprocessarEmailGuardado(supabaseAdmin as never, e.id, "sistema · recuperação", false);
      resultados.push({ id: e.id, ok: true, noticias: r.noticias_inseridas });
    } catch (err) {
      resultados.push({ id: e.id, ok: false, erro: String((err as { message?: string })?.message ?? err).slice(0, 300) });
    }
  }

  if (resultados.length > 0) {
    await supabaseAdmin.from("nl_audit_log").insert({
      quem: "sistema · recuperação",
      accao: `Recuperação de emails por processar — ${resultados.filter((r) => r.ok).length}/${resultados.length} concluídos`,
      detalhe: { resultados },
    });
  }

  return new Response(JSON.stringify({ ok: true, tentados: resultados.length, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/reprocessar-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => handler(request),
    },
  },
});
