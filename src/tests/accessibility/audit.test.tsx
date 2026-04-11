import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { HabitCard } from "@/components/habits/HabitCard";
import { CategoryFilter } from "@/components/habits/CategoryFilter";
import type { Habit } from "@/types/habit";

const mockHabit: Habit = {
  id: "1",
  user_id: "u1",
  title: "물 마시기",
  category: "건강",
  reminder_time: null,
  order: 1,
  created_at: "2026-04-01",
  updated_at: "2026-04-01",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider>{children}</Provider>
      </QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("접근성 감사 - 미검사 컴포넌트", () => {
  it("HabitCard - 접근성 위반 없음", async () => {
    const { container } = render(
      <ul>
        <HabitCard
          habit={mockHabit}
          isCompleted={false}
          onToggle={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("HabitCard (완료 상태) - 접근성 위반 없음", async () => {
    const { container } = render(
      <ul>
        <HabitCard
          habit={mockHabit}
          isCompleted={true}
          onToggle={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("HabitCard (알림 시간 있음) - 접근성 위반 없음", async () => {
    const habitWithReminder = { ...mockHabit, reminder_time: "09:00" };
    const { container } = render(
      <ul>
        <HabitCard
          habit={habitWithReminder}
          isCompleted={false}
          onToggle={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </ul>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("CategoryFilter - 접근성 위반 없음", async () => {
    const Wrapper = createWrapper();
    const { container } = render(
      <Wrapper>
        <CategoryFilter />
      </Wrapper>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
