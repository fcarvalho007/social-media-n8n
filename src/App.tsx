import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Pending from "./pages/Pending";
import Review from "./pages/Review";
import ReviewStory from "./pages/ReviewStory";
import Calendar from "./pages/Calendar";
import ManualCreate from "./pages/ManualCreate";
import QuotaSettings from "./pages/QuotaSettings";
import UserManagement from "./pages/UserManagement";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pending" element={<Pending />} />
              <Route path="/review/:id" element={<Review />} />
              <Route path="/review-story/:id" element={<ReviewStory />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/manual-create" element={<ManualCreate />} />
              <Route path="/quota" element={<QuotaSettings />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
