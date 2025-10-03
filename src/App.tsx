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
import Content from "./pages/Content";
import ContentRoot from "./pages/ContentRoot";
import ContentDashboard from "./pages/ContentDashboard";
import ContentWeekly from "./pages/ContentWeekly";
import ContentInput from "./pages/ContentInput";
import Profile from "./pages/Profile";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CyberpunkLogin from "@/components/cyberpunk/CyberpunkLogin";
import MatrixBackground from "@/components/cyberpunk/MatrixBackground";
import SoundEffects from "@/components/cyberpunk/SoundEffects";
import { kpiManager } from "@/lib/configurableKpis";
import { userStorage } from "@/lib/userStorage";
import { preferencesManager } from "@/lib/userPreferences";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

// Inner App component that uses auth context
const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (user && !isInitializing) {
      const initializeUser = async () => {
        setIsInitializing(true);
        try {
          // Note: userStorage.setUserId is now handled in AuthContext to prevent race conditions
          
          // Initialize default KPIs if this is a new user
          await kpiManager.initializeDefaultKPIs();

          // Load sound preference
          const soundPref = await preferencesManager.shouldEnableSound();
          setSoundEnabled(soundPref);
        } catch (error) {
          console.error('Failed to initialize user:', error);
        } finally {
          setIsInitializing(false);
        }
      };

      initializeUser();
    }
  }, [user]); // Removed isInitializing from dependencies to prevent infinite loop

  if (loading || isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-[#8A8D93] font-mono">
        <MatrixBackground opacity={0.05} />
        <div className="text-center relative z-10">
          <div className="text-xl mb-2">
            {loading ? 'Connecting to neural network...' : 'Initializing user profile...'}
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
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="cash" element={<Cash />} />
          <Route path="profile" element={<Profile />} />
          <Route path="content" element={<Content />}>
            <Route index element={<ContentDashboard />} />
            <Route path="dashboard" element={<ContentDashboard />} />
            <Route path="weekly" element={<ContentWeekly />} />
            <Route path="input" element={<ContentInput />} />
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
