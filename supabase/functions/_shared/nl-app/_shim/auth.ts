// Replacement for the origin auth middleware: user-scoped client (RLS) + verified claims.
import process from "node:process";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { createMiddleware, getRequest } from "./start.ts";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const auth = getRequest()?.headers.get("authorization");
  if (!auth) throw new Error("Unauthorized: No authorization header provided");
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(auth.replace(/^Bearer\s+/i, ""));
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: invalid token");
  return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
});
