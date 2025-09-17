import React, { useState, useEffect } from 'react';
import { AlertTriangle, Ship, DollarSign, X, Clock, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNoctisiumData,
  checkAndCreateAlerts,
  NoctisiumAlert,
  logShip,
  saveNoctisiumData
} from '@/lib/storage';

interface AlertSystemProps {
  className?: string;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({ className }) => {
  const [alerts, setAlerts] = useState<NoctisiumAlert[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkAlerts = async () => {
      // Check for new alerts
      const newAlerts = checkAndCreateAlerts();

      // Load all active alerts
      const data = loadNoctisiumData();
      const activeAlerts = data.alerts.filter(alert => alert.isActive);

      setAlerts(activeAlerts);
      setIsVisible(activeAlerts.length > 0);
    };

    checkAlerts();

    // Check every 30 minutes
    const interval = setInterval(checkAlerts, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismissAlert = (alertId: string) => {
    const data = loadNoctisiumData();
    const alert = data.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isActive = false;
    }
    saveNoctisiumData(data);

    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    if (alerts.length <= 1) {
      setIsVisible(false);
    }
  };

  const handleQuickShip = (suggestion: string) => {
    const ship = logShip(suggestion, undefined, 'manual');

    // Dismiss any no-ship alerts
    const data = loadNoctisiumData();
    data.alerts.forEach(alert => {
      if (alert.type === 'no_ship') {
        alert.isActive = false;
      }
    });
    saveNoctisiumData(data);

    setAlerts(prev => prev.filter(alert => alert.type !== 'no_ship'));
  };

  const getAlertIcon = (type: NoctisiumAlert['type']) => {
    switch (type) {
      case 'no_ship':
        return <Ship size={20} className="text-[#FFD700]" />;
      case 'low_runway':
        return <TrendingDown size={20} className="text-[#FF6B6B]" />;
      default:
        return <AlertTriangle size={20} className="text-[#FFD700]" />;
    }
  };

  const getAlertTitle = (type: NoctisiumAlert['type']) => {
    switch (type) {
      case 'no_ship':
        return 'Ship Something Soon';
      case 'low_runway':
        return 'Low Runway Alert';
      default:
        return 'Alert';
    }
  };

  const getAlertMessage = (alert: NoctisiumAlert) => {
    switch (alert.type) {
      case 'no_ship':
        const hours = alert.metadata?.timeSinceLastShip || 0;
        const timeMsg = hours < 24
          ? `${Math.floor(hours)} hours`
          : `${Math.floor(hours / 24)} days`;
        return `It's been ${timeMsg} since your last ship. Time to deliver user-visible value.`;

      case 'low_runway':
        const months = alert.metadata?.monthsRemaining || 0;
        return `Only ${months} months of runway remaining. Consider reducing burn or increasing income.`;

      default:
        return 'An alert requires your attention.';
    }
  };

  const getAlertColor = (type: NoctisiumAlert['type']) => {
    switch (type) {
      case 'no_ship':
        return 'border-[#FFD700] bg-[#FFD700]/10';
      case 'low_runway':
        return 'border-[#FF6B6B] bg-[#FF6B6B]/10';
      default:
        return 'border-[#FFD700] bg-[#FFD700]/10';
    }
  };

  if (!isVisible || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "border-2 p-4 rounded-lg",
            getAlertColor(alert.type)
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getAlertIcon(alert.type)}
              <div>
                <h3 className="text-terminal-accent font-medium">
                  {getAlertTitle(alert.type)}
                </h3>
                <p className="text-terminal-accent/70 text-sm mt-1">
                  {getAlertMessage(alert)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDismissAlert(alert.id)}
              className="p-1 hover:bg-[#333] transition-colors rounded"
              title="Dismiss alert"
            >
              <X size={16} className="text-terminal-accent/50" />
            </button>
          </div>

          {/* Suggested Actions */}
          {alert.suggestedActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-terminal-accent/70 text-sm font-medium">
                Suggested actions:
              </p>
              <div className="flex flex-wrap gap-2">
                {alert.suggestedActions.slice(0, 4).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (alert.type === 'no_ship') {
                        handleQuickShip(action);
                      }
                    }}
                    className={cn(
                      "px-3 py-1 text-sm border rounded transition-colors",
                      alert.type === 'no_ship'
                        ? "border-[#5FE3B3] text-[#5FE3B3] hover:bg-[#5FE3B3] hover:text-black"
                        : "border-terminal-accent/30 text-terminal-accent hover:bg-terminal-accent/10"
                    )}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alert Metadata */}
          <div className="mt-3 text-xs text-terminal-accent/50">
            Alert created: {new Date(alert.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
};