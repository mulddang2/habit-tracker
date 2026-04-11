import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { HabitCardSkeleton } from "@/components/habits/HabitCardSkeleton";

describe("HabitCardSkeleton", () => {
  it("로딩 상태 role을 가진다", () => {
    render(<HabitCardSkeleton />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("접근성 aria-label이 있다", () => {
    render(<HabitCardSkeleton />);

    expect(screen.getByLabelText("습관 로딩 중")).toBeInTheDocument();
  });

  it("접근성 위반 없음", async () => {
    const { container } = render(<HabitCardSkeleton />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
