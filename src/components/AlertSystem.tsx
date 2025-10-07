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

  return null;
};