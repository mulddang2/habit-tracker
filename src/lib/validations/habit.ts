import { z } from "zod";

export const habitSchema = z.object({
  title: z
    .string()
    .min(1, "습관 이름을 입력해주세요")
    .max(50, "50자 이내로 입력해주세요"),
  category: z.enum(["건강", "공부", "운동", "라이프"], {
    message: "카테고리를 선택해주세요",
  }),
});

export type HabitFormData = z.infer<typeof habitSchema>;
