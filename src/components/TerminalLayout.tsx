import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./layout";

const SIDEBAR_STORAGE_KEY = "noctisium:sidebar:expanded";

const TerminalLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarExpanded));
  }, [sidebarExpanded]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggle = () =>
    isMobile ? setMobileOpen((v) => !v) : setSidebarExpanded((v) => !v);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden font-mono">
      {!isMobile && <Sidebar expanded={sidebarExpanded} />}

      {isMobile && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50">
            <Sidebar expanded className="h-full" />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto bg-black relative">
        <button
          onClick={toggle}
          className="fixed top-3 left-3 z-30 text-[#666] hover:text-white text-xs px-2 py-1 md:left-auto md:right-3"
          title="Toggle sidebar"
        >
          {isMobile ? "≡" : sidebarExpanded ? "◁" : "▷"}
        </button>
        {user && (
          <button
            onClick={signOut}
            className="fixed top-3 right-3 z-30 text-[#666] hover:text-[#FF3344] text-xs px-2 py-1"
            title="Sign out"
          >
            ⏻
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
};

export default TerminalLayout;
