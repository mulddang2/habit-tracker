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

  it("탭이 다시 활성화되면 hydrate를 실행한다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    mockHydrateLocalDb.mockClear();

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("탭이 숨겨질 때는 hydrate를 실행하지 않는다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    mockHydrateLocalDb.mockClear();

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // hidden 상태 전환 시에는 트리거되지 않아야 함
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockHydrateLocalDb).not.toHaveBeenCalled();
  });

  it("창이 포커스되면 hydrate를 실행한다", async () => {
    const { wrapper } = createQueryWrapper();
    renderHook(() => useSyncOnReconnect(), { wrapper });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    mockHydrateLocalDb.mockClear();

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("언마운트 시 online·visibilitychange·focus 리스너를 모두 정리한다", async () => {
    const windowRemoveSpy = vi.spyOn(window, "removeEventListener");
    const documentRemoveSpy = vi.spyOn(document, "removeEventListener");

    const { wrapper } = createQueryWrapper();
    const { unmount } = renderHook(() => useSyncOnReconnect(), { wrapper });
    unmount();

    const removedWindowEvents = windowRemoveSpy.mock.calls.map(
      (call) => call[0]
    );
    const removedDocumentEvents = documentRemoveSpy.mock.calls.map(
      (call) => call[0]
    );

    expect(removedWindowEvents).toContain("online");
    expect(removedWindowEvents).toContain("focus");
    expect(removedDocumentEvents).toContain("visibilitychange");

    windowRemoveSpy.mockRestore();
    documentRemoveSpy.mockRestore();
  });
});
