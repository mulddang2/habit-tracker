import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

describe("useOnlineStatus", () => {
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    // navigator.onLine을 제어 가능하도록 설정
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: originalNavigatorOnLine,
    });
  });

  it("온라인 상태에서 true를 반환한다", () => {
    Object.defineProperty(navigator, "onLine", { value: true });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("오프라인 상태에서 false를 반환한다", () => {
    Object.defineProperty(navigator, "onLine", { value: false });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("온라인→오프라인 전환 시 false로 변경된다", () => {
    Object.defineProperty(navigator, "onLine", { value: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: false });
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("오프라인→온라인 전환 시 true로 변경된다", () => {
    Object.defineProperty(navigator, "onLine", { value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(navigator, "onLine", { value: true });
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("언마운트 시 이벤트 리스너를 정리한다", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();

    const removedEvents = removeEventListenerSpy.mock.calls.map(
      (call) => call[0]
    );
    expect(removedEvents).toContain("online");
    expect(removedEvents).toContain("offline");

    removeEventListenerSpy.mockRestore();
  });
});
