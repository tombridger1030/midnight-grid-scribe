import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarProps {
  expanded: boolean;
  className?: string;
}

interface NavItem {
  path: string;
  label: string;
  glyph: string;
}

const NAV: NavItem[] = [
  { path: "/", label: "TERMINAL", glyph: "▣" },
  { path: "/log", label: "LOG", glyph: "≡" },
  { path: "/analytics", label: "ANALYTICS", glyph: "▲" },
  { path: "/blog", label: "BLOG", glyph: "✎" },
  { path: "/cash", label: "CASH", glyph: "$" },
];

export const Sidebar: React.FC<SidebarProps> = ({ expanded, className }) => {
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <aside
      style={{ width: expanded ? 200 : 56 }}
      className={cn(
        "h-full flex flex-col bg-black border-r border-[#222] font-mono text-xs overflow-hidden transition-[width] duration-150",
        className,
      )}
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center h-12 px-4 border-b border-[#222] hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[#00D4FF] text-sm">◆</span>
        {expanded && (
          <span className="ml-3 text-white text-xs tracking-[0.2em]">
            NOCTISIUM
          </span>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    active
                      ? "text-[#FFB800] bg-[#FFB800]/5"
                      : "text-[#888] hover:text-white",
                  )}
                  title={!expanded ? item.label : undefined}
                >
                  <span className="shrink-0 w-4 text-center">{item.glyph}</span>
                  {expanded && (
                    <span className="tracking-wider">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="py-3 px-2 border-t border-[#222]">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 transition-colors",
            isActive("/settings")
              ? "text-[#FFB800] bg-[#FFB800]/5"
              : "text-[#888] hover:text-white",
          )}
          title={!expanded ? "SETTINGS" : undefined}
        >
          <span className="shrink-0 w-4 text-center">⚙</span>
          {expanded && <span className="tracking-wider">SETTINGS</span>}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
