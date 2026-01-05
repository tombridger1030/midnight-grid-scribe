/**
 * SettingsSection Component
 * Collapsible terminal-style section wrapper for settings page
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  actions?: React.ReactNode;
  variant?: 'default' | 'warning';
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = true,
  actions,
  variant = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        variant === 'warning'
          ? 'bg-amber-500/5 border-amber-500/30'
          : 'bg-surface-secondary border-line'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'transition-colors duration-200',
          'hover:bg-surface-hover/50',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-terminal-accent/50'
        )}
      >
        <div className="flex items-center gap-3">
          <Icon
            size={18}
            className={cn(
              variant === 'warning'
                ? 'text-amber-500'
                : 'text-terminal-accent/70'
            )}
          />
          <span className="font-mono text-sm text-content-primary uppercase tracking-wide">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {actions && (
            <div onClick={(e) => e.stopPropagation()}>{actions}</div>
          )}
          <motion.div
            initial={false}
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-content-muted" />
          </motion.div>
        </div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 pt-1 border-t border-line/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsSection;
