"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { useAppStore } from "@/stores/useAppStore";

export function TodayHeader() {
  const selectedDate = useAppStore((s) => s.selectedDate);

  return (
    <h2 className="text-lg font-semibold">
      {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
    </h2>
  );
}
