import { roteirosLocal } from "./scripts/roteiros/local-plugin";
import { documentosLocal } from "./scripts/documentos/local-plugin";
import { seoLocal } from "./scripts/seo/local-plugin";
import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const hubLocal = mode === "hub" && command === "serve";
  if (mode === "hub" && command !== "serve") throw new Error("O modo hub é apenas uma demonstração local; usa npm run build para produção.");
  return ({
  server: {
    host: "::",
    port: 8080,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.seo-local/**', '**/.documentos-local/**'] },
    ...(hubLocal ? { headers: {
      // Defense in depth for direct fetch callers outside the Supabase adapter.
      "Content-Security-Policy": "connect-src 'self' ws://127.0.0.1:* ws://localhost:*; form-action 'self'; frame-src 'none'",
    } } : {}),
  },
  plugins: [react(), ...(hubLocal ? [documentosLocal(), seoLocal()] : []), ...(mode === "roteiros" ? [roteirosLocal()] : []), ...((mode === "offline" || mode === "divulgacao" || hubLocal) ? [{
    name: "offline-preview-entry",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        // Keep the isolated entry even after a React Router navigation/reload.
        if (req.headers.accept?.includes("text/html") && !req.url?.split("?")[0].includes(".")) {
          req.url = hubLocal ? "/hub-local.html" : mode === "divulgacao" ? "/divulgacao-local.html" : "/local-preview.html";
        }
        next();
      });
    },
  }] : []), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      ...(hubLocal ? {
        "@/integrations/supabase/client": path.resolve(__dirname, "./src/dev/supabaseHubLocal.ts"),
        "@/contexts/AuthContext": path.resolve(__dirname, "./src/dev/authHubLocal.tsx"),
      } : {}),
      ...((mode === "offline" || mode === "roteiros" || mode === "divulgacao") ? {
        "@/integrations/supabase/client": path.resolve(__dirname, mode === "divulgacao" ? "./src/dev/supabaseDivulgacaoLocal.ts" : "./src/dev/supabaseLocal.ts"),
        "@/contexts/AuthContext": path.resolve(__dirname, "./src/dev/authLocal.tsx"),
      } : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
