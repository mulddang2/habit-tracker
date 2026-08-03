import type { Metadata } from "next";
import { HabitCalendar } from "@/components/habits/HabitCalendar";

export const metadata: Metadata = { title: "달력" };

export default function CalendarPage() {
  return <HabitCalendar />;
}
