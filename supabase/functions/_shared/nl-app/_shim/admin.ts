// Service-role client for server-only code. Never shipped to the browser.
import process from "node:process";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
