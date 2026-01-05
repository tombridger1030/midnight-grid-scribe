/**
 * AddSessionDropdown Component
 * 
 * Dropdown to add a training session with type selection.
 * Cyberpunk aesthetic with enhanced styling.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingType } from '@/lib/kpiDefaults';
import { cn } from '@/lib/utils';
import { colors, shadows } from '@/styles/design-tokens';

interface AddSessionDropdownProps {
  trainingTypes: TrainingType[];
  onAddSession: (typeId: string, date: string) => void;
  onAddType: (name: string, color: string) => void;
  weekDates: { start: Date; end: Date };
}

export const AddSessionDropdown: React.FC<AddSessionDropdownProps> = ({
  trainingTypes,
  onAddSession,
  onAddType,
  weekDates,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#FF073A');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startStr = weekDates.start.toISOString().split('T')[0];
    const endStr = weekDates.end.toISOString().split('T')[0];
    
    if (todayStr >= startStr && todayStr <= endStr) {
      return todayStr;
    }
    return startStr;
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingType(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate week dates for date picker
  const weekDateOptions = [];
  const current = new Date(weekDates.start);
  while (current <= weekDates.end) {
    weekDateOptions.push({
      value: current.toISOString().split('T')[0],
      label: current.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    });
    current.setDate(current.getDate() + 1);
  }

  const handleSelectType = (typeId: string) => {
    onAddSession(typeId, selectedDate);
    setIsOpen(false);
  };

  const handleAddNewType = () => {
    if (newTypeName.trim()) {
      onAddType(newTypeName.trim(), newTypeColor);
      setNewTypeName('');
      setNewTypeColor('#FF073A');
      setIsAddingType(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm rounded-md transition-all duration-200"
        style={{
          border: `1px dashed ${isOpen ? colors.primary.DEFAULT : colors.border.accent}`,
          color: isOpen ? colors.primary.DEFAULT : colors.text.secondary,
          backgroundColor: isOpen ? `${colors.primary.DEFAULT}10` : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = colors.primary.DEFAULT;
            e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}10`;
            e.currentTarget.style.color = colors.primary.DEFAULT;
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = colors.border.accent;
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.text.secondary;
          }
        }}
      >
        <Plus size={16} />
        <span>Add Session</span>
        <ChevronDown 
          size={14} 
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-2xl overflow-hidden z-50"
            style={{
              backgroundColor: colors.background.tertiary,
              border: `1px solid ${colors.border.accent}`,
            }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Date selector */}
            <div 
              className="p-3"
              style={{ borderBottom: `1px solid ${colors.border.DEFAULT}` }}
            >
              <label 
                className="text-xs uppercase tracking-wider mb-2 block"
                style={{ color: colors.text.muted }}
              >
                Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md focus:outline-none appearance-none cursor-pointer"
                style={{
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.DEFAULT}`,
                  color: colors.text.primary,
                }}
              >
                {weekDateOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Training types */}
            <div className="max-h-56 overflow-y-auto">
              {trainingTypes.map((type, index) => (
                <motion.button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left"
                  style={{ 
                    borderBottom: `1px solid ${colors.border.DEFAULT}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${type.color}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="text-xl">{type.icon}</span>
                  <span 
                    className="flex-1 font-medium text-sm"
                    style={{ color: type.color }}
                  >
                    {type.name}
                  </span>
                  {!type.counts_toward_target && (
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${colors.text.muted}20`,
                        color: colors.text.muted,
                      }}
                    >
                      bonus
                    </span>
                  )}
                </motion.button>
              ))}
              
              {trainingTypes.length === 0 && (
                <div 
                  className="px-4 py-6 text-center text-sm"
                  style={{ color: colors.text.muted }}
                >
                  No training types yet
                </div>
              )}
            </div>

            {/* Add new type */}
            <div 
              className="p-3"
              style={{ 
                borderTop: `1px solid ${colors.border.DEFAULT}`,
                backgroundColor: colors.background.elevated,
              }}
            >
              {isAddingType ? (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Type name..."
                    className="w-full px-3 py-2 text-sm rounded-md focus:outline-none"
                    style={{
                      backgroundColor: colors.background.secondary,
                      border: `1px solid ${colors.border.accent}`,
                      color: colors.text.primary,
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTypeName.trim()) {
                        handleAddNewType();
                      } else if (e.key === 'Escape') {
                        setIsAddingType(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newTypeColor}
                      onChange={(e) => setNewTypeColor(e.target.value)}
                      className="w-10 h-10 rounded-md cursor-pointer border-0"
                      style={{ 
                        backgroundColor: 'transparent',
                      }}
                    />
                    <motion.button
                      onClick={handleAddNewType}
                      disabled={!newTypeName.trim()}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: `${colors.success.DEFAULT}20`,
                        color: colors.success.DEFAULT,
                        border: `1px solid ${colors.success.DEFAULT}40`,
                      }}
                    >
                      <Check size={14} />
                      Add Type
                    </motion.button>
                    <motion.button
                      onClick={() => setIsAddingType(false)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-md transition-colors"
                      style={{ color: colors.text.muted }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${colors.danger.DEFAULT}20`;
                        e.currentTarget.style.color = colors.danger.DEFAULT;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = colors.text.muted;
                      }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  onClick={() => setIsAddingType(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200"
                  style={{
                    color: colors.text.secondary,
                    border: `1px dashed ${colors.border.DEFAULT}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = colors.primary.DEFAULT;
                    e.currentTarget.style.color = colors.primary.DEFAULT;
                    e.currentTarget.style.backgroundColor = `${colors.primary.DEFAULT}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = colors.border.DEFAULT;
                    e.currentTarget.style.color = colors.text.secondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Plus size={14} />
                  Add new type
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddSessionDropdown;
