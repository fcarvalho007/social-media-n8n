import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Pending from "./pages/Pending";
import Review from "./pages/Review";
import ReviewStory from "./pages/ReviewStory";
import Calendar from "./pages/Calendar";
import ManualCreate from "./pages/ManualCreate";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Templates from "./pages/Templates";
import Auth from "./pages/Auth";
import Drafts from "./pages/Drafts";
import Recovery from "./pages/Recovery";
import PublicationHistory from "./pages/PublicationHistory";
import MediaLibrary from "./pages/MediaLibrary";
import QuotaSettings from "./pages/QuotaSettings";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import Analytics from "./pages/Analytics";
import Benchmark from "./pages/Benchmark";
import AISettings from "./pages/AISettings";
import AIDemo from "./pages/AIDemo";
import Insights from "./pages/Insights";
import NotificationSettings from "./pages/NotificationSettings";
import StoryConfirm from "./pages/StoryConfirm";
import StoryLauncher from "./pages/StoryLauncher";
const queryClient = new QueryClient();

// Component to handle URL-encoded redirects
const EncodedUrlRedirect = () => {
  const location = useLocation();
  
  // Check if URL contains encoded characters that should be decoded
  if (location.pathname.includes('%3F') || location.pathname.includes('%3D')) {
    const decodedPath = decodeURIComponent(location.pathname);
    return <Navigate to={decodedPath} replace />;
  }
  
  return <NotFound />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/recovery/:token" element={<Recovery />} />
                <Route path="/stories/confirm" element={<StoryConfirm />} />
                <Route path="/stories/launch/:id" element={<StoryLauncher />} />
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pending" element={<Pending />} />
                  <Route path="/review/:id" element={<Review />} />
                  <Route path="/review-story/:id" element={<ReviewStory />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/manual-create" element={<ManualCreate />} />
                  <Route path="/drafts" element={<Drafts />} />
                  <Route path="/failed-publications" element={<Navigate to="/publication-history?tab=failed" replace />} />
                  <Route path="/publication-history" element={<PublicationHistory />} />
                  <Route path="/media-library" element={<MediaLibrary />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/quota" element={<QuotaSettings />} />
                  <Route path="/quota-settings" element={<QuotaSettings />} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/benchmark" element={<Benchmark />} />
                  <Route path="/ai-settings" element={<AISettings />} />
                  <Route path="/ai-demo" element={<AIDemo />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<EncodedUrlRedirect />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
