/**
 * Sidebar Component
 * Collapsible navigation sidebar with smooth animations
 */

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Activity,
  Network,
  FileText,
  Settings,
  Calendar,
  TrendingUp,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { preferencesManager } from "@/lib/userPreferences";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  id: string;
}

interface SidebarProps {
  expanded: boolean;
  className?: string;
}

// Icon mapping for module IDs
const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  kpis: BarChart3,
  activity: Activity,
  visualizer: TrendingUp,
  cash: Network,
  content: FileText,
  "daily-review": Calendar,
};

// Path mapping for module IDs
const pathMap: Record<string, string> = {
  dashboard: "/",
  kpis: "/kpis",
  activity: "/activity",
  visualizer: "/visualizer",
  cash: "/cash",
  content: "/content",
  "daily-review": "/daily-review",
};

export const Sidebar: React.FC<SidebarProps> = ({ expanded, className }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  // Load enabled navigation items
  useEffect(() => {
    const loadNavItems = async () => {
      if (!user) return;

      try {
        const preferences = await preferencesManager.getUserPreferences();
        const allModules = preferencesManager.getAvailableModules();

        const enabledItems = allModules
          .filter((module) => preferences.enabled_modules.includes(module.id))
          .map((module) => ({
            id: module.id,
            path: pathMap[module.id] || `/${module.id}`,
            icon: iconMap[module.id] || BarChart3,
            label: module.name,
          }));

        setNavItems(enabledItems);
      } catch (error) {
        console.error("Failed to load nav items:", error);
      }
    };

    loadNavItems();

    // Listen for preference updates
    const handlePreferenceUpdate = () => loadNavItems();
    window.addEventListener("preferencesUpdated", handlePreferenceUpdate);
    return () =>
      window.removeEventListener("preferencesUpdated", handlePreferenceUpdate);
  }, [user]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 220 : 56 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "h-full flex flex-col",
        "bg-surface-secondary border-r border-line",
        "overflow-hidden",
        className,
      )}
    >
      {/* Logo */}
      <Link
        to="/"
        className={cn(
          "flex items-center h-14 px-4",
          "border-b border-line",
          "hover:bg-surface-hover transition-colors",
        )}
      >
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          {/* Logo Mark */}
          <div
            className={cn(
              "w-6 h-6 flex items-center justify-center",
              "text-neon-cyan font-display font-bold text-lg",
            )}
          >
            ◆
          </div>

          {/* Logo Text - Only when expanded */}
          <motion.span
            initial={false}
            animate={{
              opacity: expanded ? 1 : 0,
              width: expanded ? "auto" : 0,
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              "font-display font-bold text-sm tracking-wider",
              "text-content-primary whitespace-nowrap overflow-hidden",
            )}
          >
            NOCTISIUM
          </motion.span>
        </motion.div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md",
                    "transition-all duration-200",
                    "relative group",
                    active
                      ? "bg-neon-cyan/10 text-neon-cyan"
                      : "text-content-secondary hover:text-content-primary hover:bg-surface-hover",
                  )}
                >
                  {/* Active Indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute -left-2 w-0.5 h-5 bg-neon-cyan rounded-full"
                      style={{ top: "50%", marginTop: "-10px" }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <Icon
                    size={20}
                    className={cn(
                      "shrink-0 transition-colors",
                      active && "drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]",
                    )}
                  />

                  {/* Label */}
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: expanded ? 1 : 0,
                      width: expanded ? "auto" : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "text-sm font-medium whitespace-nowrap overflow-hidden",
                    )}
                  >
                    {item.label}
                  </motion.span>

                  {/* Tooltip when collapsed */}
                  {!expanded && (
                    <div
                      className={cn(
                        "absolute left-full ml-2 px-2 py-1 rounded",
                        "bg-surface-tertiary text-content-primary text-xs",
                        "opacity-0 group-hover:opacity-100 pointer-events-none",
                        "transition-opacity whitespace-nowrap z-50",
                        "border border-line",
                      )}
                    >
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section - Settings */}
      <div className="py-4 px-2 border-t border-line">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md",
            "transition-all duration-200",
            "text-content-secondary hover:text-content-primary hover:bg-surface-hover",
            "relative group",
            isActive("/settings") && "bg-neon-cyan/10 text-neon-cyan",
          )}
        >
          <Settings size={20} className="shrink-0" />

          <motion.span
            initial={false}
            animate={{
              opacity: expanded ? 1 : 0,
              width: expanded ? "auto" : 0,
            }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            Settings
          </motion.span>

          {/* Tooltip when collapsed */}
          {!expanded && (
            <div
              className={cn(
                "absolute left-full ml-2 px-2 py-1 rounded",
                "bg-surface-tertiary text-content-primary text-xs",
                "opacity-0 group-hover:opacity-100 pointer-events-none",
                "transition-opacity whitespace-nowrap z-50",
                "border border-line",
              )}
            >
              Settings
            </div>
          )}
        </Link>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
