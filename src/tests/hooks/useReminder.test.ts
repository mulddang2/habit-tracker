import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useNotificationPermission,
  useHabitReminders,
} from "@/hooks/useReminder";
import type { Habit } from "@/types/habit";

const mockHabits: Habit[] = [
  {
    id: "h1",
    user_id: "u1",
    title: "운동",
    category: "운동",
    reminder_time: "23:59",
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

describe("useNotificationPermission", () => {
  const originalNotification = global.Notification;

  afterEach(() => {
    Object.defineProperty(global, "Notification", {
      value: originalNotification,
      writable: true,
      configurable: true,
    });
  });

  it("Notification API를 지원하지 않으면 isSupported가 false다", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).Notification;

    const { result } = renderHook(() => useNotificationPermission());
    expect(result.current.isSupported).toBe(false);
  });

  it("permission이 granted면 requestPermission은 true를 반환한다", async () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted", requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useNotificationPermission());
    const granted = await result.current.requestPermission();
    expect(granted).toBe(true);
  });

  it("permission이 denied면 requestPermission은 false를 반환한다", async () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "denied", requestPermission: vi.fn() },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useNotificationPermission());
    const granted = await result.current.requestPermission();
    expect(granted).toBe(false);
  });
});

describe("useHabitReminders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Notification이 지원되지 않으면 타이머를 설정하지 않는다", () => {
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).Notification;

    renderHook(() => useHabitReminders(mockHabits));

    // setTimeout이 습관 알림용으로 호출되지 않아야 함
    const reminderCalls = setTimeoutSpy.mock.calls.filter(
      (call) => typeof call[1] === "number" && call[1] > 1000
    );
    expect(reminderCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });

  it("reminder_time이 null인 습관은 무시한다", () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted" },
      writable: true,
      configurable: true,
    });

    const habitsNoReminder: Habit[] = [
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
    ];

    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    renderHook(() => useHabitReminders(habitsNoReminder));

    const reminderCalls = setTimeoutSpy.mock.calls.filter(
      (call) => typeof call[1] === "number" && call[1] > 1000
    );
    expect(reminderCalls).toHaveLength(0);

    setTimeoutSpy.mockRestore();
  });

  it("언마운트 시 타이머를 정리한다", () => {
    Object.defineProperty(global, "Notification", {
      value: { permission: "granted" },
      writable: true,
      configurable: true,
    });

    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { unmount } = renderHook(() => useHabitReminders(mockHabits));
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
