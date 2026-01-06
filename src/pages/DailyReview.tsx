/**
 * DailyReview Page
 *
 * Timeline view of daily deep work sessions with work/personal breakdown.
 */

import React, { useState } from "react";
import { DailySchedule } from "@/components/schedule/DailySchedule";
import { DailyChecklist } from "@/components/daily/DailyChecklist";
import TypewriterText from "@/components/TypewriterText";

const DailyReview: React.FC = () => {
  const [selectedDate] = useState(new Date());

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <TypewriterText text="Daily Schedule Review" className="text-xl mb-2" />
        <p className="text-content-muted text-sm">
          Review your daily deep work sessions with work vs personal breakdown
        </p>
      </div>

      {/* Daily Checklist */}
      <DailyChecklist date={selectedDate} />

      {/* Daily Schedule Component */}
      <DailySchedule />
    </div>
  );
};

export default DailyReview;
