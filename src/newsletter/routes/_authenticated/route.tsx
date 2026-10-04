import { createFileRoute, Outlet, redirect } from "@/newsletter/shim/router";
import { supabase } from "@/integrations/supabase/client";
import { TopNav } from "@/newsletter/features/shared/TopNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <div className="ds-app min-h-dvh w-full overflow-x-clip" style={{ background: "#F7F8FA" }}>
      <TopNav />
      <Outlet />
    </div>
  ),
});
