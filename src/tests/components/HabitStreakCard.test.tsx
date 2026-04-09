import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { HabitStreakCard } from "@/components/habits/HabitStreakCard";

const defaultProps = {
  title: "운동하기",
  category: "운동" as const,
  currentStreak: 5,
  longestStreak: 12,
  completedDays: 15,
};

describe("HabitStreakCard", () => {
  it("습관 이름과 카테고리를 렌더링한다", () => {
    render(<HabitStreakCard {...defaultProps} />);

    expect(screen.getByText("운동하기")).toBeInTheDocument();
    expect(screen.getByText("운동")).toBeInTheDocument();
  });

  it("스트릭 수치를 올바르게 표시한다", () => {
    render(<HabitStreakCard {...defaultProps} />);

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("aria-label에 스트릭 정보가 포함된다", () => {
    render(<HabitStreakCard {...defaultProps} />);

    const card = screen.getByRole("listitem");
    expect(card).toHaveAttribute(
      "aria-label",
      "운동하기: 현재 5일 연속, 최장 12일, 이번 달 15회 완료"
    );
  });

  it("접근성 위반이 없다", async () => {
    const { container } = render(
      <ul>
        <HabitStreakCard {...defaultProps} />
      </ul>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
