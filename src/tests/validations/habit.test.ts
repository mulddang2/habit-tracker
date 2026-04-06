import { describe, it, expect } from "vitest";
import { habitSchema } from "@/lib/validations/habit";

describe("habitSchema", () => {
  it("유효한 습관 데이터를 통과시킨다", () => {
    const result = habitSchema.safeParse({
      title: "물 2L 마시기",
      category: "건강",
    });
    expect(result.success).toBe(true);
  });

  it("4개 카테고리 모두 유효하다", () => {
    const categories = ["건강", "공부", "운동", "라이프"];
    categories.forEach((category) => {
      const result = habitSchema.safeParse({ title: "테스트", category });
      expect(result.success).toBe(true);
    });
  });

  it("빈 제목을 거부한다", () => {
    const result = habitSchema.safeParse({ title: "", category: "건강" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("습관 이름을 입력해주세요");
    }
  });

  it("50자 초과 제목을 거부한다", () => {
    const result = habitSchema.safeParse({
      title: "a".repeat(51),
      category: "건강",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("50자 이내로 입력해주세요");
    }
  });

  it("50자 제목은 통과한다", () => {
    const result = habitSchema.safeParse({
      title: "a".repeat(50),
      category: "건강",
    });
    expect(result.success).toBe(true);
  });

  it("1자 제목은 통과한다", () => {
    const result = habitSchema.safeParse({ title: "a", category: "공부" });
    expect(result.success).toBe(true);
  });

  it("유효하지 않은 카테고리를 거부한다", () => {
    const result = habitSchema.safeParse({
      title: "운동하기",
      category: "기타",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("카테고리를 선택해주세요");
    }
  });

  it("카테고리 누락 시 거부한다", () => {
    const result = habitSchema.safeParse({ title: "운동하기" });
    expect(result.success).toBe(false);
  });
});
