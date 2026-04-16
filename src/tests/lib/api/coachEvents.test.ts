import { describe, it, expect } from "vitest";
import type { CoachEvent } from "@/types/coach";

function computeStats(events: CoachEvent[]) {
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

const makeSuggestion = () => ({
  targetHabitId: "habit-1",
  action: "encourage",
  suggestion: "테스트 제안",
  reason: "테스트 근거",
});

const makeEvent = (
  action: CoachEvent["action"],
  version = "v1"
): CoachEvent => ({
  id: crypto.randomUUID(),
  user_id: "user-1",
  prompt_version: version,
  suggestion: makeSuggestion(),
  action,
  created_at: new Date().toISOString(),
});

describe("coachEvents stats 계산", () => {
  it("이벤트가 없으면 모두 0", () => {
    const stats = computeStats([]);
    expect(stats.total).toBe(0);
    expect(stats.acceptRate).toBe(0);
    expect(stats.byVersion).toHaveLength(0);
  });

  it("수락/거부/무시 카운트가 정확함", () => {
    const events = [
      makeEvent("accepted"),
      makeEvent("accepted"),
      makeEvent("dismissed"),
      makeEvent("ignored"),
    ];
    const stats = computeStats(events);
    expect(stats.total).toBe(4);
    expect(stats.accepted).toBe(2);
    expect(stats.dismissed).toBe(1);
    expect(stats.ignored).toBe(1);
    expect(stats.acceptRate).toBe(50);
  });

  it("프롬프트 버전별 통계가 정확함", () => {
    const events = [
      makeEvent("accepted", "v1"),
      makeEvent("dismissed", "v1"),
      makeEvent("accepted", "v2"),
      makeEvent("accepted", "v2"),
      makeEvent("dismissed", "v2"),
    ];
    const stats = computeStats(events);
    expect(stats.byVersion).toHaveLength(2);

    const v1 = stats.byVersion.find((v) => v.promptVersion === "v1")!;
    expect(v1.total).toBe(2);
    expect(v1.accepted).toBe(1);
    expect(v1.acceptRate).toBe(50);

    const v2 = stats.byVersion.find((v) => v.promptVersion === "v2")!;
    expect(v2.total).toBe(3);
    expect(v2.accepted).toBe(2);
    expect(v2.acceptRate).toBe(67);
  });
});
