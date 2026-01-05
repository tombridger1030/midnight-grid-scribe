/**
 * NavigationSection Component
 * Toggle sidebar modules on/off
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  LayoutDashboard,
  BarChart3,
  Ship,
  TrendingUp,
  GitBranch,
  Network,
  FileText,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { preferencesManager, AVAILABLE_MODULES } from '@/lib/userPreferences';
import { SettingsSection } from './SettingsSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  Ship,
  TrendingUp,
  GitBranch,
  Network,
  FileText,
};

export const NavigationSection: React.FC = () => {
  const { user } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      try {
        const prefs = await preferencesManager.getUserPreferences();
        setEnabledModules(prefs.enabled_modules);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const handleToggle = async (moduleId: string) => {
    // Dashboard cannot be disabled
    if (moduleId === 'dashboard') {
      toast.error('Dashboard cannot be disabled');
      return;
    }

    const isEnabled = enabledModules.includes(moduleId);
    const newModules = isEnabled
      ? enabledModules.filter((m) => m !== moduleId)
      : [...enabledModules, moduleId];

    // Optimistic update
    setEnabledModules(newModules);

    try {
      await preferencesManager.updatePreferences({ enabled_modules: newModules });
      
      // Dispatch event to update sidebar
      window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: { enabled_modules: newModules } }));
      
      const module = AVAILABLE_MODULES.find((m) => m.id === moduleId);
      toast.success(`${module?.name || moduleId} ${isEnabled ? 'hidden' : 'shown'}`);
    } catch (error) {
      // Revert on error
      setEnabledModules(enabledModules);
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update navigation');
    }
  };

  if (loading) {
    return (
      <SettingsSection title="Navigation" icon={Layout}>
        <div className="text-sm text-content-muted">Loading...</div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title="Navigation" icon={Layout}>
      <div className="space-y-1">
        <p className="text-sm text-content-muted mb-3">
          Choose which modules appear in the sidebar.
        </p>

        <div className="space-y-2">
          {AVAILABLE_MODULES.map((module) => {
            const isEnabled = enabledModules.includes(module.id);
            const isDashboard = module.id === 'dashboard';
            const Icon = iconMap[module.icon] || BarChart3;

            return (
              <button
                key={module.id}
                onClick={() => handleToggle(module.id)}
                disabled={isDashboard}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-md',
                  'transition-all duration-200',
                  'border',
                  isEnabled
                    ? 'bg-terminal-accent/10 border-terminal-accent/30 text-content-primary'
                    : 'bg-surface border-line text-content-muted',
                  isDashboard
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:border-terminal-accent/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    className={cn(
                      isEnabled ? 'text-terminal-accent' : 'text-content-muted'
                    )}
                  />
                  <div className="text-left">
                    <div className="text-sm font-medium">{module.name}</div>
                    <div className="text-xs text-content-muted">
                      {module.description}
                    </div>
                  </div>
                </div>

                {/* Toggle indicator */}
                <div
                  className={cn(
                    'w-10 h-5 rounded-full relative transition-colors duration-200',
                    isEnabled ? 'bg-terminal-accent' : 'bg-surface-tertiary'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white',
                      'transition-transform duration-200',
                      isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSection>
  );
};

export default NavigationSection;
