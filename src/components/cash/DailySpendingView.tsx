/**
 * DailySpendingView Component
 *
 * Wrapper that combines the calendar heat map and detail view.
 */

import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DailySpendingCalendar } from "./DailySpendingCalendar";
import { DailySpendingDetail } from "./DailySpendingDetail";
import type { Expense } from "./ExpensesTab";

interface DailySpendingViewProps {
  expenses: Expense[];
  hideBalances: boolean;
}

export const DailySpendingView: React.FC<DailySpendingViewProps> = ({
  expenses,
  hideBalances,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Calendar */}
      <DailySpendingCalendar
        expenses={expenses}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hideBalances={hideBalances}
      />

      {/* Detail Panel */}
      <AnimatePresence mode="wait">
        {selectedDate ? (
          <DailySpendingDetail
            key={selectedDate}
            date={selectedDate}
            expenses={expenses}
            hideBalances={hideBalances}
            onClose={() => setSelectedDate(null)}
          />
        ) : (
          <div className="p-4 rounded-lg bg-surface-secondary border border-line border-dashed flex items-center justify-center min-h-[300px]">
            <div className="text-center text-terminal-accent/40">
              <p>Select a day to view details</p>
              <p className="text-sm mt-1">Click any date on the calendar</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailySpendingView;
