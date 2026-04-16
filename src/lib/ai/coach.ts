import { format, subDays } from "date-fns";
import { generateContent, GeminiError } from "./client";
import {
  coachSuggestionSchema,
  COACH_PROMPT_VERSION,
  type CoachResponse,
  type CoachSuggestion,
} from "./schema";
import type { Habit, HabitLog } from "@/types/habit";

export interface CoachInput {
  habits: Habit[];
  logs: HabitLog[];
  today: Date;
}

const SYSTEM_PROMPT = `당신은 데이터 기반 행동 변화 코치입니다.
사용자의 최근 14일 습관 달성 데이터를 보고, 가장 개선 효과가 클 것 같은 습관 하나를 골라 구체적인 제안을 합니다.

규칙:
- 일반론(예: "매일 운동하세요") 금지. 반드시 주어진 데이터에 근거한 제안만 하세요.
- 한국어로 응답하세요.
- 반드시 JSON 형식으로만 응답하세요. 설명 텍스트 금지.
- targetHabitId는 반드시 제공된 habits 목록 중 하나여야 합니다.
- action은 reschedule(시간 변경), simplify(난이도 낮춤), skip(잠시 쉼), encourage(격려) 중 하나.
- suggestion은 사용자에게 보여줄 한 문장(최대 100자).
- reason은 데이터에 근거한 판단 이유(최대 200자).`;

const EXAMPLE_RESPONSE = `{
  "targetHabitId": "habit-123",
  "action": "reschedule",
  "suggestion": "'아침 조깅'을 저녁으로 옮겨보는 건 어떨까요?",
  "reason": "최근 14일 중 아침 시간대 달성률이 21%로 낮습니다. 저녁 시간대 다른 습관 달성률은 80% 이상으로 높아, 시간 이동이 효과적일 수 있습니다."
}`;

export function buildAchievementMatrix(
  habits: Habit[],
  logs: HabitLog[],
  today: Date
): {
  habitId: string;
  title: string;
  category: string;
  reminderTime: string | null;
  last14Days: Array<{ date: string; completed: boolean }>;
  completionRate: number;
}[] {
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    dates.push(format(subDays(today, i), "yyyy-MM-dd"));
  }

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = logsByHabit.get(log.habit_id) ?? new Set();
    set.add(log.completed_at);
    logsByHabit.set(log.habit_id, set);
  }

  return habits.map((h) => {
    const completedSet = logsByHabit.get(h.id) ?? new Set();
    const last14Days = dates.map((date) => ({
      date,
      completed: completedSet.has(date),
    }));
    const completedCount = last14Days.filter((d) => d.completed).length;
    return {
      habitId: h.id,
      title: h.title,
      category: h.category,
      reminderTime: h.reminder_time,
      last14Days,
      completionRate: Math.round((completedCount / 14) * 100),
    };
  });
}

export function buildUserPrompt(input: CoachInput): string {
  const matrix = buildAchievementMatrix(input.habits, input.logs, input.today);
  return `다음은 사용자의 최근 14일 습관 데이터입니다.

${JSON.stringify(matrix, null, 2)}

이 데이터를 분석하여, 가장 개선 효과가 클 것 같은 습관 하나를 골라 제안해 주세요.
응답 형식 예시:
${EXAMPLE_RESPONSE}`;
}

function parseAndValidate(raw: string): CoachSuggestion {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("LLM 응답이 JSON 형식이 아닙니다.");
  }
  return coachSuggestionSchema.parse(parsed);
}

export async function getCoachSuggestion(
  input: CoachInput
): Promise<CoachResponse> {
  if (input.habits.length === 0) {
    throw new Error("습관이 없어 코치 제안을 생성할 수 없습니다.");
  }

  const userPrompt = buildUserPrompt(input);
  const habitIds = new Set(input.habits.map((h) => h.id));

  const callOnce = async () => {
    const raw = await generateContent({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", text: userPrompt }],
      temperature: 0.4,
      responseMimeType: "application/json",
    });
    const suggestion = parseAndValidate(raw);
    if (!habitIds.has(suggestion.targetHabitId)) {
      throw new Error("targetHabitId가 habit 목록에 없습니다.");
    }
    return suggestion;
  };

  let suggestion: CoachSuggestion;
  try {
    suggestion = await callOnce();
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    suggestion = await callOnce();
  }

  return {
    suggestion,
    promptVersion: COACH_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
  };
}
