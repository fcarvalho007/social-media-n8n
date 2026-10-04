// Public, read-only stable endpoint for editorial newsletter images.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const BUCKET = "nl-imagens-edicao";
const TIPOS: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Método não permitido", { status: 405 });
  const u = new URL(req.url);
  const i = u.pathname.indexOf("/nl-imagem/");
  const caminho = i >= 0 ? decodeURIComponent(u.pathname.slice(i + "/nl-imagem/".length)) : "";
  const ext = caminho.split(".").pop()?.toLowerCase() ?? "";
  if (!caminho || caminho.includes("..") || !TIPOS[ext]) return new Response("Pedido inválido", { status: 400 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.storage.from(BUCKET).download(caminho);
  if (error || !data) return new Response("Não encontrado", { status: 404 });
  return new Response(req.method === "HEAD" ? null : data, {
    headers: { "Content-Type": TIPOS[ext], "Cache-Control": "public, max-age=31536000, immutable", "Access-Control-Allow-Origin": "*" },
  });
});
