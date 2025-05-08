import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TerminalLayout from "@/components/TerminalLayout";
import Index from "./pages/Index";
import Visualizer from "./pages/Visualizer";
import Schedule from "./pages/Schedule";
import Roadmap from "./pages/Roadmap";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import PinUnlockOverlay from "@/components/PinUnlockOverlay";
import { loadMetrics } from "@/lib/storage";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem('noctisium_unlocked') === 'true');

  useEffect(() => {
    if (unlocked) {
      loadMetrics();
    }
  }, [unlocked]);

  const handleUnlock = () => {
    setUnlocked(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {unlocked ? (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<TerminalLayout />}>
                <Route index element={<Index />} />
                <Route path="visualizer" element={<Visualizer />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="roadmap" element={<Roadmap />} />
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
