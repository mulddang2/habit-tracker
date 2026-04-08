import { z } from "zod";

export const habitSchema = z.object({
  title: z
    .string()
    .min(1, "습관 이름을 입력해주세요")
    .max(50, "50자 이내로 입력해주세요"),
  category: z.enum(["건강", "공부", "운동", "라이프"], {
    message: "카테고리를 선택해주세요",
  }),
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "올바른 시간 형식이 아닙니다")
    .nullable()
    .optional(),
});

export type HabitFormData = z.infer<typeof habitSchema>;
