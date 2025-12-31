/**
 * ShipWidget Component
 * Displays shipping status with GitHub integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Flame, ExternalLink, AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  getShipSummary, 
  formatTimeSinceShip, 
  isGitHubConfigured,
  Ship,
  ShipSummary 
} from '@/lib/github';
import { ExpandablePanel } from './ExpandablePanel';

interface ShipWidgetProps {
  className?: string;
}

export const ShipWidget: React.FC<ShipWidgetProps> = ({ className }) => {
  const [summary, setSummary] = useState<ShipSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load ship data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const configured = isGitHubConfigured();
      setIsConfigured(configured);
      
      if (configured) {
        const data = await getShipSummary();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to load ship data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Refresh every 30 minutes
    const interval = setInterval(loadData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Get status color based on hours since last ship
  const getStatusColor = () => {
    if (!summary) return 'text-content-muted';
    
    const hours = summary.hoursSinceLastShip;
    if (hours <= 24) return 'text-success'; // On track
    if (hours <= 48) return 'text-warning'; // Getting stale
    return 'text-danger'; // Overdue
  };

  const getStatusIcon = () => {
    if (!summary) return Rocket;
    
    const hours = summary.hoursSinceLastShip;
    if (hours > 48) return AlertTriangle;
    return Rocket;
  };

  // Format time display
  const getTimeDisplay = () => {
    if (!summary) return 'Loading...';
    if (!isFinite(summary.hoursSinceLastShip)) return 'Never';
    return formatTimeSinceShip(summary.hoursSinceLastShip);
  };

  // Group ships by date for display
  const groupShipsByDate = (ships: Ship[]) => {
    const groups: Record<string, Ship[]> = {};
    
    for (const ship of ships) {
      const date = new Date(ship.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let label: string;
      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
      
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(ship);
    }
    
    return groups;
  };

  const StatusIcon = getStatusIcon();

  // Not configured state
  if (!isConfigured && !isLoading) {
    return (
      <div className={cn('relative flex items-center', className)}>
        <Link
          to="/profile"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded',
            'bg-surface-tertiary/50 hover:bg-surface-tertiary',
            'text-content-muted hover:text-content-primary',
            'transition-colors text-sm'
          )}
        >
          <Rocket size={14} />
          <span>Setup GitHub</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      {/* Main Display */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded',
          'bg-surface-tertiary/50 hover:bg-surface-tertiary',
          'transition-colors'
        )}
      >
        {/* Status Icon */}
        <StatusIcon 
          size={14} 
          className={cn(
            getStatusColor(),
            summary?.isOverdue && 'animate-pulse'
          )} 
        />

        {/* Time Since Ship */}
        <span className={cn('text-sm font-medium', getStatusColor())}>
          {isLoading ? '...' : getTimeDisplay()}
        </span>

        {/* Streak */}
        {summary && summary.streak > 0 && (
          <div className="flex items-center gap-1 text-warning">
            <Flame size={12} />
            <span className="text-xs font-medium">{summary.streak}</span>
          </div>
        )}
      </button>

      {/* Ship Log Panel */}
      <ExpandablePanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        title="Shipping Log"
        position="center"
        width="w-96"
      >
        {/* Streak Banner */}
        {summary && summary.streak > 0 && (
          <div className={cn(
            'flex items-center justify-center gap-2 p-3 rounded-lg mb-4',
            'bg-warning/10 border border-warning/20'
          )}>
            <Flame size={20} className="text-warning" />
            <span className="text-lg font-display font-bold text-warning">
              {summary.streak}-day streak
            </span>
            <Flame size={20} className="text-warning" />
          </div>
        )}

        {/* Status Message */}
        {summary?.isOverdue && (
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-lg mb-4',
            'bg-danger/10 border border-danger/20'
          )}>
            <AlertTriangle size={16} className="text-danger" />
            <span className="text-sm text-danger">
              It's been over 24 hours. Ship something!
            </span>
          </div>
        )}

        {/* Ship Log */}
        {summary && summary.recentShips.length > 0 ? (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {Object.entries(groupShipsByDate(summary.recentShips)).map(([date, ships]) => (
              <div key={date}>
                <div className="text-xs text-content-muted mb-2 sticky top-0 bg-surface-secondary py-1">
                  {date}
                </div>
                <div className="space-y-2">
                  {ships.map((ship) => (
                    <a
                      key={ship.id}
                      href={ship.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-start gap-3 p-2 rounded',
                        'bg-surface-tertiary/50 hover:bg-surface-tertiary',
                        'transition-colors group'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5',
                        ship.type === 'pr' 
                          ? 'bg-purple-500/10 text-purple-400' 
                          : 'bg-neon-cyan/10 text-neon-cyan'
                      )}>
                        {ship.type === 'pr' ? '↗' : '●'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-content-primary truncate">
                          {ship.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-content-muted">
                          <span>{ship.repo}</span>
                          <span>·</span>
                          <span>
                            {new Date(ship.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <ExternalLink 
                        size={14} 
                        className="text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Rocket size={32} className="mx-auto text-content-muted mb-3" />
            <p className="text-sm text-content-muted">
              No ships in the last 7 days
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs text-content-muted">
            {summary ? `${summary.recentShips.length} ships this week` : 'Loading...'}
          </span>
          <Link
            to="/profile"
            className="text-xs text-neon-cyan hover:text-neon-cyan/80 flex items-center gap-1"
          >
            <Settings size={12} />
            <span>Configure</span>
          </Link>
        </div>
      </ExpandablePanel>
    </div>
  );
};

export default ShipWidget;
