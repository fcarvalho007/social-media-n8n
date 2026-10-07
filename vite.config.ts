import { roteirosLocal } from "./scripts/roteiros/local-plugin";
import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), ...(mode === "roteiros" ? [roteirosLocal()] : []), ...(mode === "offline" ? [{
    name: "offline-preview-entry",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        // Keep the isolated entry even after a React Router navigation/reload.
        if (req.headers.accept?.includes("text/html") && !req.url?.split("?")[0].includes(".")) {
          req.url = "/local-preview.html";
        }
        next();
      });
    },
  }] : []), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      ...((mode === "offline" || mode === "roteiros") ? {
        "@/integrations/supabase/client": path.resolve(__dirname, "./src/dev/supabaseLocal.ts"),
        "@/contexts/AuthContext": path.resolve(__dirname, "./src/dev/authLocal.tsx"),
      } : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
