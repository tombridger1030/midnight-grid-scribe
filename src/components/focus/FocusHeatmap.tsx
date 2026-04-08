import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { focusTokens } from "@/styles/focus-tokens";
import { type FocusDaySummary, formatClockLabel } from "@/lib/focusService";

interface FocusHeatmapProps {
  year: number;
  summaries: FocusDaySummary[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

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

const LEVELS = [
  { label: "0", minHours: 0, color: focusTokens.colors.heatmap.empty },
  { label: "2h", minHours: 0.01, color: focusTokens.colors.heatmap.level1 },
  { label: "5h", minHours: 2, color: focusTokens.colors.heatmap.level2 },
  { label: "8h", minHours: 5, color: focusTokens.colors.heatmap.level3 },
  { label: "10h", minHours: 8, color: focusTokens.colors.heatmap.level4 },
  { label: "10h+", minHours: 10, color: focusTokens.colors.heatmap.level5 },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHeatColor(hours: number): string {
  if (hours >= 10) return focusTokens.colors.heatmap.level5;
  if (hours >= 8) return focusTokens.colors.heatmap.level4;
  if (hours >= 5) return focusTokens.colors.heatmap.level3;
  if (hours >= 2) return focusTokens.colors.heatmap.level2;
  if (hours > 0) return focusTokens.colors.heatmap.level1;
  return focusTokens.colors.heatmap.empty;
}

function formatHours(hours: number): string {
  if (hours === 0) return "0.0h";
  return `${hours.toFixed(1)}h`;
}

export function FocusHeatmap({
  year,
  summaries,
  selectedDate,
  onSelectDate,
}: FocusHeatmapProps) {
  const summaryMap = useMemo(() => {
    return summaries.reduce<Record<string, FocusDaySummary>>((acc, summary) => {
      acc[summary.date] = summary;
      return acc;
    }, {});
  }, [summaries]);

  const weeks = useMemo(() => {
    const items: Date[][] = [];
    const firstDay = new Date(year, 0, 1);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    let cursor = new Date(firstDay);
    for (let week = 0; week < 53; week += 1) {
      const weekDays: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        weekDays.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      items.push(weekDays);
    }

    return items;
  }, [year]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const inYear = week.find((day) => day.getFullYear() === year);
      if (!inYear) return;
      const month = inYear.getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], weekIndex });
        lastMonth = month;
      }
    });

    return labels;
  }, [weeks, year]);

  const totalHours = useMemo(() => {
    return summaries.reduce((sum, item) => sum + item.totalHours, 0);
  }, [summaries]);

  const cellSize = 11;
  const cellGap = 3;
  const today = formatDate(new Date());

  return (
    <div
      className="relative overflow-hidden border"
      style={{
        backgroundColor: focusTokens.colors.panel,
        borderColor: focusTokens.colors.border,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_42%)]" />

      <div className="relative border-b px-5 py-4 md:px-6 md:py-5" style={{ borderColor: focusTokens.colors.border }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.35em]"
              style={{ color: focusTokens.colors.textDim }}
            >
              Annual Focus Density
            </p>
            <h2
              className="mt-3 font-mono text-xl uppercase md:text-2xl"
              style={{ color: focusTokens.colors.text }}
            >
              Work Heatmap {year}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: focusTokens.colors.textDim }}>
                Total
              </div>
              <div className="mt-1 font-mono text-lg" style={{ color: focusTokens.colors.text }}>
                {totalHours.toFixed(1)}h
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: focusTokens.colors.textDim }}>
                Target Band
              </div>
              <div className="mt-1 font-mono text-lg" style={{ color: focusTokens.colors.successStrong }}>
                10h+
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto px-4 py-5 md:px-6">
        <div className="min-w-[780px]">
          <div className="relative mb-2 ml-7 h-4">
            {monthLabels.map((label) => (
              <span
                key={label.label}
                className="absolute text-[10px] uppercase tracking-[0.22em]"
                style={{
                  left: `${label.weekIndex * (cellSize + cellGap)}px`,
                  color: focusTokens.colors.textDim,
                }}
              >
                {label.label}
              </span>
            ))}
          </div>

          <div className="flex">
            <div className="mr-2 flex w-5 flex-col justify-around text-[10px] uppercase tracking-[0.22em]" style={{ color: focusTokens.colors.textDim }}>
              <span />
              <span>M</span>
              <span />
              <span>W</span>
              <span />
              <span>F</span>
              <span />
            </div>

            <div className="flex" style={{ gap: `${cellGap}px` }}>
              {weeks.map((week, weekIndex) => (
                <div
                  key={`week-${weekIndex}`}
                  className="flex flex-col"
                  style={{ gap: `${cellGap}px` }}
                >
                  {week.map((day) => {
                    const date = formatDate(day);
                    const summary = summaryMap[date];
                    const inYear = day.getFullYear() === year;
                    const future = date > today;
                    const isSelected = selectedDate === date;
                    const isToday = date === today;

                    const backgroundColor = !inYear || future
                      ? "transparent"
                      : getHeatColor(summary?.totalHours ?? 0);

                    return (
                      <Tooltip key={date}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={!inYear || future}
                            onClick={() => onSelectDate(date)}
                            className="transition-transform hover:scale-[1.12] disabled:cursor-default"
                            style={{
                              width: `${cellSize}px`,
                              height: `${cellSize}px`,
                              backgroundColor,
                              border: `1px solid ${
                                isSelected
                                  ? focusTokens.colors.successStrong
                                  : isToday
                                    ? focusTokens.colors.borderStrong
                                    : "rgba(255,255,255,0.03)"
                              }`,
                              boxShadow: isSelected
                                ? `0 0 0 1px ${focusTokens.colors.successStrong}`
                                : "none",
                            }}
                            aria-label={`${date} ${summary?.totalHours ?? 0} hours`}
                          />
                        </TooltipTrigger>
                        {inYear && !future && (
                          <TooltipContent
                            side="top"
                            className="border bg-black/95 px-3 py-2"
                            style={{
                              borderColor: focusTokens.colors.borderStrong,
                              color: focusTokens.colors.text,
                            }}
                          >
                            <div className="space-y-1 font-mono text-[11px]">
                              <div>{date}</div>
                              <div style={{ color: focusTokens.colors.successStrong }}>
                                {formatHours(summary?.totalHours ?? 0)}
                              </div>
                              <div style={{ color: focusTokens.colors.textMuted }}>
                                In {formatClockLabel(summary?.firstStartedAt ?? null)}
                              </div>
                              <div style={{ color: focusTokens.colors.textMuted }}>
                                Out {formatClockLabel(summary?.lastEndedAt ?? null)}
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4 md:px-6"
        style={{ borderColor: focusTokens.colors.border }}
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: focusTokens.colors.textDim }}>
          <span>Scale</span>
          {LEVELS.map((level) => (
            <div key={level.label} className="flex items-center gap-2">
              <span
                className="block h-[10px] w-[10px] border"
                style={{
                  backgroundColor: level.color,
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              />
              <span>{level.label}</span>
            </div>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: focusTokens.colors.textDim }}>
          Click any day to inspect exact start and finish windows
        </div>
      </div>
    </div>
  );
}

export default FocusHeatmap;

