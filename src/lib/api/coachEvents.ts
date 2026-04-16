import { createClient } from "@/lib/supabase/client";
import type { CoachAction, CoachEvent } from "@/types/coach";
import type { CoachSuggestion } from "@/lib/ai/schema";

function getClient() {
  return createClient();
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

export async function fetchCoachStats(): Promise<{
  total: number;
  accepted: number;
  dismissed: number;
  ignored: number;
  acceptRate: number;
  byVersion: Array<{
    promptVersion: string;
    total: number;
    accepted: number;
    acceptRate: number;
  }>;
}> {
  const events = await fetchCoachEvents();

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

  const byVersion = Array.from(versionMap.entries()).map(
    ([promptVersion, v]) => ({
      promptVersion,
      total: v.total,
      accepted: v.accepted,
      acceptRate: v.total > 0 ? Math.round((v.accepted / v.total) * 100) : 0,
    })
  );

  return { total, accepted, dismissed, ignored, acceptRate, byVersion };
}
