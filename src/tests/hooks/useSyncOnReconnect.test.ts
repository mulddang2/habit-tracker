import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSyncOnReconnect } from "@/hooks/useSyncOnReconnect";

const mockFlush = vi.fn();
const mockHydrateLocalDb = vi.fn();
const mockIsLocalDbEmpty = vi.fn();

vi.mock("@/lib/db/sync", () => ({
  flush: (...args: unknown[]) => mockFlush(...args),
}));

vi.mock("@/lib/db/hydrate", () => ({
  hydrateLocalDb: (...args: unknown[]) => mockHydrateLocalDb(...args),
  isLocalDbEmpty: (...args: unknown[]) => mockIsLocalDbEmpty(...args),
}));

describe("useSyncOnReconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlush.mockResolvedValue(undefined);
    mockHydrateLocalDb.mockResolvedValue(undefined);
    mockIsLocalDbEmpty.mockResolvedValue(false);
  });

  it("최초 로드 시 로컬 DB가 비어있으면 서버에서 데이터를 가져온다", async () => {
    mockIsLocalDbEmpty.mockResolvedValue(true);

    renderHook(() => useSyncOnReconnect());

    // useEffect 비동기 처리 대기
    await vi.waitFor(() => {
      expect(mockIsLocalDbEmpty).toHaveBeenCalled();
      expect(mockHydrateLocalDb).toHaveBeenCalled();
    });
  });

  it("최초 로드 시 로컬 DB에 데이터가 있으면 서버에서 가져오지 않는다", async () => {
    mockIsLocalDbEmpty.mockResolvedValue(false);

    renderHook(() => useSyncOnReconnect());

    await vi.waitFor(() => {
      expect(mockIsLocalDbEmpty).toHaveBeenCalled();
    });
    expect(mockHydrateLocalDb).not.toHaveBeenCalled();
  });

  it("온라인 복귀 시 flush 후 hydrate를 실행한다", async () => {
    renderHook(() => useSyncOnReconnect());

    // 초기 hydrate 완료 대기
    await vi.waitFor(() => {
      expect(mockIsLocalDbEmpty).toHaveBeenCalled();
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
      expect(mockIsLocalDbEmpty).toHaveBeenCalled();
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
