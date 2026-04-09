import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWeeklyStats, useMonthlyHabitStats } from "@/hooks/useStats";
import { createQueryWrapper } from "@/tests/helpers/query-wrapper";
import type { Habit, HabitLog } from "@/types/habit";

vi.mock("@/lib/api/habits", () => ({
  fetchHabits: vi.fn(),
}));

vi.mock("@/lib/api/habitLogs", () => ({
  fetchLogsByDate: vi.fn(),
  fetchLogsByMonth: vi.fn(),
  fetchWeeklyLogs: vi.fn(),
  toggleHabitLog: vi.fn(),
}));

import { fetchHabits } from "@/lib/api/habits";
import { fetchWeeklyLogs, fetchLogsByMonth } from "@/lib/api/habitLogs";

const mockHabits: Habit[] = [
  {
    id: "h1",
    user_id: "u1",
    title: "운동",
    category: "운동",
    reminder_time: null,
    order: 1,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  },
  {
    id: "h2",
    user_id: "u1",
    title: "독서",
    category: "공부",
    reminder_time: null,
    order: 2,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  },
];

const mockLogs: HabitLog[] = [
  { id: "l1", habit_id: "h1", completed_at: "2026-04-07" },
  { id: "l2", habit_id: "h2", completed_at: "2026-04-07" },
  { id: "l3", habit_id: "h1", completed_at: "2026-04-06" },
];

describe("useWeeklyStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("습관이 없으면 빈 배열을 반환한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue([]);
    vi.mocked(fetchWeeklyLogs).mockResolvedValue([]);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useWeeklyStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dailyRates).toEqual([]);
    expect(result.current.weeklyRates).toEqual([]);
  });

  it("일별 달성률을 올바르게 계산한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchWeeklyLogs).mockResolvedValue(mockLogs);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useWeeklyStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // 4/7: 2개 습관 모두 완료 → 100%
    const apr7 = result.current.dailyRates.find((d) => d.date === "2026-04-07");
    expect(apr7?.rate).toBe(100);
    expect(apr7?.completed).toBe(2);

    // 4/6: 1개 완료 → 50%
    const apr6 = result.current.dailyRates.find((d) => d.date === "2026-04-06");
    expect(apr6?.rate).toBe(50);
    expect(apr6?.completed).toBe(1);
  });

  it("주간 달성률을 올바르게 계산한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchWeeklyLogs).mockResolvedValue(mockLogs);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useWeeklyStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.weeklyRates.length).toBeGreaterThan(0);

    // 모든 주간 달성률은 0~100 범위
    for (const week of result.current.weeklyRates) {
      expect(week.rate).toBeGreaterThanOrEqual(0);
      expect(week.rate).toBeLessThanOrEqual(100);
    }
  });
});

describe("useMonthlyHabitStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("습관이 없으면 빈 배열과 달성률 0을 반환한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue([]);
    vi.mocked(fetchLogsByMonth).mockResolvedValue([]);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useMonthlyHabitStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.habitRates).toEqual([]);
    expect(result.current.overallRate).toBe(0);
  });

  it("습관별 달성률을 올바르게 계산한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByMonth).mockResolvedValue(mockLogs);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useMonthlyHabitStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.habitRates).toHaveLength(2);

    const exercise = result.current.habitRates.find((h) => h.habitId === "h1");
    expect(exercise?.title).toBe("운동");
    // h1은 4/6, 4/7 두 날 완료
    expect(exercise?.completed).toBe(2);

    const reading = result.current.habitRates.find((h) => h.habitId === "h2");
    // h2는 4/7 한 날만 완료
    expect(reading?.completed).toBe(1);
  });

  it("전체 달성률은 습관별 평균이다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByMonth).mockResolvedValue(mockLogs);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(
      () => useMonthlyHabitStats(new Date("2026-04-07")),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const avg = Math.round(
      result.current.habitRates.reduce((sum, h) => sum + h.rate, 0) /
        result.current.habitRates.length
    );
    expect(result.current.overallRate).toBe(avg);
  });
});
