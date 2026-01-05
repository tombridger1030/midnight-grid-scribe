/**
 * GoalModal Component
 * 
 * Modern modal for creating/editing goals.
 * Updated to match the new cyberpunk UI design language.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Zap, DollarSign, Users, Dumbbell, ChevronLeft } from 'lucide-react';
import { Goal } from '@/hooks/useGoals';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Goal templates with visual cards
const GOAL_TEMPLATES = [
  {
    id: 'deep-work',
    value: 'kpi:deepWorkHours',
    name: 'Deep Work',
    icon: Zap,
    description: 'Track focused work hours from weekly KPIs',
    defaultUnit: 'hours',
    defaultTarget: 1200,
    color: '#00FF88',
  },
  {
    id: 'training',
    value: 'kpi:bjjSessions,strengthSessions',
    name: 'Training',
    icon: Dumbbell,
    description: 'Combined BJJ + strength sessions',
    defaultUnit: 'sessions',
    defaultTarget: 300,
    color: '#00F0FF',
  },
  {
    id: 'revenue',
    value: 'manual',
    name: 'Revenue',
    icon: DollarSign,
    description: 'Manual monthly revenue tracking',
    defaultUnit: '$',
    defaultTarget: 50000,
    color: '#FFB800',
  },
  {
    id: 'followers',
    value: 'content',
    name: 'Followers',
    icon: Users,
    description: 'Audience growth from content metrics',
    defaultUnit: 'followers',
    defaultTarget: 25000,
    color: '#FF3366',
  },
];

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal;
  onSave: (goal: Omit<Goal, 'id'> | Goal) => void;
  onDelete?: () => void;
}

const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goal,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [yearlyTarget, setYearlyTarget] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [manualMonthly, setManualMonthly] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const isEditMode = !!goal;

  // Populate form when goal changes
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setYearlyTarget(goal.yearlyTarget);
      setUnit(goal.unit);
      setManualMonthly(goal.manualMonthly || {});
      setStep('configure');

      if (goal.source === 'kpi' && goal.connectedKpis) {
        setSourceValue(`kpi:${goal.connectedKpis.join(',')}`);
      } else if (goal.source === 'content') {
        setSourceValue('content');
      } else {
        setSourceValue('manual');
      }
    } else {
      setName('');
      setYearlyTarget(0);
      setUnit('');
      setSourceValue('');
      setManualMonthly({});
      setStep('select');
    }
  }, [goal, isOpen]);

  const handleTemplateSelect = (template: typeof GOAL_TEMPLATES[0]) => {
    setName(template.name);
    setYearlyTarget(template.defaultTarget);
    setUnit(template.defaultUnit);
    setSourceValue(template.value);
    setStep('configure');
  };

  const handleSave = () => {
    if (!name || !yearlyTarget || !unit) return;

    let source: 'kpi' | 'content' | 'manual' = 'manual';
    let connectedKpis: string[] | undefined;

    if (sourceValue.startsWith('kpi:')) {
      source = 'kpi';
      connectedKpis = sourceValue.replace('kpi:', '').split(',');
    } else if (sourceValue === 'content') {
      source = 'content';
    }

    const goalData: Omit<Goal, 'id'> = {
      name,
      yearlyTarget,
      unit,
      source,
      connectedKpis,
      manualMonthly: source === 'manual' ? manualMonthly : undefined,
    };

    if (goal) {
      onSave({ ...goalData, id: goal.id });
    } else {
      onSave(goalData);
    }
    onClose();
  };

  const handleMonthlyChange = (month: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setManualMonthly(prev => ({ ...prev, [month]: numValue }));
  };

  const selectedTemplate = GOAL_TEMPLATES.find(t => t.value === sourceValue);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-surface-primary border border-line 
                     rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <div className="flex items-center gap-3">
              {step === 'configure' && !isEditMode && (
                <button
                  onClick={() => setStep('select')}
                  className="p-1.5 rounded-lg hover:bg-terminal-accent/10 
                             text-terminal-accent/60 hover:text-terminal-accent transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <h2 className="text-lg font-semibold text-terminal-accent">
                {isEditMode ? 'Edit Goal' : step === 'select' ? 'Select Goal Type' : 'Configure Goal'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-terminal-accent/10 
                         text-terminal-accent/60 hover:text-terminal-accent transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            
            {/* Step 1: Template Selection */}
            {step === 'select' && !isEditMode && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 grid grid-cols-2 gap-3"
              >
                {GOAL_TEMPLATES.map((template, index) => {
                  const Icon = template.icon;
                  return (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleTemplateSelect(template)}
                      className={cn(
                        "group p-4 rounded-lg border transition-all duration-200 text-left",
                        "border-line hover:border-terminal-accent/50",
                        "bg-surface-secondary hover:bg-surface-secondary/80"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2.5 rounded-lg"
                          style={{ backgroundColor: `${template.color}15` }}
                        >
                          <Icon size={20} style={{ color: template.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-sm font-semibold mb-1"
                            style={{ color: template.color }}
                          >
                            {template.name}
                          </div>
                          <div className="text-xs text-terminal-accent/50 leading-relaxed">
                            {template.description}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
                        <span className="text-xs text-terminal-accent/40">
                          Default: {template.defaultTarget.toLocaleString()} {template.defaultUnit}
                        </span>
                        <span className="text-xs text-terminal-accent/30 group-hover:text-terminal-accent transition-colors">
                          Select →
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {/* Step 2: Configuration */}
            {step === 'configure' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 space-y-6"
              >
                {/* Selected Type Indicator */}
                {selectedTemplate && (
                  <div
                    className="flex items-center gap-3 p-4 rounded-lg bg-surface-secondary"
                    style={{ 
                      borderLeft: `3px solid ${selectedTemplate.color}`,
                    }}
                  >
                    <selectedTemplate.icon size={18} style={{ color: selectedTemplate.color }} />
                    <span 
                      className="text-sm font-medium"
                      style={{ color: selectedTemplate.color }}
                    >
                      {selectedTemplate.name}
                    </span>
                    <span className="text-xs text-terminal-accent/40 ml-auto">
                      {selectedTemplate.value.startsWith('kpi:') ? 'Auto-tracked' : 
                       selectedTemplate.value === 'content' ? 'Content metrics' : 'Manual entry'}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm text-terminal-accent/60 mb-3">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-secondary border border-line 
                               rounded-lg text-terminal-accent text-lg font-medium
                               focus:outline-none focus:border-terminal-accent transition-colors"
                    placeholder="Enter goal name"
                  />
                </div>

                {/* Target & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-terminal-accent/60 mb-3">
                      Yearly Target
                    </label>
                    <input
                      type="number"
                      value={yearlyTarget || ''}
                      onChange={(e) => setYearlyTarget(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-surface-secondary border border-line 
                                 rounded-lg text-terminal-accent text-2xl font-mono
                                 focus:outline-none focus:border-terminal-accent transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-terminal-accent/60 mb-3">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-secondary border border-line 
                                 rounded-lg text-terminal-accent text-lg
                                 focus:outline-none focus:border-terminal-accent transition-colors"
                      placeholder="hours, $, etc."
                    />
                  </div>
                </div>

                {/* Monthly breakdown preview */}
                {yearlyTarget > 0 && (
                  <div className="p-4 rounded-lg bg-terminal-accent/5 border border-terminal-accent/20">
                    <div className="text-xs text-terminal-accent/50 mb-2">Monthly breakdown</div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl text-terminal-accent font-mono font-semibold">
                        {Math.round(yearlyTarget / 12).toLocaleString()}
                      </span>
                      <span className="text-sm text-terminal-accent/50">{unit}/month</span>
                      <span className="text-terminal-accent/30">•</span>
                      <span className="text-sm text-terminal-accent/50">
                        {Math.round(yearlyTarget / 52).toLocaleString()} {unit}/week
                      </span>
                    </div>
                  </div>
                )}

                {/* Manual Monthly Inputs */}
                {sourceValue === 'manual' && (
                  <div>
                    <label className="block text-sm text-terminal-accent/60 mb-4">
                      Monthly Values
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {MONTHS.map((month) => (
                        <div key={month}>
                          <label className="block text-[10px] text-terminal-accent/40 mb-1.5 uppercase tracking-wider">
                            {month}
                          </label>
                          <input
                            type="number"
                            value={manualMonthly[month] || ''}
                            onChange={(e) => handleMonthlyChange(month, e.target.value)}
                            className="w-full px-2 py-2 bg-surface-secondary border border-line 
                                       rounded-lg text-sm text-terminal-accent font-mono text-right
                                       focus:outline-none focus:border-terminal-accent transition-colors"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-terminal-accent/40">YTD Total</span>
                      <span className="text-terminal-accent font-mono font-semibold">
                        {Object.values(manualMonthly).reduce((sum, v) => sum + (v || 0), 0).toLocaleString()} {unit}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {step === 'configure' && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-line bg-surface-secondary">
              {isEditMode && onDelete ? (
                <button
                  onClick={() => {
                    if (confirm('Delete this goal?')) {
                      onDelete();
                      onClose();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg
                             text-[#FF3366]/70 hover:text-[#FF3366] 
                             hover:bg-[#FF3366]/10 transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-terminal-accent/70 
                             hover:text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name || !yearlyTarget || !unit}
                  className="px-6 py-2 rounded-lg bg-terminal-accent text-black font-medium
                             hover:bg-terminal-accent/90 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditMode ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GoalModal;
