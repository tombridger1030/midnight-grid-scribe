import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import TerminalLayout from "@/components/TerminalLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Visualizer from "./pages/Visualizer";
import Schedule from "./pages/Schedule";
import Roadmap from "./pages/Roadmap";
import Kanban from "./pages/Kanban";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import { useState, useEffect } from "react";
import PinUnlockOverlay from "@/components/PinUnlockOverlay";
import { loadMetrics } from "@/lib/storage";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('noctisium_unlocked') === 'true');
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (unlocked) {
      const loadInitialData = async () => {
        setIsLoadingData(true);
        try {
          await loadMetrics();
        } catch (error) {
          console.error('Failed to load initial data:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadInitialData();
    }
  }, [unlocked]);

  const handleUnlock = () => {
    setUnlocked(true);
  };

  if (!user) {
    return <AuthPage />;
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-[#8A8D93] font-mono">
        <div className="text-center">
          <div className="text-xl mb-2">Loading data...</div>
          <div className="text-sm opacity-70">Syncing with neural network</div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {unlocked ? (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<TerminalLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="metrics" element={<Index />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="visualizer" element={<Visualizer />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="kanban" element={<Kanban />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        ) : (
          <PinUnlockOverlay onUnlock={handleUnlock} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
