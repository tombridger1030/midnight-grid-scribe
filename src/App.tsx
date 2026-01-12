import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TerminalLayout from "@/components/TerminalLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Visualizer from "./pages/Visualizer";
import Analytics from "./pages/Analytics";
import Roadmap from "./pages/Roadmap";
import Cash from "./pages/Cash";
import NotFound from "./pages/NotFound";
import Content from "./pages/Content";
import ContentRoot from "./pages/ContentRoot";
import ContentDashboard from "./pages/ContentDashboard";
import ContentWeekly from "./pages/ContentWeekly";
import ContentInput from "./pages/ContentInput";
import ContentMetrics from "./pages/ContentMetrics";
import Settings from "./pages/Settings";
import KPIManage from "./pages/KPIManage";
import Ships from "./pages/Ships";
import DailyReview from "./pages/DailyReview";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CyberpunkLogin from "@/components/cyberpunk/CyberpunkLogin";
import MatrixBackground from "@/components/cyberpunk/MatrixBackground";
import SoundEffects from "@/components/cyberpunk/SoundEffects";
import { kpiManager } from "@/lib/configurableKpis";
import { userStorage } from "@/lib/userStorage";
import { preferencesManager } from "@/lib/userPreferences";
import { supabase } from "@/lib/supabase";
import { CustomHeroUIProvider } from "@/components/providers/HeroUIProvider";
import { useProgressionStore } from "@/stores/progressionStore";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { syncWeeklyKPIsWithSupabase } from "@/lib/weeklyKpi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Inner App component that uses auth context
const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const initializeProgression = useProgressionStore(
    (state) => state.initialize,
  );

  // Enable real-time sync for live updates across the app
  useRealtimeSync({ enabled: !!user });

  useEffect(() => {
    if (user && !isInitializing) {
      const initializeUser = async () => {
        setIsInitializing(true);
        try {
          // CRITICAL: Ensure userStorage has the user ID before any other initialization
          // This fixes race condition where AuthContext's dynamic import hasn't completed
          userStorage.setUserId(user.id);

          // Initialize default KPIs if this is a new user
          await kpiManager.initializeDefaultKPIs();

          // Sync weekly KPIs from Supabase to localStorage (ensures source of truth is up to date)
          await syncWeeklyKPIsWithSupabase();

          // Initialize progression system
          await initializeProgression(user.id);

          // Load sound preference
          const soundPref = await preferencesManager.shouldEnableSound();
          setSoundEnabled(soundPref);
        } catch (error) {
          console.error("Failed to initialize user:", error);
        } finally {
          setIsInitializing(false);
        }
      };

      initializeUser();
    }
  }, [user?.id]); // Use user.id instead of user object to prevent re-init on tab focus

  if (loading || isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-[#8A8D93] font-mono">
        <MatrixBackground opacity={0.05} />
        <div className="text-center relative z-10">
          <div className="text-xl mb-2">
            {loading
              ? "Connecting to neural network..."
              : "Initializing user profile..."}
          </div>
          <div className="text-sm opacity-70">Please wait</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <CyberpunkLogin />;
  }

  // Let users into the app even without profiles loaded
  // The app will work with localStorage regardless of profile status

  return (
    <>
      <SoundEffects enabled={soundEnabled} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TerminalLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="kpis" element={<Index />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="visualizer" element={<Visualizer />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="cash" element={<Cash />} />
            <Route path="settings" element={<Settings />} />
            <Route path="kpis/manage" element={<KPIManage />} />
            <Route
              path="profile"
              element={<Navigate to="/settings" replace />}
            />
            <Route path="ships" element={<Ships />} />
            <Route path="daily-review" element={<DailyReview />} />
            <Route path="content" element={<Content />}>
              <Route index element={<ContentDashboard />} />
              <Route path="dashboard" element={<ContentDashboard />} />
              <Route path="weekly" element={<ContentWeekly />} />
              <Route path="input" element={<ContentInput />} />
              <Route path="metrics" element={<ContentMetrics />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomHeroUIProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </CustomHeroUIProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
