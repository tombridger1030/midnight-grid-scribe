import React, { useState, useEffect } from 'react';
import { Ship, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCurrentWorkSlice,
  getTimeSinceLastShip,
  WorkSlice
} from '@/lib/storage';

interface ShipClockProps {
  className?: string;
}

export const ShipClock: React.FC<ShipClockProps> = ({ className }) => {
  const [currentSlice, setCurrentSlice] = useState<WorkSlice | null>(null);
  const [cycleTime, setCycleTime] = useState(0);
  const [timeSinceLastShip, setTimeSinceLastShip] = useState(0);

  useEffect(() => {
    const updateClock = () => {
      const slice = getCurrentWorkSlice();
      setCurrentSlice(slice);

      if (slice?.firstDeepWorkStart) {
        const elapsed = Math.floor((Date.now() - new Date(slice.firstDeepWorkStart).getTime()) / 1000);
        setCycleTime(elapsed);
      } else {
        setCycleTime(0);
      }

      const timeSince = getTimeSinceLastShip();
      setTimeSinceLastShip(timeSince);
    };

    // Update immediately
    updateClock();

    // Update every 30 seconds
    const interval = setInterval(updateClock, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatCycleTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeSinceShip = (hours: number): string => {
    if (hours === 0) return 'Never shipped';
    if (hours < 1) return '<1h ago';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCycleTimeColor = (): string => {
    const hours = cycleTime / 3600;

    // Green under 24 hours
    if (hours < 24) return 'text-[#5FE3B3]';

    // Amber 24-48 hours
    if (hours < 48) return 'text-[#FFD700]';

    // Red after 48 hours
    return 'text-[#FF6B6B]';
  };

  const getShipUrgencyColor = (): string => {
    // Green if shipped in last 48 hours
    if (timeSinceLastShip < 48) return 'text-[#5FE3B3]';

    // Amber if 48-72 hours
    if (timeSinceLastShip < 72) return 'text-[#FFD700]';

    // Red if over 72 hours
    return 'text-[#FF6B6B]';
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Current Slice Cycle Time */}
      {currentSlice && (
        <div className="flex items-center gap-2">
          <Clock size={16} className={getCycleTimeColor()} />
          <div className="flex flex-col">
            <div className="font-mono text-sm font-bold" style={{ color: getCycleTimeColor() }}>
              {formatCycleTime(cycleTime)}
            </div>
            <div className="text-xs text-terminal-accent/70">cycle time</div>
          </div>
        </div>
      )}

      {/* Time Since Last Ship */}
      <div className="flex items-center gap-2">
        <Ship size={16} className={getShipUrgencyColor()} />
        <div className="flex flex-col">
          <div className="font-mono text-sm font-bold" style={{ color: getShipUrgencyColor() }}>
            {formatTimeSinceShip(timeSinceLastShip)}
          </div>
          <div className="text-xs text-terminal-accent/70">last ship</div>
        </div>
      </div>
    </div>
  );
};