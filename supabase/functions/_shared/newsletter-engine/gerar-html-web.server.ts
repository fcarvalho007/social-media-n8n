import process from "node:process";
// Despachante da versão web da edição.
// Clássico → gerador existente. Revista → renderer web da Revista,
// que inclui a área completa «Todas as atualidades desta edição».

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { gerarHtmlWordpress, type HtmlWordpress } from "./gerar-html-wordpress.server.ts";
import { composeRevistaEdition } from "./revista/compose.server.ts";
import { montarHtmlRevistaWeb } from "./revista/render-web.server.ts";

async function versaoTemplate(edicaoId: string): Promise<string> {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await sb.from("nl_edicoes").select("template_version").eq("id", edicaoId).maybeSingle();
  return (data as { template_version?: string } | null)?.template_version ?? "classic";
}

export async function gerarHtmlEdicaoWeb(edicaoId: string): Promise<HtmlWordpress> {
  if ((await versaoTemplate(edicaoId)) === "revista") {
    const estrutura = await composeRevistaEdition(edicaoId);
    return montarHtmlRevistaWeb(estrutura);
  }
  return gerarHtmlWordpress(edicaoId);
}
