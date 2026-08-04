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
  /** 값이 있으면 삭제된 행. 화면에는 보이지 않지만 동기화를 위해 남겨둔다. */
  deleted_at: string | null;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
  updated_at: string;
  /** 값이 있으면 삭제된 행. Habit.deleted_at과 같은 역할. */
  deleted_at: string | null;
}
