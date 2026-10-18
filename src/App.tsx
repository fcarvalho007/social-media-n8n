import { lazy, Suspense } from "react";
const Curadoria = lazy(() => import("@/pages/Curadoria"));
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountQueryProvider } from "@/components/AccountQueryProvider";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoading } from "@/components/PageLoading";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

function DadosDaConta({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <AccountQueryProvider accountId={user?.id ?? null}>{children}</AccountQueryProvider>;
}
import { ProtectedRoute } from "@/components/ProtectedRoute";
const AuthenticatedLayout = lazy(() => import("@/components/AuthenticatedLayout"));
const Pending = lazy(() => import("./pages/Pending"));
const Review = lazy(() => import("./pages/Review"));
const ReviewStory = lazy(() => import("./pages/ReviewStory"));
const Calendar = lazy(() => import("./pages/Calendar"));
const ManualCreate = lazy(() => import("./pages/ManualCreate"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Templates = lazy(() => import("./pages/Templates"));
const Auth = lazy(() => import("./pages/Auth"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Recovery = lazy(() => import("./pages/Recovery"));
const PublicationHistory = lazy(() => import("./pages/PublicationHistory"));
const MediaLibrary = lazy(() => import("./pages/MediaLibrary"));
const QuotaSettings = lazy(() => import("./pages/QuotaSettings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
import NotFound from "./pages/NotFound";
const Analytics = lazy(() => import("./pages/Analytics"));
const Benchmark = lazy(() => import("./pages/Benchmark"));
const AISettings = lazy(() => import("./pages/AISettings"));
const AIDemo = lazy(() => import("./pages/AIDemo"));
const Insights = lazy(() => import("./pages/Insights"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const StoryConfirm = lazy(() => import("./pages/StoryConfirm"));
const StoryLauncher = lazy(() => import("./pages/StoryLauncher"));
const Estudio = lazy(() => import("./pages/Estudio"));
const ConteudosSociais = lazy(() => import("./pages/ConteudosSociais"));
const CarrosselCronica = lazy(() => import("./pages/CarrosselCronica"));
const FronteiraProjetoNewsletter = lazy(() => import("./features/newsletter/FronteiraProjeto").then(m => ({default:m.FronteiraProjetoNewsletter})));
const Roteiros = lazy(() => import("./pages/Roteiros"));
const Custos = lazy(() => import("./pages/Custos"));
const NewsletterApp = lazy(() => import("./newsletter/NewsletterApp"));
const EditorProva = lazy(() => import("./pages/EditorProva"));
const Carrosseis = lazy(() => import("./pages/Carrosseis"));
const CarrosselNovo = lazy(() => import("./pages/CarrosselNovo"));
const CarrosselTrabalho = lazy(() => import("./pages/CarrosselTrabalho"));
const Artigos = lazy(() => import("./pages/Artigos"));
import { SEO_DISPONIVEL } from "./features/seo/local";
const PesquisaSeo = SEO_DISPONIVEL ? lazy(() => import("./pages/PesquisaSeo")) : () => null;
const PlanoEditorial = SEO_DISPONIVEL ? lazy(() => import("./pages/PlanoEditorial")) : () => null;
const AutomacaoEditorial = SEO_DISPONIVEL ? lazy(() => import("./pages/AutomacaoEditorial")) : () => null;
const CustosEditorial = SEO_DISPONIVEL ? lazy(() => import("./pages/CustosEditorial")) : () => null;
import { RedirecionarDocumentos } from "./components/CuradoriaNavegacao";
import { DOCUMENTOS_LOCAL } from "./features/documentos/modelo";
const Documentos = DOCUMENTOS_LOCAL ? lazy(() => import("./pages/Documentos")) : () => null;
const SegurancaConta = lazy(() => import("./pages/SegurancaConta"));
import { useParams } from "react-router-dom";
const EdicoesArquivo = lazy(() => import("./pages/publico/EdicoesArquivo"));
const EdicaoPublica = lazy(() => import("./pages/publico/EdicaoPublica"));
const BriefPublico = lazy(() => import("./pages/publico/BriefPublico"));
const SubscricaoPublica = lazy(() => import("./pages/publico/Subscricao"));
const NewsletterLigacoes = lazy(() => import("./pages/NewsletterLigacoes"));
const RedirectEdicao = () => <Navigate to={`/edicoes/${useParams().numero ?? ""}`} replace />;

// Component to handle URL-encoded redirects
const EncodedUrlRedirect = () => {
  const location = useLocation();
  
  // Check if URL contains encoded characters that should be decoded
  if (location.pathname.includes('%3F') || location.pathname.includes('%3D')) {
    try {
      const decodedPath = decodeURIComponent(location.pathname);
      // A local path only, and preserve any query already supplied.
      if (!decodedPath.startsWith('//')) return <Navigate to={decodedPath + location.search + location.hash} replace />;
    } catch { /* A malformed escape is a missing page, not a fatal app error. */ }
  }
  
  return <NotFound />;
};

const App = () => (
  <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <DadosDaConta>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Suspense fallback={<PageLoading />}><Auth /></Suspense>} />
                <Route path="/recovery/:token" element={<Suspense fallback={<PageLoading />}><Recovery /></Suspense>} />
                <Route path="/stories/confirm" element={<Suspense fallback={<PageLoading />}><StoryConfirm /></Suspense>} />
                {/* Public newsletter pages (anonymous; server returns published content only). */}
                <Route path="/edicoes" element={<Suspense fallback={<PageLoading />}><EdicoesArquivo /></Suspense>} />
                <Route path="/edicoes/:numero" element={<Suspense fallback={<PageLoading />}><EdicaoPublica /></Suspense>} />
                <Route path="/edicao/:numero" element={<RedirectEdicao />} />
                <Route path="/brief/:slug" element={<Suspense fallback={<PageLoading />}><BriefPublico /></Suspense>} />
                <Route path="/subscricao" element={<Suspense fallback={<PageLoading />}><SubscricaoPublica /></Suspense>} />
                <Route path="/stories/launch/:id" element={<Suspense fallback={<PageLoading />}><StoryLauncher /></Suspense>} />
                <Route element={<ProtectedRoute><Suspense fallback={<PageLoading />}><AuthenticatedLayout /></Suspense></ProtectedRoute>}>
                  <Route path="/" element={<Estudio />} />
                  <Route path="/redes-sociais" element={<Navigate to="/" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/newsletter/emails" element={<Navigate to="/curadoria?separador=emails" replace />} />
                  <Route path="/newsletter/custos" element={<Navigate to="/custos?origem=newsletter" replace />} />
                  <Route path="/pending" element={<Pending />} />
                  <Route path="/review/:id" element={<Review />} />
                  <Route path="/review-story/:id" element={<ReviewStory />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/manual-create" element={<ManualCreate />} />
                  <Route path="/drafts" element={<Drafts />} />
                  <Route path="/failed-publications" element={<Navigate to="/publication-history?tab=failed" replace />} />
                  <Route path="/publication-history" element={<PublicationHistory />} />
                  <Route path="/media-library" element={<MediaLibrary />} />
                  {DOCUMENTOS_LOCAL && <><Route path="/curadoria/documentos" element={<Documentos />} /><Route path="/documentos" element={<RedirecionarDocumentos />} /></>}
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/quota" element={<QuotaSettings />} />
                  <Route path="/quota-settings" element={<QuotaSettings />} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/custos" element={<Suspense fallback={<PageLoading />}><Custos /></Suspense>} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/benchmark" element={<Benchmark />} />
                  <Route path="/ai-settings" element={<AISettings />} />
                  <Route path="/ai-demo" element={<AIDemo />} />
                  <Route path="/estudio" element={<Navigate to="/" replace />} />
                  <Route path="/estudio/redes-sociais" element={<ConteudosSociais />} />
                  <Route path="/estudio/redes-sociais/:id" element={<CarrosselCronica />} />
                  <Route path="/estudio/carrosseis" element={<Suspense fallback={<PageLoading />}><Carrosseis /></Suspense>} />
                  <Route path="/estudio/carrosseis/novo" element={<Suspense fallback={<PageLoading />}><CarrosselNovo /></Suspense>} />
                  <Route path="/estudio/carrosseis/:id" element={<Suspense fallback={<PageLoading />}><CarrosselTrabalho /></Suspense>} />
                  <Route path="/estudio/editor-prova" element={<Suspense fallback={<PageLoading />}><EditorProva /></Suspense>} />
                  <Route path="/newsletter/*" element={<FronteiraProjetoNewsletter><Suspense fallback={<PageLoading />}><NewsletterApp /></Suspense></FronteiraProjetoNewsletter>} />
                  <Route path="/estudio/roteiros" element={<Suspense fallback={<PageLoading />}><Roteiros /></Suspense>} />
                  <Route path="/estudio/roteiros/novo" element={<Suspense fallback={<PageLoading />}><Roteiros /></Suspense>} />
                  <Route path="/estudio/roteiros/:id" element={<Suspense fallback={<PageLoading />}><Roteiros /></Suspense>} />
                  <Route path="/curadoria" element={<Curadoria />} />
                  <Route path="/artigos" element={<Artigos />} />
                  {SEO_DISPONIVEL && <><Route path="/artigos/pesquisa" element={<PesquisaSeo />} /><Route path="/artigos/plano" element={<PlanoEditorial />} /><Route path="/artigos/automacao" element={<AutomacaoEditorial />} /><Route path="/artigos/custos" element={<CustosEditorial />} /></>}
                  <Route path="/definicoes/seguranca" element={<SegurancaConta />} />
                  <Route path="/estudio/migracao" element={<Navigate to="/newsletter/migracao" replace />} />
                  <Route path="/estudio/ligacoes" element={<Suspense fallback={<PageLoading />}><NewsletterLigacoes /></Suspense>} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<EncodedUrlRedirect />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </DadosDaConta>
        </AuthProvider>
      </ThemeProvider>
  </ErrorBoundary>
);

export default App;
