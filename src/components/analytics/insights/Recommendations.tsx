/**
 * Recommendations Component
 * 
 * Shows data-driven recommendations for improvement.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Target, Lightbulb, AlertTriangle, Link } from 'lucide-react';
import type { Recommendation } from '@/lib/analyticsCalculations';

interface RecommendationsProps {
  recommendations: Recommendation[];
}

const TYPE_CONFIG: Record<Recommendation['type'], { icon: typeof Target; color: string }> = {
  focus: { icon: Target, color: '#00F0FF' },
  opportunity: { icon: Lightbulb, color: '#00FF88' },
  warning: { icon: AlertTriangle, color: '#FFB800' },
  insight: { icon: Link, color: '#9D4EDD' },
};

const IMPACT_COLORS: Record<Recommendation['impact'], string> = {
  high: '#FF3366',
  medium: '#FFB800',
  low: '#6B6B6B',
};

export const Recommendations: React.FC<RecommendationsProps> = ({
  recommendations,
}) => {
  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 uppercase tracking-wider">
        Recommendations
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const config = TYPE_CONFIG[rec.type];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-surface-primary/50 border border-line"
            >
              <div className="flex items-start gap-3">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-terminal-accent">
                      {rec.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${IMPACT_COLORS[rec.impact]}20`,
                        color: IMPACT_COLORS[rec.impact],
                      }}
                    >
                      {rec.impact} impact
                    </span>
                  </div>
                  <div className="text-xs text-terminal-accent/60">
                    {rec.description}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Recommendations;
