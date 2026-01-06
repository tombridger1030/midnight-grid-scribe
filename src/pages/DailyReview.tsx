/**
 * DailyReview Page
 *
 * Timeline view of daily deep work sessions with work vs personal breakdown.
 */

import React, { useState, useCallback } from "react";
import { DailySchedule } from "@/components/schedule/DailySchedule";
import { DailyChecklist } from "@/components/daily/DailyChecklist";
import TypewriterText from "@/components/TypewriterText";

const DailyReview: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Callback to update date from DailySchedule
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <TypewriterText text="Daily Schedule Review" className="text-xl mb-2" />
        <p className="text-content-muted text-sm">
          Review your daily deep work sessions with work vs personal breakdown
        </p>
      </div>

      {/* Daily Checklist - uses shared date */}
      <DailyChecklist date={currentDate} />

      {/* Daily Schedule Component - passes shared date and change handler */}
      <DailySchedule
        initialDate={currentDate}
        onDateChange={handleDateChange}
      />
    </div>
  );
};

export default DailyReview;
