import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import TerminalLayout from "@/components/TerminalLayout";
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

const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Visualizer = lazy(() => import("./pages/Visualizer"));
const Activity = lazy(() => import("./pages/Activity"));
const Cash = lazy(() => import("./pages/Cash"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Content = lazy(() => import("./pages/Content"));
const ContentDashboard = lazy(() => import("./pages/ContentDashboard"));
const ContentWeekly = lazy(() => import("./pages/ContentWeekly"));
const ContentInput = lazy(() => import("./pages/ContentInput"));
const ContentMetrics = lazy(() => import("./pages/ContentMetrics"));
const Settings = lazy(() => import("./pages/Settings"));
const KPIManage = lazy(() => import("./pages/KPIManage"));
const DailyReview = lazy(() => import("./pages/DailyReview"));
const MissionControl = lazy(() => import("@/pages/MissionControl"));
const WeeklyLog = lazy(() => import("@/pages/WeeklyLog"));
const Focus = lazy(() => import("@/pages/Focus"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingScreen = ({ loading }: { loading: boolean }) => (
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

const normalizeRedirectTarget = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
};

const ProtectedIndex = () => {
  const location = useLocation();
  const redirectTo = normalizeRedirectTarget(
    new URLSearchParams(location.search).get("redirectTo"),
  );

  if (redirectTo && redirectTo !== "/") {
    return <Navigate to={redirectTo} replace />;
  }

  return <Dashboard />;
};

const useUserInitialization = () => {
  const { user, loading } = useAuth();
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

          // Sync GitHub settings from Supabase to localStorage (so GitHub functions work immediately)
          const githubSettings = await userStorage.getGithubSettings();
          if (githubSettings?.api_token) {
            localStorage.setItem("github_api_token", githubSettings.api_token);
            localStorage.setItem(
              "github_username",
              githubSettings.username || "",
            );
            localStorage.setItem("github_repos", githubSettings.repos || "");
          }

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

  return {
    loading,
    isInitializing,
    soundEnabled,
  };
};

const RequireAuth = ({
  children,
  user,
  loading,
  isInitializing,
}: {
  children: React.ReactNode;
  user: ReturnType<typeof useAuth>["user"];
  loading: boolean;
  isInitializing: boolean;
}) => {
  if (loading || isInitializing) {
    return <LoadingScreen loading={loading} />;
  }

  if (!user) {
    return <CyberpunkLogin />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  const { loading, isInitializing, soundEnabled } = useUserInitialization();

  return (
    <>
      <SoundEffects enabled={!!user && soundEnabled} />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen loading={false} />}>
          <Routes>
            <Route path="/weekly-log" element={<WeeklyLog />} />
            <Route
              path="/"
              element={
                <RequireAuth
                  user={user}
                  loading={loading}
                  isInitializing={isInitializing}
                >
                  <TerminalLayout />
                </RequireAuth>
              }
            >
              <Route index element={<ProtectedIndex />} />
              <Route path="kpis" element={<Index />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="visualizer" element={<Visualizer />} />
              <Route path="activity" element={<Activity />} />
              <Route path="focus" element={<Focus />} />
              <Route path="cash" element={<Cash />} />
              <Route path="settings" element={<Settings />} />
              <Route path="kpis/manage" element={<KPIManage />} />
              <Route
                path="profile"
                element={<Navigate to="/settings" replace />}
              />
              <Route path="daily-review" element={<DailyReview />} />
              <Route path="content" element={<Content />}>
                <Route index element={<ContentDashboard />} />
                <Route path="dashboard" element={<ContentDashboard />} />
                <Route path="weekly" element={<ContentWeekly />} />
                <Route path="input" element={<ContentInput />} />
                <Route path="metrics" element={<ContentMetrics />} />
              </Route>
            </Route>
            <Route
              path="/mission-control"
              element={
                <RequireAuth
                  user={user}
                  loading={loading}
                  isInitializing={isInitializing}
                >
                  <MissionControl />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
