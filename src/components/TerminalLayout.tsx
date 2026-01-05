/**
 * TerminalLayout Component
 * Main application layout with header and sidebar
 *
 * Redesigned to be clean and functional:
 * - Single-row header with essential widgets
 * - Collapsible sidebar with navigation
 * - Mobile overlay for sidebar
 */

import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Header, Sidebar } from "./layout";

// Storage key for sidebar state
const SIDEBAR_STORAGE_KEY = "noctisium:sidebar:expanded";

const TerminalLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Sidebar state - default to expanded, persisted in localStorage
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? stored === "true" : true; // Default expanded
  });

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarExpanded));
  }, [sidebarExpanded]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarExpanded(!sidebarExpanded);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Header */}
      <Header
        sidebarExpanded={isMobile ? mobileMenuOpen : sidebarExpanded}
        onSidebarToggle={handleSidebarToggle}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        {!isMobile && <Sidebar expanded={sidebarExpanded} />}

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed left-0 top-14 bottom-0 z-50"
              >
                <Sidebar expanded={true} className="h-full" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TerminalLayout;
