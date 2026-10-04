// Public, read-only delivery of editorial newsletter images from the private bucket.
// Stable URLs for emails, web editions and historical snapshots: /functions/v1/nl-imagem/<path>
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Método não permitido", { status: 405, headers: corsHeaders });
  const { pathname } = new URL(req.url);
  const i = pathname.indexOf("/nl-imagem/");
  const caminho = i >= 0 ? decodeURIComponent(pathname.slice(i + "/nl-imagem/".length)) : "";
  if (!caminho || caminho.length > 300 || caminho.includes("..") || !/^[A-Za-z0-9._\-/]+$/.test(caminho)) {
    return new Response("Pedido inválido", { status: 400, headers: corsHeaders });
  }
  const tipo = TIPOS[caminho.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipo) return new Response("Formato não suportado", { status: 400, headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await admin.storage.from("nl-imagens-edicao").download(caminho);
  if (error || !data) return new Response("Imagem não encontrada", { status: 404, headers: corsHeaders });
  return new Response(req.method === "HEAD" ? null : await data.arrayBuffer(), {
    headers: { ...corsHeaders, "Content-Type": tipo, "Cache-Control": "public, max-age=31536000, immutable" },
  });
});
