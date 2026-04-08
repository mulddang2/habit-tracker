"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Habit } from "@/types/habit";

export function useNotificationPermission() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const isSupported = typeof window !== "undefined" && "Notification" in window;
  const permission =
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default";

  return { requestPermission, isSupported, permission };
}

export function useHabitReminders(habits: Habit[]) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    // 기존 타이머 정리
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();

    const now = new Date();

    for (const habit of habits) {
      if (!habit.reminder_time) continue;

      const [hours, minutes] = habit.reminder_time.split(":").map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // 이미 지난 시간이면 스킵
      if (reminderDate <= now) continue;

      const delay = reminderDate.getTime() - now.getTime();

      const timer = setTimeout(() => {
        new Notification("습관 트래커", {
          body: `"${habit.title}" 할 시간이예요!`,
          icon: "/favicon.ico",
          tag: `habit-${habit.id}`,
        });
      }, delay);

      timersRef.current.set(habit.id, timer);
    }

    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, [habits]);
}
