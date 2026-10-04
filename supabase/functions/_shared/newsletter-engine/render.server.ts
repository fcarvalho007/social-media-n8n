// Despacho por versão de template.
// `classic` mantém exactamente o motor anterior; `revista` usa o composer e o
// renderer próprios. Nenhum código do sistema clássico é alterado.

import { createClient } from "@supabase/supabase-js";
import { gerarHtmlNewsletter } from "./gerar-html-newsletter.server";
import { montarTexto } from "./gerar-texto-newsletter.server";
import { composeRevistaEdition, lerSnapshotRevista } from "./revista/compose.server";
import { montarHtmlRevista } from "./revista/render-email.server";
import { montarTextoRevista } from "./revista/texto.server";

export type VersaoTemplate = "classic" | "revista";

export async function lerVersaoTemplate(edicaoId: string): Promise<VersaoTemplate> {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await sb.from("edicoes").select("template_version").eq("id", edicaoId).maybeSingle();
  const v = (data as { template_version?: string } | null)?.template_version;
  return v === "revista" ? "revista" : "classic";
}

/** HTML + texto simples da edição, no formato correspondente à sua versão. */
export async function renderEdicaoEmail(edicaoId: string): Promise<{
  versao: VersaoTemplate; html: string; plainText: string; problemas: string[];
}> {
  const versao = await lerVersaoTemplate(edicaoId);
  if (versao === "revista") {
    // Se já existe fotografia com artefacto preservado, é ela que sai — o
    // reenvio é rigorosamente igual ao que foi enviado da primeira vez.
    const env = await lerSnapshotRevista(edicaoId);
    if (env?.email_html) {
      return { versao, html: env.email_html, plainText: env.email_text, problemas: [] };
    }
    const estrutura = await composeRevistaEdition(edicaoId);
    return {
      versao,
      html: montarHtmlRevista(estrutura),
      plainText: montarTextoRevista(estrutura),
      problemas: estrutura.problemas,
    };
  }
  const { html, dados } = await gerarHtmlNewsletter(edicaoId);
  return { versao, html, plainText: montarTexto(dados), problemas: [] };
}

