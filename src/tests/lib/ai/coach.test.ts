import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildAchievementMatrix, getCoachSuggestion } from "@/lib/ai/coach";
import { GeminiError } from "@/lib/ai/client";
import type { Habit, HabitLog } from "@/types/habit";

vi.mock("@/lib/ai/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ai/client")>("@/lib/ai/client");
  return {
    ...actual,
    generateContent: vi.fn(),
  };
});

import { generateContent } from "@/lib/ai/client";

const mockGenerate = vi.mocked(generateContent);

const today = new Date("2026-04-15T00:00:00Z");

function makeHabit(id: string, title = "테스트"): Habit {
  return {
    id,
    user_id: "u1",
    title,
    category: "건강",
    reminder_time: null,
    order: 1,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  };
}

function makeLog(habit_id: string, completed_at: string): HabitLog {
  return { id: `${habit_id}-${completed_at}`, habit_id, completed_at };
}

describe("buildAchievementMatrix", () => {
  it("produces 14 days per habit with correct completion rate", () => {
    const habits = [makeHabit("h1", "물 마시기")];
    const logs = [
      makeLog("h1", "2026-04-15"),
      makeLog("h1", "2026-04-14"),
      makeLog("h1", "2026-04-13"),
      makeLog("h1", "2026-04-12"),
      makeLog("h1", "2026-04-11"),
      makeLog("h1", "2026-04-10"),
      makeLog("h1", "2026-04-09"),
    ];

    const matrix = buildAchievementMatrix(habits, logs, today);

    expect(matrix).toHaveLength(1);
    expect(matrix[0].last14Days).toHaveLength(14);
    expect(matrix[0].completionRate).toBe(50);
    expect(matrix[0].last14Days[13].date).toBe("2026-04-15");
    expect(matrix[0].last14Days[13].completed).toBe(true);
  });

  it("marks zero completion when no logs", () => {
    const matrix = buildAchievementMatrix([makeHabit("h1")], [], today);
    expect(matrix[0].completionRate).toBe(0);
    expect(matrix[0].last14Days.every((d) => !d.completed)).toBe(true);
  });
});

describe("getCoachSuggestion", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns validated suggestion with prompt version", async () => {
    mockGenerate.mockResolvedValueOnce(
      JSON.stringify({
        targetHabitId: "h1",
        action: "reschedule",
        suggestion: "아침 습관을 저녁으로 옮겨보세요.",
        reason: "아침 달성률이 20%로 낮습니다.",
      })
    );

    const result = await getCoachSuggestion({
      habits: [makeHabit("h1")],
      logs: [],
      today,
    });

    expect(result.suggestion.targetHabitId).toBe("h1");
    expect(result.suggestion.action).toBe("reschedule");
    expect(result.promptVersion).toBe("v1");
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("strips markdown code fences from response", async () => {
    mockGenerate.mockResolvedValueOnce(
      '```json\n{"targetHabitId":"h1","action":"encourage","suggestion":"좋아요","reason":"꾸준합니다"}\n```'
    );

    const result = await getCoachSuggestion({
      habits: [makeHabit("h1")],
      logs: [],
      today,
    });
    expect(result.suggestion.action).toBe("encourage");
  });

  it("retries once when first response is invalid JSON", async () => {
    mockGenerate.mockResolvedValueOnce("not json at all").mockResolvedValueOnce(
      JSON.stringify({
        targetHabitId: "h1",
        action: "simplify",
        suggestion: "작게 시작해보세요.",
        reason: "연속 실패 3일.",
      })
    );

    const result = await getCoachSuggestion({
      habits: [makeHabit("h1")],
      logs: [],
      today,
    });

    expect(result.suggestion.action).toBe("simplify");
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it("rejects when targetHabitId is not in habits list", async () => {
    mockGenerate
      .mockResolvedValueOnce(
        JSON.stringify({
          targetHabitId: "ghost",
          action: "skip",
          suggestion: "쉬어요",
          reason: "이유",
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          targetHabitId: "ghost",
          action: "skip",
          suggestion: "쉬어요",
          reason: "이유",
        })
      );

    await expect(
      getCoachSuggestion({ habits: [makeHabit("h1")], logs: [], today })
    ).rejects.toThrow(/targetHabitId/);
  });

  it("does not retry on GeminiError", async () => {
    mockGenerate.mockRejectedValueOnce(new GeminiError("rate limit", 429));

    await expect(
      getCoachSuggestion({ habits: [makeHabit("h1")], logs: [], today })
    ).rejects.toThrow(GeminiError);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("throws early when habits list is empty", async () => {
    await expect(
      getCoachSuggestion({ habits: [], logs: [], today })
    ).rejects.toThrow(/습관이 없어/);
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
