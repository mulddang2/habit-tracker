import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncOnReconnect } from "@/hooks/useSyncOnReconnect";

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
    renderHook(() => useSyncOnReconnect());

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("온라인 복귀 시 flush 후 hydrate를 실행한다", async () => {
    renderHook(() => useSyncOnReconnect());

    // 초기 hydrate 완료 대기
    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    vi.clearAllMocks();
    mockFlush.mockResolvedValue(undefined);
    mockHydrateLocalDb.mockResolvedValue(undefined);

    // 온라인 이벤트 발생
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await vi.waitFor(() => {
      expect(mockFlush).toHaveBeenCalled();
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("온라인 복귀 시 flush가 실패해도 에러가 전파되지 않는다", async () => {
    renderHook(() => useSyncOnReconnect());

    await vi.waitFor(() => {
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
    vi.clearAllMocks();
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

    const { unmount } = renderHook(() => useSyncOnReconnect());
    unmount();

    const removedEvents = removeEventListenerSpy.mock.calls.map(
      (call) => call[0]
    );
    expect(removedEvents).toContain("online");

    removeEventListenerSpy.mockRestore();
  });
});
