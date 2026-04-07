import { describe, it, expect } from "vitest";
import { calculateStreak, calculateMonthlyRates } from "@/lib/utils/streak";

describe("calculateStreak", () => {
  const today = new Date("2026-04-07");

  it("빈 배열이면 스트릭 0을 반환한다", () => {
    const result = calculateStreak([], today);
    expect(result).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("오늘만 완료하면 현재 스트릭 1, 최장 스트릭 1", () => {
    const result = calculateStreak(["2026-04-07"], today);
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("오늘 포함 3일 연속이면 현재 스트릭 3", () => {
    const result = calculateStreak(
      ["2026-04-05", "2026-04-06", "2026-04-07"],
      today
    );
    expect(result).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("오늘 미완료 + 어제까지 연속이면 어제부터 카운트", () => {
    const result = calculateStreak(
      ["2026-04-04", "2026-04-05", "2026-04-06"],
      today
    );
    expect(result).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("오늘도 어제도 미완료면 현재 스트릭 0", () => {
    const result = calculateStreak(
      ["2026-04-01", "2026-04-02", "2026-04-03"],
      today
    );
    expect(result).toEqual({ currentStreak: 0, longestStreak: 3 });
  });

  it("중간에 끊긴 경우 최장 스트릭이 더 길다", () => {
    const result = calculateStreak(
      [
        "2026-04-01",
        "2026-04-02",
        "2026-04-03",
        "2026-04-04",
        // 4/5 빠짐
        "2026-04-06",
        "2026-04-07",
      ],
      today
    );
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });

  it("하루만 완료된 경우 최장 스트릭 1", () => {
    const result = calculateStreak(["2026-04-01"], today);
    expect(result.longestStreak).toBe(1);
  });
});

describe("calculateMonthlyRates", () => {
  it("습관이 0개면 빈 객체 반환", () => {
    const result = calculateMonthlyRates([], 0);
    expect(result).toEqual({});
  });

  it("로그가 없으면 빈 객체 반환", () => {
    const result = calculateMonthlyRates([], 3);
    expect(result).toEqual({});
  });

  it("2개 습관 중 1개 완료 시 달성률 0.5", () => {
    const logs = [{ habit_id: "h1", completed_at: "2026-04-07" }];
    const result = calculateMonthlyRates(logs, 2);
    expect(result["2026-04-07"]).toBe(0.5);
  });

  it("같은 날 모든 습관 완료 시 달성률 1", () => {
    const logs = [
      { habit_id: "h1", completed_at: "2026-04-07" },
      { habit_id: "h2", completed_at: "2026-04-07" },
    ];
    const result = calculateMonthlyRates(logs, 2);
    expect(result["2026-04-07"]).toBe(1);
  });

  it("여러 날짜에 대해 각각 달성률을 계산한다", () => {
    const logs = [
      { habit_id: "h1", completed_at: "2026-04-01" },
      { habit_id: "h2", completed_at: "2026-04-01" },
      { habit_id: "h1", completed_at: "2026-04-02" },
    ];
    const result = calculateMonthlyRates(logs, 2);
    expect(result["2026-04-01"]).toBe(1);
    expect(result["2026-04-02"]).toBe(0.5);
  });

  it("같은 습관 중복 로그는 한 번만 카운트한다", () => {
    const logs = [
      { habit_id: "h1", completed_at: "2026-04-07" },
      { habit_id: "h1", completed_at: "2026-04-07" },
    ];
    const result = calculateMonthlyRates(logs, 2);
    expect(result["2026-04-07"]).toBe(0.5);
  });
});
