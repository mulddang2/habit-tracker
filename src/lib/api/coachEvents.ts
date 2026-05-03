import { createClient } from "@/lib/supabase/client";
import type { CoachAction, CoachEvent } from "@/types/coach";
import type { CoachSuggestion } from "@/lib/ai/schema";
import type { HabitLog } from "@/types/habit";

function getClient() {
  return createClient();
}

const DAY_MS = 24 * 60 * 60 * 1000;
const IMPACT_WINDOW_DAYS = 7;

export interface CoachVersionStat {
  promptVersion: string;
  total: number;
  accepted: number;
  acceptRate: number;
}

export interface CoachAcceptImpact {
  sampleSize: number;
  beforeRate: number;
  afterRate: number;
  delta: number;
}

export interface CoachStats {
  total: number;
  accepted: number;
  dismissed: number;
  ignored: number;
  acceptRate: number;
  byVersion: CoachVersionStat[];
  acceptImpact: CoachAcceptImpact | null;
}

export async function insertCoachEvent(params: {
  promptVersion: string;
  suggestion: CoachSuggestion;
  action: CoachAction;
}): Promise<void> {
  const supabase = getClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("인증되지 않음");

  const { error } = await supabase.from("coach_events").insert({
    user_id: user.id,
    prompt_version: params.promptVersion,
    suggestion: params.suggestion,
    action: params.action,
  });

  if (error) throw error;
}

export async function fetchCoachEvents(): Promise<CoachEvent[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("coach_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export function computeCoachStats(events: CoachEvent[]) {
  const total = events.length;
  const accepted = events.filter((e) => e.action === "accepted").length;
  const dismissed = events.filter((e) => e.action === "dismissed").length;
  const ignored = events.filter((e) => e.action === "ignored").length;
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  const versionMap = new Map<string, { total: number; accepted: number }>();
  for (const event of events) {
    const v = versionMap.get(event.prompt_version) ?? {
      total: 0,
      accepted: 0,
    };
    v.total++;
    if (event.action === "accepted") v.accepted++;
    versionMap.set(event.prompt_version, v);
  }

  const byVersion: CoachVersionStat[] = Array.from(versionMap.entries()).map(
    ([promptVersion, v]) => ({
      promptVersion,
      total: v.total,
      accepted: v.accepted,
      acceptRate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0,
    })
  );

  return { total, accepted, dismissed, ignored, acceptRate, byVersion };
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 수락된 제안 각각에 대해 t±7일의 targetHabit 완료율 변화를 계산.
 * 7일이 채 지나지 않은 이벤트는 after window가 미완성이라 제외한다.
 */
export function computeAcceptImpact(
  events: CoachEvent[],
  logs: HabitLog[],
  now: Date
): CoachAcceptImpact | null {
  const cutoff = new Date(now.getTime() - IMPACT_WINDOW_DAYS * DAY_MS);

  // habit_id별 완료 날짜 집합
  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = logsByHabit.get(log.habit_id) ?? new Set();
    set.add(log.completed_at);
    logsByHabit.set(log.habit_id, set);
  }

  let beforeSum = 0;
  let afterSum = 0;
  let count = 0;

  for (const event of events) {
    if (event.action !== "accepted") continue;

    const t = new Date(event.created_at);
    if (t > cutoff) continue;

    const habitId = event.suggestion?.targetHabitId;
    if (!habitId) continue;

    const completed = logsByHabit.get(habitId);
    if (!completed) continue;

    let beforeCount = 0;
    let afterCount = 0;
    for (let i = 1; i <= IMPACT_WINDOW_DAYS; i++) {
      const beforeDay = fmtDate(new Date(t.getTime() - i * DAY_MS));
      const afterDay = fmtDate(new Date(t.getTime() + (i - 1) * DAY_MS));
      if (completed.has(beforeDay)) beforeCount++;
      if (completed.has(afterDay)) afterCount++;
    }

    beforeSum += (beforeCount / IMPACT_WINDOW_DAYS) * 100;
    afterSum += (afterCount / IMPACT_WINDOW_DAYS) * 100;
    count++;
  }

  if (count === 0) return null;

  const beforeRate = Math.round(beforeSum / count);
  const afterRate = Math.round(afterSum / count);
  return {
    sampleSize: count,
    beforeRate,
    afterRate,
    delta: afterRate - beforeRate,
  };
}

async function fetchImpactLogs(
  events: CoachEvent[],
  now: Date
): Promise<HabitLog[]> {
  const cutoff = new Date(now.getTime() - IMPACT_WINDOW_DAYS * DAY_MS);
  const acceptedTargets = events
    .filter((e) => e.action === "accepted" && new Date(e.created_at) <= cutoff)
    .map((e) => e.suggestion?.targetHabitId)
    .filter((id): id is string => Boolean(id));

  if (acceptedTargets.length === 0) return [];

  const uniqueHabitIds = Array.from(new Set(acceptedTargets));

  const supabase = getClient();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("*")
    .in("habit_id", uniqueHabitIds);

  if (error) throw error;
  return data ?? [];
}

export async function fetchCoachStats(): Promise<CoachStats> {
  const events = await fetchCoachEvents();
  const base = computeCoachStats(events);

  const now = new Date();
  const logs = await fetchImpactLogs(events, now);
  const acceptImpact = computeAcceptImpact(events, logs, now);

  return { ...base, acceptImpact };
}
