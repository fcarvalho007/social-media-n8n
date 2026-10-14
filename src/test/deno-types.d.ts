// Type-only bridge for unit tests importing the Deno persistence adapter.
// Edge entrypoints are separately checked by the real Deno/npm resolver.
declare module "npm:@supabase/supabase-js@2.57.4" {
  export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient;
}
