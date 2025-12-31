/**
 * Header Component
 * Clean, functional header with deep work timer, ship clock, and profile menu
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeepWorkWidget } from './DeepWorkWidget';
import { ShipWidget } from './ShipWidget';
import { ProfileMenu } from './ProfileMenu';

interface HeaderProps {
  sidebarExpanded: boolean;
  onSidebarToggle: () => void;
  isMobile?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarExpanded,
  onSidebarToggle,
  isMobile = false,
  className,
}) => {
  return (
    <header
      className={cn(
        'h-14 flex items-center justify-between px-4',
        'bg-surface-secondary border-b border-line',
        'sticky top-0 z-40',
        className
      )}
    >
      {/* Left Section: Toggle + Brand */}
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle */}
        <button
          onClick={onSidebarToggle}
          className={cn(
            'p-2 rounded-md',
            'text-content-secondary hover:text-content-primary',
            'hover:bg-surface-hover',
            'transition-colors'
          )}
          aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isMobile ? (
            sidebarExpanded ? <X size={20} /> : <Menu size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>

        {/* Brand */}
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2',
            'text-content-primary hover:text-neon-cyan',
            'transition-colors'
          )}
        >
          <span className="text-neon-cyan font-display font-bold text-lg">◆</span>
          <span className="font-display font-bold text-sm tracking-wider hidden sm:inline">
            NOCTISIUM
          </span>
        </Link>
      </div>

      {/* Center Section: Widgets */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Deep Work Widget */}
        <DeepWorkWidget />

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-line" />

        {/* Ship Widget */}
        <ShipWidget />
      </div>

      {/* Right Section: Profile */}
      <div className="flex items-center">
        <ProfileMenu />
      </div>
    </header>
  );
};

export default Header;
