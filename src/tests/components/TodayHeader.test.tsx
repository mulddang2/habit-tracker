import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TodayHeader } from "@/components/habits/TodayHeader";
import { useAppStore } from "@/stores/useAppStore";

describe("TodayHeader", () => {
  it("선택된 날짜를 한국어 형식으로 표시한다", () => {
    useAppStore.setState({ selectedDate: new Date("2026-04-09") });
    render(<TodayHeader />);

    expect(screen.getByText(/2026년 4월 9일/)).toBeInTheDocument();
  });

  it("heading 요소로 렌더링된다", () => {
    useAppStore.setState({ selectedDate: new Date("2026-04-09") });
    render(<TodayHeader />);

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("접근성 위반 없음", async () => {
    useAppStore.setState({ selectedDate: new Date("2026-04-09") });
    const { container } = render(<TodayHeader />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
