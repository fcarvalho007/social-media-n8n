// Retired: this Hub never calls the Lovable AI Gateway at runtime. Image generation runs on Fal
// (fal-generate-image) or Kie (kie-imagem). Kept as an explicit refusal so stale clients get a clear error.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ success: false, error: "Este gerador foi desligado. Usa a geração de imagens da Fal ou da Kie." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
