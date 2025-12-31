/**
 * ExpandablePanel Component
 * Reusable animated panel that expands from a trigger element
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandablePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  position?: 'left' | 'center' | 'right';
  width?: string;
  showCloseButton?: boolean;
}

export const ExpandablePanel: React.FC<ExpandablePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  position = 'center',
  width = 'w-80',
  showCloseButton = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay adding listener to prevent immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const positionClasses = {
    left: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 30,
            duration: 0.2 
          }}
          className={cn(
            'absolute top-full mt-2 z-50',
            'bg-surface-secondary border border-line rounded-lg',
            'shadow-lg shadow-black/50',
            width,
            positionClasses[position],
            className
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              {title && (
                <h3 className="text-sm font-display font-semibold text-content-primary">
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-surface-hover transition-colors text-content-muted hover:text-content-primary"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExpandablePanel;
