"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarGridProps {
  month: Date;
  dailyRates: Record<string, number>;
}

function getRateColor(rate: number | undefined): string {
  if (!rate || rate === 0) return "";
  if (rate < 0.25) return "bg-emerald-100 dark:bg-emerald-950";
  if (rate < 0.5) return "bg-emerald-300 dark:bg-emerald-800";
  if (rate < 0.75) return "bg-emerald-500 dark:bg-emerald-600 text-white";
  return "bg-emerald-700 dark:bg-emerald-500 text-white";
}

export function CalendarGrid({ month, dailyRates }: CalendarGridProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [month]);

  // 7일씩 주 단위로 그룹핑
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  return (
    <div role="grid" aria-label="월별 달성률 캘린더">
      {/* 요일 헤더 */}
      <div className="mb-2 grid grid-cols-7 text-center" role="row">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            role="columnheader"
            className="text-muted-foreground py-1 text-xs font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 gap-1" role="row">
          {week.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const rate = dailyRates[dateStr];
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            const ratePercent = rate !== undefined ? Math.round(rate * 100) : 0;

            return (
              <div
                key={dateStr}
                role="gridcell"
                aria-label={
                  rate !== undefined
                    ? `${format(day, "M월 d일")}: 달성률 ${ratePercent}%`
                    : format(day, "M월 d일")
                }
                aria-current={today ? "date" : undefined}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-sm transition-colors",
                  inMonth ? "text-foreground" : "text-muted-foreground/40",
                  inMonth && getRateColor(rate),
                  today && "ring-primary ring-2 ring-offset-1",
                  !rate && inMonth && "hover:bg-muted"
                )}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
