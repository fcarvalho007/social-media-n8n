// Getlate owns social schedules. The old cron also sent them through n8n,
// creating a second publication after the provider had already accepted one.
// Do not reactivate this transport; Hub jobs and E-goi use their own workers.
Deno.serve((req: Request) =>
  new Response(
    req.method === "OPTIONS" ? null : JSON.stringify({
      success: false,
      error:
        "Agendador social legado desativado. Os agendamentos aceites são executados pelo fornecedor; consulta o calendário antes de repetir.",
    }),
    {
      status: req.method === "OPTIONS" ? 204 : 410,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Content-Type": "application/json",
      },
    },
  )
);
