export type Category = "건강" | "공부" | "운동" | "라이프";

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  category: Category;
  reminder_time: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
}
