/**
 * DailyReview Page
 *
 * Timeline view of daily deep work sessions with work/personal breakdown.
 */

import React from "react";
import { DailySchedule } from "@/components/schedule/DailySchedule";
import TypewriterText from "@/components/TypewriterText";

const DailyReview: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <TypewriterText text="Daily Schedule Review" className="text-xl mb-2" />
        <p className="text-content-muted text-sm">
          Review your daily deep work sessions with work vs personal breakdown
        </p>
      </div>

      {/* Daily Schedule Component */}
      <DailySchedule />
    </div>
  );
};

export default DailyReview;
