import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";

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
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/pending" element={<ProtectedRoute><Pending /></ProtectedRoute>} />
                <Route path="/review/:id" element={<ProtectedRoute><Review /></ProtectedRoute>} />
                <Route path="/review-story/:id" element={<ProtectedRoute><ReviewStory /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
                <Route path="/manual-create" element={<ProtectedRoute><ManualCreate /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
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
