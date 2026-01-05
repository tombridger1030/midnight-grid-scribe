/**
 * Roadmap Page v4
 * 
 * Clean redesign matching Dashboard/Cash/Weekly KPIs design language.
 * Features:
 * - HeroProjection at top showing projected year-end
 * - 4 GoalCards stacked vertically (all visible without scroll)
 * - Modal-based editing
 * - Framer Motion animations
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useGoals, Goal } from '@/hooks/useGoals';
import GoalCard from '@/components/roadmap/GoalCard';
import GoalModal from '@/components/roadmap/GoalModal';
import HeroProjection from '@/components/roadmap/HeroProjection';

const Roadmap: React.FC = () => {
  const { goals, isLoading, addGoal, updateGoal, deleteGoal } = useGoals();
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<{ open: boolean; goal?: Goal }>({
    open: false,
  });

  const currentYear = new Date().getFullYear();

  const handleToggleExpand = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const handleSave = async (goalData: Omit<Goal, 'id'> | Goal) => {
    if ('id' in goalData) {
      await updateGoal(goalData.id, goalData);
    } else {
      await addGoal(goalData);
    }
  };

  const handleDelete = async () => {
    if (modalState.goal) {
      await deleteGoal(modalState.goal.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-xl font-medium text-[#E8E8E8] tracking-wide">
              Roadmap {currentYear}
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Yearly goals with monthly and weekly breakdowns
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalState({ open: true })}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#141414] border border-[#1F1F1F] text-[#E8E8E8] hover:border-[#2A2A2A] hover:bg-[#1A1A1A] transition-all"
          >
            <Plus size={16} />
            Add Goal
          </motion.button>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[#6B6B6B]"
            >
              Loading goals...
            </motion.div>
          </div>
        ) : goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-20 rounded-lg border border-dashed border-[#1F1F1F]"
          >
            <p className="text-[#6B6B6B] mb-6">No goals configured yet</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setModalState({ open: true })}
              className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-[#00F0FF] text-[#0A0A0A] font-medium hover:bg-[#00D4E0] transition-colors"
            >
              <Plus size={16} />
              Create your first goal
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Hero Projection */}
            <HeroProjection goals={goals} />

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-[#1F1F1F] to-transparent" />

            {/* Goal Cards */}
            <div className="space-y-3">
              {goals.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isExpanded={expandedGoals.has(goal.id)}
                  onToggle={() => handleToggleExpand(goal.id)}
                  onEdit={() => setModalState({ open: true, goal })}
                  index={index}
                />
              ))}
            </div>

            {/* Add another goal button (subtle) */}
            {goals.length < 6 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setModalState({ open: true })}
                className="w-full py-3 text-sm text-[#6B6B6B] border border-dashed border-[#1F1F1F] rounded-lg hover:border-[#2A2A2A] hover:text-[#A0A0A0] transition-colors"
              >
                + Add another goal
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <GoalModal
        isOpen={modalState.open}
        onClose={() => setModalState({ open: false })}
        goal={modalState.goal}
        onSave={handleSave}
        onDelete={modalState.goal ? handleDelete : undefined}
      />
    </div>
  );
};

export default Roadmap;
