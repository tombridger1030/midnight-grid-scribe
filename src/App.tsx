import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TerminalLayout from "@/components/TerminalLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Visualizer from "./pages/Visualizer";
import Roadmap from "./pages/Roadmap";
import Cash from "./pages/Cash";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import PinUnlockOverlay from "@/components/PinUnlockOverlay";
import { loadMetrics } from "@/lib/storage";

const queryClient = new QueryClient();

const App = () => {
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
                <Route path="kpis" element={<Index />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="visualizer" element={<Visualizer />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="cash" element={<Cash />} />
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

export default App;
