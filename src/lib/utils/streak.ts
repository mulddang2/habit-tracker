import { format, subDays, parseISO } from "date-fns";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * 특정 습관의 연속 달성(스트릭)을 계산한다.
 * @param completedDates - "yyyy-MM-dd" 형식의 완료 날짜 배열
 * @param today - 기준일 (기본: 오늘)
 */
export function calculateStreak(
  completedDates: string[],
  today: Date = new Date()
): StreakResult {
  if (completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateSet = new Set(completedDates);

  // 현재 스트릭: 오늘 또는 어제부터 연속된 날 수
  let currentStreak = 0;
  let checkDate = format(today, "yyyy-MM-dd");

  // 오늘 완료하지 않았으면 어제부터 체크
  if (!dateSet.has(checkDate)) {
    checkDate = format(subDays(today, 1), "yyyy-MM-dd");
  }

  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = format(subDays(parseISO(checkDate), 1), "yyyy-MM-dd");
  }

  // 최장 스트릭: 전체 날짜를 정렬해서 계산
  const sorted = [...completedDates].sort();
  let longestStreak = 1;
  let streak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1]);
    const curr = parseISO(sorted[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else if (diffDays > 1) {
      streak = 1;
    }
    // diffDays === 0 (중복 날짜)은 무시
  }

  return { currentStreak, longestStreak };
}

/**
 * 월별 날짜별 달성률을 계산한다.
 * @param logs - { habit_id, completed_at } 배열
 * @param totalHabits - 전체 습관 개수
 * @returns { "yyyy-MM-dd": 달성률(0~1) } 맵
 */
export function calculateMonthlyRates(
  logs: { habit_id: string; completed_at: string }[],
  totalHabits: number
): Record<string, number> {
  if (totalHabits === 0) return {};

  const countByDate: Record<string, Set<string>> = {};

  for (const log of logs) {
    if (!countByDate[log.completed_at]) {
      countByDate[log.completed_at] = new Set();
    }
    countByDate[log.completed_at].add(log.habit_id);
  }

  const rates: Record<string, number> = {};
  for (const [date, habitIds] of Object.entries(countByDate)) {
    rates[date] = habitIds.size / totalHabits;
  }

  return rates;
}
