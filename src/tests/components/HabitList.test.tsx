import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HabitList } from "@/components/habits/HabitList";
import type { Habit, HabitLog } from "@/types/habit";

vi.mock("@/lib/api/habits", () => ({
  fetchHabits: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

vi.mock("@/lib/api/habitLogs", () => ({
  fetchLogsByDate: vi.fn(),
  fetchLogsByMonth: vi.fn(),
  toggleHabitLog: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

import { fetchHabits } from "@/lib/api/habits";
import { fetchLogsByDate } from "@/lib/api/habitLogs";

const mockHabits: Habit[] = [
  {
    id: "1",
    user_id: "u1",
    title: "물 마시기",
    category: "건강",
    reminder_time: null,
    order: 1,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
    deleted_at: null,
  },
  {
    id: "2",
    user_id: "u1",
    title: "코딩하기",
    category: "공부",
    reminder_time: null,
    order: 2,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
    deleted_at: null,
  },
];

const mockLogs: HabitLog[] = [
  {
    id: "l1",
    habit_id: "1",
    completed_at: "2026-04-08",
    updated_at: "2026-04-01T00:00:00.000Z",
    deleted_at: null,
  },
];

function renderHabitList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HabitList />
    </QueryClientProvider>
  );
}

describe("HabitList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("로딩 중일 때 스켈레톤을 보여준다", () => {
    vi.mocked(fetchHabits).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchLogsByDate).mockReturnValue(new Promise(() => {}));

    renderHabitList();

    // HabitCardSkeleton은 aria-label 없이 div만 렌더링하므로 구조만 확인
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("습관 목록을 렌더링한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByDate).mockResolvedValue(mockLogs);

    renderHabitList();

    await waitFor(() => {
      expect(screen.getByText("물 마시기")).toBeInTheDocument();
      expect(screen.getByText("코딩하기")).toBeInTheDocument();
    });
  });

  it("완료된 습관은 체크박스가 체크되어 있다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByDate).mockResolvedValue(mockLogs);

    renderHabitList();

    await waitFor(() => {
      const waterCheck = screen.getByLabelText("물 마시기 완료 해제");
      expect(waterCheck).toBeInTheDocument();

      const codeCheck = screen.getByLabelText("코딩하기 완료 체크");
      expect(codeCheck).toBeInTheDocument();
    });
  });

  it("습관이 없으면 빈 상태 메시지를 보여준다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue([]);
    vi.mocked(fetchLogsByDate).mockResolvedValue([]);

    renderHabitList();

    await waitFor(() => {
      expect(
        screen.getByText("아직 등록된 습관이 없어요.")
      ).toBeInTheDocument();
    });
  });

  it("첫 번째 습관은 위로 이동 버튼이, 마지막 습관은 아래로 이동 버튼이 비활성화된다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByDate).mockResolvedValue(mockLogs);

    renderHabitList();

    await waitFor(() => {
      expect(screen.getByLabelText("물 마시기 위로 이동")).toBeDisabled();
      expect(screen.getByLabelText("물 마시기 아래로 이동")).toBeEnabled();
      expect(screen.getByLabelText("코딩하기 위로 이동")).toBeEnabled();
      expect(screen.getByLabelText("코딩하기 아래로 이동")).toBeDisabled();
    });
  });

  it("카테고리 필터가 걸리면 위/아래 이동 버튼이 노출되지 않는다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(fetchLogsByDate).mockResolvedValue(mockLogs);

    renderHabitList();

    await waitFor(() => {
      expect(screen.getByText("물 마시기")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("radio", { name: "건강" }));

    await waitFor(() => {
      expect(
        screen.queryByLabelText("물 마시기 위로 이동")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("물 마시기 아래로 이동")
      ).not.toBeInTheDocument();
    });
  });

  it("에러 시 에러 메시지와 재시도 버튼을 보여준다", async () => {
    vi.mocked(fetchHabits).mockRejectedValue(new Error("fetch error"));
    vi.mocked(fetchLogsByDate).mockResolvedValue([]);

    renderHabitList();

    await waitFor(() => {
      expect(
        screen.getByText("습관 목록을 불러오지 못했습니다.")
      ).toBeInTheDocument();
      expect(screen.getByText("다시 시도")).toBeInTheDocument();
    });
  });
});
