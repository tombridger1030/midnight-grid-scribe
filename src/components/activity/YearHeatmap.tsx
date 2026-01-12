/**
 * YearHeatmap Component
 *
 * GitHub-style contribution heatmap showing daily activity for a year.
 */

import { useMemo } from "react";
import { DayData } from "@/hooks/useActivityData";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface YearHeatmapProps {
  title: string;
  data: DayData[];
  year: number;
  colorScale?: string[];
  unit?: string;
  onDayClick?: (date: string) => void;
}

const DEFAULT_COLORS = [
  "bg-[#161b22]",
  "bg-[#0e4429]",
  "bg-[#006d32]",
  "bg-[#26a641]",
  "bg-[#39d353]",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getColorLevel(
  value: number,
  maxValue: number,
  colors: string[],
): string {
  if (value === 0 || maxValue === 0) return colors[0];
  const ratio = value / maxValue;
  if (ratio <= 0.25) return colors[1];
  if (ratio <= 0.5) return colors[2];
  if (ratio <= 0.75) return colors[3];
  return colors[4];
}

function getCellColorClass(
  isCurrentYear: boolean,
  isFuture: boolean,
  value: number,
  maxValue: number,
  colorScale: string[],
): string {
  if (!isCurrentYear) return "bg-transparent";
  if (isFuture) return colorScale[0];
  return getColorLevel(value, maxValue, colorScale);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function YearHeatmap({
  title,
  data,
  year,
  colorScale = DEFAULT_COLORS,
  unit = "count",
  onDayClick,
}: YearHeatmapProps) {
  const dataMap = useMemo(() => {
    return data.reduce<Record<string, number>>((map, d) => {
      map[d.date] = d.value;
      return map;
    }, {});
  }, [data]);

  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value));
  }, [data]);

  const totalValue = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    const startOfYear = new Date(year, 0, 1);
    const firstDay = new Date(startOfYear);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    let currentDate = new Date(firstDay);
    for (let week = 0; week < 53; week++) {
      const weekDays: Date[] = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      result.push(weekDays);
    }
    return result;
  }, [year]);

  // Calculate month label positions based on week index
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const dayInYear = week.find((d) => d.getFullYear() === year);
      if (dayInYear) {
        const month = dayInYear.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });
    return labels;
  }, [weeks, year]);

  const cellSize = 10;
  const cellGap = 2;
  const weekWidth = cellSize + cellGap;

  return (
    <div className="bg-[#0d0d0d] border border-[#222] rounded-lg p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#e0e0e0]">{title}</h3>
        <span className="text-xs text-[#6e7681]">
          {Math.round(totalValue * 10) / 10} {unit}
        </span>
      </div>

      {/* Month labels row */}
      <div className="relative h-4 ml-6 mb-1 overflow-hidden">
        {monthLabels.map(({ month, weekIndex }, idx) => (
          <span
            key={idx}
            className="absolute text-[10px] text-[#6e7681]"
            style={{ left: `${weekIndex * weekWidth}px` }}
          >
            {month}
          </span>
        ))}
      </div>

      {/* Grid container */}
      <div className="flex">
        {/* Day labels - only Mon, Wed, Fri */}
        <div className="flex flex-col justify-around pr-1 w-5">
          <span className="text-[9px] text-[#6e7681] h-[10px]"></span>
          <span className="text-[9px] text-[#6e7681] h-[10px]">M</span>
          <span className="text-[9px] text-[#6e7681] h-[10px]"></span>
          <span className="text-[9px] text-[#6e7681] h-[10px]">W</span>
          <span className="text-[9px] text-[#6e7681] h-[10px]"></span>
          <span className="text-[9px] text-[#6e7681] h-[10px]">F</span>
          <span className="text-[9px] text-[#6e7681] h-[10px]"></span>
        </div>

        {/* Week columns */}
        <div className="flex" style={{ gap: `${cellGap}px` }}>
          {weeks.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="flex flex-col"
              style={{ gap: `${cellGap}px` }}
            >
              {week.map((day, dayIdx) => {
                const dateStr = formatDate(day);
                const value = dataMap[dateStr] || 0;
                const isCurrentYear = day.getFullYear() === year;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isFuture = day > today;
                const isToday = formatDate(new Date()) === dateStr;
                const isInteractive = isCurrentYear && !isFuture;

                const colorClass = getCellColorClass(
                  isCurrentYear,
                  isFuture,
                  value,
                  maxValue,
                  colorScale,
                );

                return (
                  <Tooltip key={dayIdx}>
                    <TooltipTrigger asChild>
                      <button
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                        }}
                        className={`rounded-[2px] ${colorClass} ${
                          isInteractive
                            ? "hover:ring-1 hover:ring-[#555] cursor-pointer"
                            : ""
                        } ${isToday ? "ring-1 ring-cyan-500" : ""}`}
                        onClick={() => isInteractive && onDayClick?.(dateStr)}
                        disabled={!isInteractive}
                      />
                    </TooltipTrigger>
                    {isInteractive && (
                      <TooltipContent
                        side="top"
                        className="bg-[#1c1c1c] border-[#333] text-[#e0e0e0] text-xs px-2 py-1"
                      >
                        <span className="font-medium">
                          {value > 0
                            ? `${Math.round(value * 10) / 10} ${unit}`
                            : `No ${unit}`}
                        </span>
                        <span className="text-[#6e7681] ml-2">
                          {formatDisplayDate(dateStr)}
                        </span>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-[9px] text-[#6e7681] justify-end mt-2">
        <span>Less</span>
        {colorScale.map((color, idx) => (
          <div
            key={idx}
            style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
            className={`rounded-[2px] ${color}`}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export default YearHeatmap;
