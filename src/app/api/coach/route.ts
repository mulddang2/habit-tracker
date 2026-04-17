import { NextResponse } from "next/server";
import { subDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getCoachSuggestion } from "@/lib/ai/coach";
import { GeminiError } from "@/lib/ai/client";
import type { Habit, HabitLog } from "@/types/habit";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않음" }, { status: 401 });
    }

    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .order("order", { ascending: true });
    if (habitsError) throw habitsError;

    if (!habits || habits.length === 0) {
      return NextResponse.json(
        { error: "등록된 습관이 없습니다." },
        { status: 400 }
      );
    }

    const today = new Date();
    const from = format(subDays(today, 13), "yyyy-MM-dd");
    const to = format(today, "yyyy-MM-dd");

    const { data: logs, error: logsError } = await supabase
      .from("habit_logs")
      .select("*")
      .gte("completed_at", from)
      .lte("completed_at", to);
    if (logsError) throw logsError;

    const result = await getCoachSuggestion({
      habits: habits as Habit[],
      logs: (logs ?? []) as HabitLog[],
      today,
    });

    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof GeminiError ? (err.status ?? 502) : 500;
    if (status === 429) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status });
  }
}
