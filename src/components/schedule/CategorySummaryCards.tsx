/**
 * CategorySummaryCards Component
 *
 * Displays summary statistics per activity category
 */

import React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityCategory } from "@/lib/deepWorkService";

interface CategorySummaryCardsProps {
  categoryHours: Map<string, number>; // categoryId -> hours
  totalHours: number;
  categories: ActivityCategory[];
  className?: string;
}

export const CategorySummaryCards: React.FC<CategorySummaryCardsProps> = ({
  categoryHours,
  totalHours,
  categories,
  className,
}) => {
  // Sort categories by hours (descending), then by sort_order
  const sortedCategories = [...categories].sort((a, b) => {
    const hoursA = categoryHours.get(a.id) || 0;
    const hoursB = categoryHours.get(b.id) || 0;
    if (Math.abs(hoursA - hoursB) > 0.01) {
      return hoursB - hoursA;
    }
    return a.sort_order - b.sort_order;
  });

  if (sortedCategories.length === 0) {
    return null;
  }

  // Calculate grid columns based on number of categories
  const gridCols =
    sortedCategories.length <= 2
      ? "grid-cols-2"
      : sortedCategories.length <= 4
        ? "grid-cols-4"
        : "grid-cols-4 lg:grid-cols-6";

  return (
    <div className={cn("grid gap-3", gridCols, className)}>
      {sortedCategories.map((category) => {
        const hours = categoryHours.get(category.id) || 0;
        const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

        return (
          <div
            key={category.id}
            className="p-3 rounded-lg bg-surface-secondary border border-line/50"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-xs text-content-muted">
                {category.name}
              </span>
            </div>
            <div className="text-lg font-bold text-content-primary">
              {hours.toFixed(1)}h
            </div>
            {totalHours > 0 && hours > 0 && (
              <div className="text-xs text-content-muted">
                {percentage.toFixed(0)}%
              </div>
            )}
          </div>
        );
      })}

      {/* Total card */}
      {totalHours > 0 && (
        <div className="p-3 rounded-lg bg-surface-secondary border border-line/50">
          <div className="flex items-center justify-between mb-2">
            <Clock size={12} className="text-neon-cyan" />
            <span className="text-xs text-content-muted">Total</span>
          </div>
          <div className="text-lg font-bold text-content-primary">
            {totalHours.toFixed(1)}h
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySummaryCards;
