import React from 'react';
import { Progress } from "@/components/ui/progress";
import {
  calculateKPIProgress,
  getKPIStatus
} from '@/lib/weeklyKpi';
import { ConfigurableKPI } from '@/lib/configurableKpis';

interface WeeklyProgressBarProps {
  kpi: ConfigurableKPI;
  actualValue: number;
  compact?: boolean;
  weekKey?: string;
}

const WeeklyProgressBar: React.FC<WeeklyProgressBarProps> = ({ 
  kpi, 
  actualValue, 
  compact = false,
  weekKey
}) => {
  const progress = calculateKPIProgress(kpi.kpi_id, actualValue, weekKey);
  const status = getKPIStatus(kpi.kpi_id, actualValue, weekKey);
  const isRange = kpi.min_target !== undefined;
  
  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return '#5FE3B3';
      case 'good': return '#FFD700';
      case 'fair': return '#FF6B00';
      case 'poor': return '#FF6B6B';
      default: return '#8A8D93';
    }
  };

  const statusColor = getStatusColor();

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: kpi.color }}
            />
            <span className="text-sm font-medium truncate">{kpi.name}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold" style={{ color: statusColor }}>
              {actualValue}
            </div>
            <div className="text-xs text-terminal-accent/70">
              /{kpi.target}
            </div>
          </div>
        </div>
        <Progress 
          value={progress} 
          className="h-2"
        />
        <div className="flex justify-between text-xs text-terminal-accent/50">
          <span>{Math.round(progress)}%</span>
          <span className="capitalize text-terminal-accent/70" style={{ color: statusColor }}>
            {status}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 border border-terminal-accent/30 bg-terminal-bg/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: kpi.color }}
          />
          <div>
            <div className="text-sm font-medium">{kpi.name}</div>
            <div className="text-xs text-terminal-accent/70">
              Target: {isRange ? `${kpi.min_target}-${kpi.target}` : kpi.target} {kpi.unit}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: statusColor }}>
            {actualValue}
          </div>
          <div className="text-xs text-terminal-accent/70">
            {Math.round(progress)}% complete
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-3"
        />
        <div className="flex justify-between items-center text-xs">
          <span className="text-terminal-accent/50">0</span>
          {isRange && (
            <span className="text-terminal-accent/70">
              Min: {kpi.min_target}
            </span>
          )}
          <span className="text-terminal-accent/50">Target: {kpi.target}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span 
          className="px-2 py-1 text-xs rounded font-medium"
          style={{ 
            backgroundColor: `${statusColor}20`, 
            color: statusColor,
            border: `1px solid ${statusColor}40`
          }}
        >
          {status.toUpperCase()}
        </span>
        <span className="text-xs text-terminal-accent/70 capitalize">
          {kpi.category}
        </span>
      </div>
    </div>
  );
};

export default WeeklyProgressBar; 
