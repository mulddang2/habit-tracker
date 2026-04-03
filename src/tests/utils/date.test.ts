import { describe, it, expect } from "vitest";
import { formatDate, isToday } from "@/lib/utils/date";

describe("formatDate", () => {
  it("날짜를 yyyy-MM-dd 형식으로 변환한다", () => {
    const date = new Date(2026, 3, 3); // 2026-04-03
    expect(formatDate(date)).toBe("2026-04-03");
  });
});

describe("isToday", () => {
  it("오늘 날짜면 true를 반환한다", () => {
    expect(isToday(new Date())).toBe(true);
  });

  it("어제 날짜면 false를 반환한다", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });
});
