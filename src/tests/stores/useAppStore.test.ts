import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/stores/useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedDate: new Date(),
      user: null,
    });
  });

  it("초기 상태에서 user는 null이다", () => {
    expect(useAppStore.getState().user).toBeNull();
  });

  it("초기 상태에서 selectedDate는 오늘이다", () => {
    const today = new Date();
    const selected = useAppStore.getState().selectedDate;
    expect(selected.toDateString()).toBe(today.toDateString());
  });

  it("setSelectedDate로 날짜를 변경한다", () => {
    const newDate = new Date(2026, 0, 15);
    useAppStore.getState().setSelectedDate(newDate);
    expect(useAppStore.getState().selectedDate).toBe(newDate);
  });

  it("setUser로 유저 정보를 설정한다", () => {
    const user = {
      id: "user-1",
      email: "test@test.com",
      name: "테스트 유저",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    useAppStore.getState().setUser(user);
    expect(useAppStore.getState().user).toEqual(user);
  });

  it("clearUser로 유저 정보를 초기화한다", () => {
    useAppStore.getState().setUser({
      id: "user-1",
      email: "test@test.com",
      name: "테스트",
      avatarUrl: "",
    });
    useAppStore.getState().clearUser();
    expect(useAppStore.getState().user).toBeNull();
  });
});
