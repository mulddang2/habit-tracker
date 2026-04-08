"use client";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useTodayLogs,
  useToggleHabitLog,
  habitLogKeys,
} from "@/hooks/useHabitLogs";
import { createQueryWrapper } from "@/tests/helpers/query-wrapper";
import type { HabitLog } from "@/types/habit";

vi.mock("@/lib/api/habitLogs", () => ({
  fetchLogsByDate: vi.fn(),
  fetchLogsByMonth: vi.fn(),
  toggleHabitLog: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { fetchLogsByDate, toggleHabitLog } from "@/lib/api/habitLogs";
import { toast } from "sonner";

const testDate = new Date("2026-04-07");

const mockLogs: HabitLog[] = [
  { id: "log-1", habit_id: "h1", completed_at: "2026-04-07" },
];

describe("useTodayLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("해당 날짜의 로그를 조회한다", async () => {
    vi.mocked(fetchLogsByDate).mockResolvedValue(mockLogs);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useTodayLogs(testDate), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLogs);
  });
});

describe("useToggleHabitLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("체크 시 옵티미스틱으로 로그를 즉시 추가한다", async () => {
    vi.mocked(toggleHabitLog).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitLogKeys.byDate("2026-04-07"), []);

    const { result } = renderHook(() => useToggleHabitLog(testDate), {
      wrapper,
    });

    result.current.mutate({ habitId: "h1", isCompleted: false });

    await waitFor(() => {
      const cached = queryClient.getQueryData<HabitLog[]>(
        habitLogKeys.byDate("2026-04-07")
      );
      expect(cached).toHaveLength(1);
      expect(cached?.[0].habit_id).toBe("h1");
    });
  });

  it("해제 시 옵티미스틱으로 로그를 즉시 제거한다", async () => {
    vi.mocked(toggleHabitLog).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitLogKeys.byDate("2026-04-07"), mockLogs);

    const { result } = renderHook(() => useToggleHabitLog(testDate), {
      wrapper,
    });

    result.current.mutate({ habitId: "h1", isCompleted: true });

    await waitFor(() => {
      const cached = queryClient.getQueryData<HabitLog[]>(
        habitLogKeys.byDate("2026-04-07")
      );
      expect(cached).toHaveLength(0);
    });
  });

  it("서버 에러 시 이전 상태로 롤백하고 토스트를 표시한다", async () => {
    vi.mocked(toggleHabitLog).mockRejectedValue(new Error("toggle error"));
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitLogKeys.byDate("2026-04-07"), mockLogs);

    const { result } = renderHook(() => useToggleHabitLog(testDate), {
      wrapper,
    });

    result.current.mutate({ habitId: "h1", isCompleted: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<HabitLog[]>(
      habitLogKeys.byDate("2026-04-07")
    );
    expect(cached).toHaveLength(1);
    expect(cached?.[0].habit_id).toBe("h1");
    expect(toast.error).toHaveBeenCalledWith(
      "습관 체크 변경에 실패했습니다. 다시 시도해주세요."
    );
  });
});
