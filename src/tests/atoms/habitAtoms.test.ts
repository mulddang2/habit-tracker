import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import { categoryFilterAtom, editingHabitIdAtom } from "@/atoms/habitAtoms";

describe("categoryFilterAtom", () => {
  it("초기값은 '전체'이다", () => {
    const store = createStore();
    expect(store.get(categoryFilterAtom)).toBe("전체");
  });

  it("카테고리를 변경할 수 있다", () => {
    const store = createStore();
    store.set(categoryFilterAtom, "건강");
    expect(store.get(categoryFilterAtom)).toBe("건강");
  });

  it("'전체'로 되돌릴 수 있다", () => {
    const store = createStore();
    store.set(categoryFilterAtom, "운동");
    store.set(categoryFilterAtom, "전체");
    expect(store.get(categoryFilterAtom)).toBe("전체");
  });
});

describe("editingHabitIdAtom", () => {
  it("초기값은 null이다", () => {
    const store = createStore();
    expect(store.get(editingHabitIdAtom)).toBeNull();
  });

  it("편집 ID를 설정하고 해제할 수 있다", () => {
    const store = createStore();
    store.set(editingHabitIdAtom, "habit-1");
    expect(store.get(editingHabitIdAtom)).toBe("habit-1");
    store.set(editingHabitIdAtom, null);
    expect(store.get(editingHabitIdAtom)).toBeNull();
  });
});
