import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { FormEvent } from "react";
import TerminalLayout from "@/components/TerminalLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { userStorage } from "@/lib/userStorage";
import { supabase } from "@/lib/supabase";
import { CustomHeroUIProvider } from "@/components/providers/HeroUIProvider";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const Terminal = lazy(() => import("./pages/Terminal"));
const Log = lazy(() => import("./pages/Log"));
const Analytics = lazy(() => import("./pages/Analytics"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogEditor = lazy(() => import("./pages/BlogEditor"));
const Cash = lazy(() => import("./pages/Cash"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-black text-white font-mono">
    <div className="text-sm tracking-wider">CONNECTING ...</div>
  </div>
);

const TerminalLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-xs tracking-[0.2em] text-[#00D4FF]">
          NOCTISIUM TERMINAL
        </div>
        <div className="text-[10px] text-[#888888]">AUTHENTICATE</div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          className="w-full bg-black border border-[#444] px-3 py-2 text-sm focus:border-[#00D4FF] focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className="w-full bg-black border border-[#444] px-3 py-2 text-sm focus:border-[#00D4FF] focus:outline-none"
        />
        {error && <div className="text-xs text-[#FF3344]">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full border border-[#00D4FF] text-[#00D4FF] py-2 text-xs tracking-wider hover:bg-[#00D4FF]/10 disabled:opacity-50"
        >
          {busy ? "..." : "▶ ENTER"}
        </button>
      </form>
    </div>
  );
};

const useUserInitialization = () => {
  const { user, loading } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);

  useRealtimeSync({ enabled: !!user });

  useEffect(() => {
    if (user && !isInitializing) {
      setIsInitializing(true);
      userStorage.setUserId(user.id);
      setIsInitializing(false);
    }
  }, [user?.id]);

  return { loading, isInitializing };
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
  if (loading || isInitializing) return <LoadingScreen />;
  if (!user) return <TerminalLogin />;
  return <>{children}</>;
};

const AppContent = () => {
  const { user } = useAuth();
  const { loading, isInitializing } = useUserInitialization();

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
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
            <Route index element={<Terminal />} />
            <Route path="log" element={<Log />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="blog" element={<BlogList />} />
            <Route path="blog/new" element={<BlogEditor />} />
            <Route path="blog/:id" element={<BlogEditor />} />
            <Route path="cash" element={<Cash />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => (
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

export default App;
