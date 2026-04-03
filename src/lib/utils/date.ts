import { format } from "date-fns";

export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isToday(date: Date): boolean {
  return formatDate(date) === formatDate(new Date());
}
