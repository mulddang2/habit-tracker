import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncOnReconnect } from "@/hooks/useSyncOnReconnect";
import { habitKeys } from "@/hooks/useHabits";
import { habitLogKeys } from "@/hooks/useHabitLogs";
import { createQueryWrapper } from "@/tests/helpers/query-wrapper";

const mockFlush = vi.fn();
const mockHydrateLocalDb = vi.fn();

vi.mock("@/lib/db/sync", () => ({
  flush: (...args: unknown[]) => mockFlush(...args),
}));

vi.mock("@/lib/db/hydrate", () => ({
  hydrateLocalDb: (...args: unknown[]) => mockHydrateLocalDb(...args),
}));

describe("useSyncOnReconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlush.mockResolvedValue(undefined);
    mockHydrateLocalDb.mockResolvedValue(undefined);
  });

  it("최초 로드 시 항상 서버 데이터로 hydrate한다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("hydrate 직후 habits·habit_logs 쿼리를 무효화한다", async () => {
    const { wrapper, queryClient } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: habitKeys.all });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: habitLogKeys.all,
      });
    });
  });

  it("온라인 복귀 시 flush 후 hydrate를 실행한다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    mockFlush.mockClear();
    mockHydrateLocalDb.mockClear();

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await vi.waitFor(() => {
      expect(mockFlush).toHaveBeenCalled();
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("온라인 복귀 시 flush가 실패해도 에러가 전파되지 않는다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    mockFlush.mockClear();
    mockFlush.mockRejectedValue(new Error("sync failed"));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await vi.waitFor(() => {
      expect(mockFlush).toHaveBeenCalled();
    });
  });

  it("언마운트 시 online 이벤트 리스너를 정리한다", async () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { wrapper } = createQueryWrapper();
    const { unmount } = renderHook(() => useSyncOnReconnect(), { wrapper });
    unmount();

    const removedEvents = removeEventListenerSpy.mock.calls.map(
      (call) => call[0]
    );
    expect(removedEvents).toContain("online");

    removeEventListenerSpy.mockRestore();
  });
});
