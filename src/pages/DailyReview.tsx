/**
 * DailyReview Page
 *
 * Simplified daily entry with:
 * - Automated: Deep work (from commits), PRs (from GitHub)
 * - Manual: Sleep hours, Weight (only 2 inputs)
 * - Timeline view for visual breakdown and manual session entry
 */

import React, { useState, useCallback } from "react";
import { DailySchedule } from "@/components/schedule/DailySchedule";
import { QuickDailyEntry } from "@/components/daily/QuickDailyEntry";
import TypewriterText from "@/components/TypewriterText";

const DailyReview: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Callback to update date from child components
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <TypewriterText text="Daily Log" className="text-xl mb-2" />
        <p className="text-content-muted text-sm">
          Quick daily entry with automated deep work tracking
        </p>
      </div>

      {/* Quick Daily Entry - automated metrics + 2 manual inputs */}
      <QuickDailyEntry date={currentDate} onDateChange={handleDateChange} />

      {/* Timeline view for visual breakdown and manual session entry */}
      <DailySchedule
        initialDate={currentDate}
        onDateChange={handleDateChange}
      />
    </div>
  );
};

export default DailyReview;
