/**
 * TimelineView Component
 *
 * 15-minute block grid visualization of daily activity
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineBlock as TimelineBlockType } from "@/lib/deepWorkService";

interface TimelineViewProps {
  blocks: TimelineBlockType[];
  onBlockClick?: (block: TimelineBlockType) => void;
  className?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  blocks,
  onBlockClick,
  className,
}) => {
  const [hoveredBlock, setHoveredBlock] = useState<TimelineBlockType | null>(
    null,
  );

  // Group blocks by hour for display
  const hourlyBlocks: TimelineBlockType[][] = [];
  for (let hour = 0; hour < 24; hour++) {
    hourlyBlocks.push(blocks.filter((b) => b.hour === hour));
  }

  // Calculate coverage percentage for the day
  const coveredBlocks = blocks.filter((b) => b.coverage > 0).length;
  const coveragePercentage = (coveredBlocks / blocks.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-neon-cyan" />
          <span className="text-sm text-content-muted">15-min blocks</span>
        </div>
        <div className="text-sm text-content-muted">
          {coveragePercentage.toFixed(0)}% covered
        </div>
      </div>

      {/* Timeline grid */}
      <div className="space-y-1">
        {hourlyBlocks.map((hourBlocks, hourIndex) => {
          // Skip completely empty hours to reduce clutter
          const hasActivity = hourBlocks.some((b) => b.coverage > 0);
          const showHour =
            hasActivity ||
            hourIndex === 0 ||
            hourIndex === 6 ||
            hourIndex === 12 ||
            hourIndex === 18;

          if (!showHour && hourIndex > 0) {
            // Check if we should show this hour as a spacer
            const prevHourHasActivity =
              hourIndex > 0 &&
              hourlyBlocks[hourIndex - 1].some((b) => b.coverage > 0);
            const nextHourHasActivity =
              hourIndex < 23 &&
              hourlyBlocks[hourIndex + 1].some((b) => b.coverage > 0);

            if (!prevHourHasActivity && !nextHourHasActivity) {
              return null;
            }
          }

          return (
            <div
              key={hourIndex}
              className="flex items-center gap-2"
              onMouseLeave={() => setHoveredBlock(null)}
            >
              {/* Hour label */}
              <div className="w-12 text-xs text-content-muted font-mono text-right shrink-0">
                {hourIndex.toString().padStart(2, "0")}:00
              </div>

              {/* 15-min blocks for this hour */}
              <div className="flex-1 grid grid-cols-4 gap-1">
                <AnimatePresence mode="popLayout">
                  {hourBlocks.map((block) => {
                    const isEmpty = block.coverage === 0;
                    const isHovered =
                      hoveredBlock?.hour === block.hour &&
                      hoveredBlock?.quarter === block.quarter;

                    return (
                      <motion.div
                        key={`${block.hour}-${block.quarter}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          delay: (hourIndex * 4 + block.quarter) * 0.005,
                        }}
                        onMouseEnter={() => setHoveredBlock(block)}
                        onClick={() => onBlockClick && onBlockClick(block)}
                        className={cn(
                          "h-6 rounded-sm transition-all cursor-pointer relative",
                          isEmpty
                            ? "bg-surface-tertiary/30 hover:bg-surface-tertiary/50"
                            : "hover:ring-1 hover:ring-white/30",
                        )}
                        style={
                          !isEmpty
                            ? {
                                backgroundColor: block.categoryColor,
                                opacity: 0.3 + block.coverage * 0.7,
                              }
                            : undefined
                        }
                        title={
                          block.sessionIds.length > 0
                            ? `${block.categoryName}: ${block.timeLabel}`
                            : "Empty - click to add session"
                        }
                      >
                        {/* Hover tooltip */}
                        {isHovered && !isEmpty && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface-tertiary border border-line rounded text-xs whitespace-nowrap z-10 pointer-events-none">
                            <div className="font-medium">
                              {block.categoryName}
                            </div>
                            <div className="text-content-muted">
                              {block.timeLabel}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs pt-2 border-t border-line/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-surface-tertiary/30" />
          <span className="text-content-muted">Unaccounted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-surface-tertiary/30 border border-white/20" />
          <span className="text-content-muted">Partial coverage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-neon-cyan" />
          <span className="text-content-muted">Full coverage</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
