/**
 * NutritionKPI Component
 * 
 * Tracks daily calories and protein by meal.
 * Shows 7-day overview with expandable day details.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, ChevronDown, ChevronUp, Flame, Beef, Settings } from 'lucide-react';
import { colors } from '@/styles/design-tokens';
import { DailyNutrition, MealType, MealData } from '@/hooks/useNutrition';

interface NutritionKPIProps {
  weekData: Record<string, DailyNutrition>;
  weeklyTotals: { calories: number; protein: number };
  dailyAverage: { calories: number; protein: number };
  daysTracked: number;
  targetCalories: number;
  targetProtein: number;
  onUpdateMeal: (date: string, meal: MealType, data: MealData) => void;
  onUpdateTargets?: (calories: number, protein: number) => void;
  weekDates: { start: Date; end: Date };
}

const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snacks', label: 'Snacks', icon: '🍿' },
];

export const NutritionKPI: React.FC<NutritionKPIProps> = ({
  weekData,
  weeklyTotals,
  dailyAverage,
  daysTracked,
  targetCalories,
  targetProtein,
  onUpdateMeal,
  onUpdateTargets,
  weekDates,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [editCalories, setEditCalories] = useState(targetCalories.toString());
  const [editProtein, setEditProtein] = useState(targetProtein.toString());

  // Generate all 7 days of the week
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const current = new Date(weekDates.start);
    while (current <= weekDates.end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [weekDates]);

  // Calculate progress percentages
  const calorieProgress = targetCalories > 0 
    ? Math.min(100, (dailyAverage.calories / targetCalories) * 100) 
    : 0;
  const proteinProgress = targetProtein > 0 
    ? Math.min(100, (dailyAverage.protein / targetProtein) * 100) 
    : 0;

  // Get day totals
  const getDayTotals = (date: string) => {
    const day = weekData[date];
    if (!day) return { calories: 0, protein: 0 };
    return {
      calories: (day.breakfast_calories || 0) + (day.lunch_calories || 0) + 
                (day.dinner_calories || 0) + (day.snacks_calories || 0),
      protein: (day.breakfast_protein || 0) + (day.lunch_protein || 0) + 
               (day.dinner_protein || 0) + (day.snacks_protein || 0),
    };
  };

  // Format day name
  const formatDayName = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateObj = new Date(date + 'T00:00:00');
    dateObj.setHours(0, 0, 0, 0);
    
    if (dateObj.getTime() === today.getTime()) return 'Today';
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const handleMealUpdate = (date: string, meal: MealType, field: 'calories' | 'protein', value: number) => {
    const day = weekData[date];
    const currentMeal: MealData = {
      calories: day?.[`${meal}_calories`] || 0,
      protein: day?.[`${meal}_protein`] || 0,
    };
    onUpdateMeal(date, meal, { ...currentMeal, [field]: value });
  };

  const handleSaveTargets = () => {
    const cal = parseInt(editCalories) || 1900;
    const prot = parseInt(editProtein) || 150;
    onUpdateTargets?.(cal, prot);
    setIsEditingTargets(false);
  };

  return (
    <motion.div 
      className="p-4 rounded-lg"
      style={{
        backgroundColor: colors.background.secondary,
        border: `1px solid ${colors.border.accent}`,
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header - Clickable to toggle collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between mb-4 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ 
              backgroundColor: `${colors.warning.DEFAULT}20`,
              border: `1px solid ${colors.warning.DEFAULT}40`,
            }}
          >
            <Utensils size={16} style={{ color: colors.warning.DEFAULT }} />
          </div>
          <div className="text-left">
            <span 
              className="font-semibold text-sm"
              style={{ color: colors.warning.DEFAULT }}
            >
              Nutrition
            </span>
            <div 
              className="text-xs font-mono"
              style={{ color: colors.text.muted }}
            >
              {dailyAverage.calories} cal avg • {dailyAverage.protein}g protein
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="text-xs font-mono"
            style={{ color: colors.text.muted }}
          >
            {daysTracked}/7 days
          </div>
          {isCollapsed ? (
            <ChevronDown size={18} style={{ color: colors.text.muted }} />
          ) : (
            <ChevronUp size={18} style={{ color: colors.text.muted }} />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Daily Averages with Editable Targets */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Calories */}
              <div 
                className="p-3 rounded-md"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} style={{ color: colors.danger.DEFAULT }} />
                  <span className="text-xs font-medium" style={{ color: colors.text.secondary }}>
                    Avg Calories
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span 
                    className="text-xl font-bold font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {dailyAverage.calories}
                  </span>
                  {isEditingTargets ? (
                    <input
                      type="number"
                      value={editCalories}
                      onChange={(e) => setEditCalories(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0.5 text-xs rounded font-mono"
                      style={{
                        backgroundColor: colors.background.elevated,
                        border: `1px solid ${colors.warning.DEFAULT}`,
                        color: colors.text.primary,
                      }}
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer hover:text-warning-400"
                      style={{ color: colors.text.muted }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCalories(targetCalories.toString());
                        setEditProtein(targetProtein.toString());
                        setIsEditingTargets(true);
                      }}
                      title="Click to edit target"
                    >
                      /{targetCalories}
                    </span>
                  )}
                </div>
                <div 
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ backgroundColor: `${colors.danger.DEFAULT}20` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${calorieProgress}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ backgroundColor: colors.danger.DEFAULT }}
                  />
                </div>
              </div>

              {/* Protein */}
              <div 
                className="p-3 rounded-md"
                style={{ backgroundColor: colors.background.tertiary }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Beef size={14} style={{ color: colors.success.DEFAULT }} />
                  <span className="text-xs font-medium" style={{ color: colors.text.secondary }}>
                    Avg Protein
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span 
                    className="text-xl font-bold font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {dailyAverage.protein}g
                  </span>
                  {isEditingTargets ? (
                    <input
                      type="number"
                      value={editProtein}
                      onChange={(e) => setEditProtein(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-1 py-0.5 text-xs rounded font-mono"
                      style={{
                        backgroundColor: colors.background.elevated,
                        border: `1px solid ${colors.warning.DEFAULT}`,
                        color: colors.text.primary,
                      }}
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer hover:text-warning-400"
                      style={{ color: colors.text.muted }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditCalories(targetCalories.toString());
                        setEditProtein(targetProtein.toString());
                        setIsEditingTargets(true);
                      }}
                      title="Click to edit target"
                    >
                      /{targetProtein}g
                    </span>
                  )}
                </div>
                <div 
                  className="h-1.5 rounded-full mt-2 overflow-hidden"
                  style={{ backgroundColor: `${colors.success.DEFAULT}20` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${proteinProgress}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ backgroundColor: colors.success.DEFAULT }}
                  />
                </div>
              </div>
            </div>

            {/* Save targets button */}
            {isEditingTargets && (
              <div className="flex justify-end gap-2 mb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTargets(false);
                  }}
                  className="px-3 py-1 text-xs rounded"
                  style={{ 
                    color: colors.text.muted,
                    border: `1px solid ${colors.border.DEFAULT}`,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveTargets();
                  }}
                  className="px-3 py-1 text-xs rounded"
                  style={{ 
                    backgroundColor: colors.warning.DEFAULT,
                    color: colors.background.primary,
                  }}
                >
                  Save Targets
                </button>
              </div>
            )}

            {/* 7-Day Grid */}
            <div className="space-y-1">
              {weekDays.map((date) => {
                const dayTotals = getDayTotals(date);
                const isExpanded = expandedDay === date;
                const dayData = weekData[date];
                const hasData = dayTotals.calories > 0 || dayTotals.protein > 0;

                return (
                  <div key={date}>
                    {/* Day Row */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDay(isExpanded ? null : date);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-md transition-colors"
                      style={{ 
                        backgroundColor: isExpanded ? colors.background.tertiary : 'transparent',
                      }}
                      whileHover={{ backgroundColor: colors.background.hover }}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="text-xs font-mono w-12"
                          style={{ color: colors.text.muted }}
                        >
                          {formatDayName(date)}
                        </span>
                        {hasData ? (
                          <div className="flex items-center gap-3">
                            <span 
                              className="text-sm font-mono"
                              style={{ color: colors.danger.DEFAULT }}
                            >
                              {dayTotals.calories}
                            </span>
                            <span 
                              className="text-sm font-mono"
                              style={{ color: colors.success.DEFAULT }}
                            >
                              {dayTotals.protein}g
                            </span>
                          </div>
                        ) : (
                          <span 
                            className="text-xs"
                            style={{ color: colors.text.disabled }}
                          >
                            No data
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={14} style={{ color: colors.text.muted }} />
                      ) : (
                        <ChevronDown size={14} style={{ color: colors.text.muted }} />
                      )}
                    </motion.button>

                    {/* Expanded Meal Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div 
                            className="p-3 ml-4 mt-1 mb-2 rounded-md space-y-3"
                            style={{ 
                              backgroundColor: colors.background.tertiary,
                              border: `1px solid ${colors.border.DEFAULT}`,
                            }}
                          >
                            {MEALS.map((meal) => (
                              <div key={meal.key} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span>{meal.icon}</span>
                                  <span 
                                    className="text-xs font-medium"
                                    style={{ color: colors.text.secondary }}
                                  >
                                    {meal.label}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Cal"
                                      value={dayData?.[`${meal.key}_calories`] || ''}
                                      onChange={(e) => handleMealUpdate(
                                        date, 
                                        meal.key, 
                                        'calories', 
                                        parseInt(e.target.value) || 0
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 rounded text-sm font-mono"
                                      style={{
                                        backgroundColor: colors.background.elevated,
                                        border: `1px solid ${colors.border.DEFAULT}`,
                                        color: colors.text.primary,
                                      }}
                                    />
                                    <span 
                                      className="text-xs"
                                      style={{ color: colors.text.muted }}
                                    >
                                      cal
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      placeholder="Protein"
                                      value={dayData?.[`${meal.key}_protein`] || ''}
                                      onChange={(e) => handleMealUpdate(
                                        date, 
                                        meal.key, 
                                        'protein', 
                                        parseInt(e.target.value) || 0
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 rounded text-sm font-mono"
                                      style={{
                                        backgroundColor: colors.background.elevated,
                                        border: `1px solid ${colors.border.DEFAULT}`,
                                        color: colors.text.primary,
                                      }}
                                    />
                                    <span 
                                      className="text-xs"
                                      style={{ color: colors.text.muted }}
                                    >
                                      g
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Weekly Summary */}
            <div 
              className="mt-4 pt-3 flex justify-between items-center"
              style={{ borderTop: `1px solid ${colors.border.DEFAULT}` }}
            >
              <span 
                className="text-xs font-medium"
                style={{ color: colors.text.muted }}
              >
                Weekly Total
              </span>
              <div className="flex items-center gap-4">
                <span 
                  className="text-sm font-mono font-medium"
                  style={{ color: colors.danger.DEFAULT }}
                >
                  {weeklyTotals.calories.toLocaleString()} cal
                </span>
                <span 
                  className="text-sm font-mono font-medium"
                  style={{ color: colors.success.DEFAULT }}
                >
                  {weeklyTotals.protein}g protein
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NutritionKPI;
