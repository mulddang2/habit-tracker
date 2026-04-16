import { z } from "zod";

export const COACH_PROMPT_VERSION = "v1";

export const coachSuggestionSchema = z.object({
  targetHabitId: z.string().min(1),
  action: z.enum(["reschedule", "simplify", "skip", "encourage"]),
  suggestion: z.string().min(1).max(200),
  reason: z.string().min(1).max(300),
});

export type CoachSuggestion = z.infer<typeof coachSuggestionSchema>;

export interface CoachResponse {
  suggestion: CoachSuggestion;
  promptVersion: string;
  generatedAt: string;
}
