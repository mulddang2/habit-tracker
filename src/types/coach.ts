export type CoachAction = "accepted" | "dismissed" | "ignored";

export interface CoachEvent {
  id: string;
  user_id: string;
  prompt_version: string;
  suggestion: {
    targetHabitId: string;
    action: string;
    suggestion: string;
    reason: string;
  };
  action: CoachAction;
  created_at: string;
}
