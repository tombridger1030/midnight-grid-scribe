/**
 * RecordsPanel Component
 * 
 * Shows personal bests for each KPI.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { PersonalRecord } from '@/lib/analyticsCalculations';

interface RecordsPanelProps {
  records: PersonalRecord[];
}

export const RecordsPanel: React.FC<RecordsPanelProps> = ({ records }) => {
  // Sort by most recent first
  const sortedRecords = [...records].sort((a, b) => 
    b.weekKey.localeCompare(a.weekKey)
  );

  return (
    <div className="rounded-xl bg-surface-secondary border border-line p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-[#FFB800]" />
        <h3 className="text-sm font-semibold text-terminal-accent uppercase tracking-wider">
          Personal Records
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sortedRecords.map((record, index) => (
          <motion.div
            key={record.kpiId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-lg bg-surface-primary/50 border border-line text-center"
          >
            <div className="text-xs text-terminal-accent/50 mb-1">
              {record.kpiName}
            </div>
            <div className="text-2xl font-bold font-mono text-[#FFB800]">
              {typeof record.value === 'number' 
                ? record.value.toLocaleString()
                : record.value
              }
            </div>
            <div className="text-xs text-terminal-accent/40 mt-1">
              {record.weekKey}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecordsPanel;
