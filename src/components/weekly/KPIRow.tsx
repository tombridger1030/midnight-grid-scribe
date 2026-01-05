/**
 * KPIRow Component
 * 
 * Simple counter/hours KPI with +/- controls.
 * Cyberpunk aesthetic with glow effects on completion.
 */

import React, { useState, useCallback } from 'react';
import { Minus, Plus, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';

interface KPIRowProps {
  name: string;
  value: number;
  target: number | null;
  unit: string;
  color: string;
  autoSynced?: boolean;
  step?: number;
  onChange: (value: number) => void;
}

export const KPIRow: React.FC<KPIRowProps> = ({
  name,
  value,
  target,
  unit,
  color,
  autoSynced = false,
  step = 1,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());

  // Calculate progress
  const progress = target && target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const isComplete = progress >= 100;

  // Get progress color based on completion
  const getProgressColor = useCallback((pct: number): string => {
    if (pct >= 100) return colors.success.DEFAULT;
    if (pct >= 70) return color;
    if (pct >= 50) return colors.warning.DEFAULT;
    return color;
  }, [color]);

  const progressColor = getProgressColor(progress);

  // Handle increment/decrement
  const handleIncrement = useCallback(() => {
    onChange(value + step);
  }, [value, step, onChange]);

  const handleDecrement = useCallback(() => {
    onChange(Math.max(0, value - step));
  }, [value, step, onChange]);

  // Handle direct input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else {
      setInputValue(value.toString());
    }
    setIsEditing(false);
  }, [inputValue, value, onChange]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  }, [handleInputBlur, value]);

  // Update input value when value prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString());
    }
  }, [value, isEditing]);

  return (
    <motion.div 
      className="flex items-center gap-4 py-3 px-4 rounded-lg transition-all duration-200"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${isComplete ? progressColor + '50' : colors.border.accent}`,
        boxShadow: isComplete ? `0 0 15px ${progressColor}30` : undefined,
      }}
      whileHover={{ 
        borderColor: isComplete ? progressColor : colors.border.focus,
      }}
    >
      {/* Auto-sync indicator */}
      <div className="w-5 flex-shrink-0">
        {autoSynced && (
          <motion.span 
            title="Auto-synced"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Zap 
              size={16} 
              style={{ 
                color: colors.warning.DEFAULT,
                filter: `drop-shadow(0 0 4px ${colors.warning.DEFAULT})`,
              }} 
            />
          </motion.span>
        )}
      </div>

      {/* Name and progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span 
            className="font-medium text-sm truncate"
            style={{ color: isComplete ? colors.success.DEFAULT : color }}
          >
            {name}
          </span>
          {target && (
            <span 
              className="text-xs font-mono ml-2 flex-shrink-0"
              style={{ color: progressColor }}
            >
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        {target && target > 0 && (
          <div 
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${colors.primary.DEFAULT}15` }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
              style={{ 
                backgroundColor: progressColor,
                boxShadow: isComplete ? `0 0 8px ${progressColor}` : undefined,
              }}
            />
          </div>
        )}
      </div>

      {/* Value display and controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Decrement button */}
        <motion.button
          onClick={handleDecrement}
          disabled={value <= 0}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200",
            value <= 0 && "opacity-30 cursor-not-allowed"
          )}
          style={{
            border: `1px solid ${value > 0 ? color + '40' : colors.border.DEFAULT}`,
            color: value > 0 ? color : colors.text.disabled,
          }}
          onMouseEnter={(e) => {
            if (value > 0) {
              e.currentTarget.style.backgroundColor = `${color}15`;
              e.currentTarget.style.borderColor = `${color}80`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = value > 0 ? `${color}40` : colors.border.DEFAULT;
          }}
        >
          <Minus size={14} />
        </motion.button>

        {/* Value input */}
        {isEditing ? (
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className="w-16 h-8 text-center rounded-md text-sm font-mono focus:outline-none"
            style={{ 
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${color}60`,
              color: color,
            }}
            min="0"
            step={step}
          />
        ) : (
          <motion.button
            onClick={() => setIsEditing(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-8 text-center font-mono text-sm rounded-md transition-all duration-200"
            style={{ 
              color: isComplete ? colors.success.DEFAULT : color,
              backgroundColor: isComplete ? `${colors.success.DEFAULT}15` : 'transparent',
              textShadow: isComplete ? `0 0 10px ${colors.success.DEFAULT}` : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isComplete) {
                e.currentTarget.style.backgroundColor = `${color}15`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isComplete) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {value}
          </motion.button>
        )}

        {/* Increment button */}
        <motion.button
          onClick={handleIncrement}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-all duration-200"
          style={{
            border: `1px solid ${color}40`,
            color: color,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${color}15`;
            e.currentTarget.style.borderColor = `${color}80`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = `${color}40`;
          }}
        >
          <Plus size={14} />
        </motion.button>

        {/* Target display */}
        <span 
          className="text-xs w-14 text-right font-mono"
          style={{ color: colors.text.muted }}
        >
          {target ? `/ ${target}` : ''} {unit}
        </span>
      </div>
    </motion.div>
  );
};

export default KPIRow;
