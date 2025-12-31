/**
 * ProfileMenu Component
 * User profile dropdown with settings and sign out
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileMenuProps {
  className?: string;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut, isImpersonating } = useAuth();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  // Get user initial for avatar
  const getInitial = () => {
    if (profile?.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const displayName = profile?.display_name || profile?.username || 'User';
  const email = user?.email || '';

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center',
          'w-8 h-8 rounded-full',
          'bg-surface-tertiary border border-line',
          'text-content-secondary hover:text-content-primary',
          'hover:border-neon-cyan hover:shadow-glow-cyan',
          'transition-all duration-200',
          isImpersonating && 'border-warning ring-2 ring-warning/30'
        )}
        title={displayName}
      >
        {isImpersonating ? (
          <span className="text-xs">🎭</span>
        ) : (
          <User size={16} />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'w-56 rounded-lg overflow-hidden',
              'bg-surface-secondary border border-line',
              'shadow-lg shadow-black/50'
            )}
          >
            {/* User Info Section */}
            <div className="px-4 py-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  'bg-neon-cyan/10 border border-neon-cyan/30',
                  'text-neon-cyan font-display font-semibold'
                )}>
                  {getInitial()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-content-primary truncate">
                    {displayName}
                  </div>
                  <div className="text-xs text-content-muted truncate">
                    {email}
                  </div>
                </div>
              </div>
              {isImpersonating && (
                <div className="mt-2 px-2 py-1 bg-warning/10 rounded text-xs text-warning">
                  Impersonating user
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2',
                  'text-sm text-content-secondary',
                  'hover:bg-surface-hover hover:text-content-primary',
                  'transition-colors'
                )}
              >
                <User size={16} />
                <span>Profile</span>
              </Link>

              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2',
                  'text-sm text-content-secondary',
                  'hover:bg-surface-hover hover:text-content-primary',
                  'transition-colors'
                )}
              >
                <Settings size={16} />
                <span>Settings</span>
              </Link>
            </div>

            {/* Sign Out */}
            <div className="border-t border-line py-1">
              <button
                onClick={handleSignOut}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 w-full',
                  'text-sm text-content-secondary',
                  'hover:bg-danger/10 hover:text-danger',
                  'transition-colors'
                )}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
