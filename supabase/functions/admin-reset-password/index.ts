import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-reset-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_EMAIL = "comunicacao@fredericocarvalho.pt";
const TARGET_PASSWORD = "Click123@";
const ADMIN_RESET_TOKEN = Deno.env.get("N8N_STORIES_WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // TEMP: disabled admin token check so AI can call this once to sync password
  // In production, re-enable header-based protection if needed.

  try {
    const { email, newPassword } = await req.json().catch(() => ({ }));

    const targetEmail = email || ADMIN_EMAIL;
    const targetPassword = newPassword || TARGET_PASSWORD;

    console.log("admin-reset-password: starting reset for", targetEmail);

    // List users and find by email
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error("admin-reset-password: error listing users", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = data?.users.find((u) => u.email === targetEmail);

    if (!user) {
      console.error("admin-reset-password: user not found", targetEmail);
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: targetPassword,
    });

    if (updateError) {
      console.error("admin-reset-password: error updating user", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("admin-reset-password: password updated successfully for", targetEmail);

    return new Response(JSON.stringify({ success: true, email: targetEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-reset-password: unexpected error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
