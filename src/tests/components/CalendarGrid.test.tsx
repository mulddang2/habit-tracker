import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CalendarGrid } from "@/components/habits/CalendarGrid";

const testMonth = new Date("2026-04-15");

const mockRates: Record<string, number> = {
  "2026-04-01": 1,
  "2026-04-02": 0.5,
  "2026-04-03": 0.25,
  "2026-04-10": 0.75,
};

describe("CalendarGrid", () => {
  it("요일 헤더를 렌더링한다", () => {
    render(<CalendarGrid month={testMonth} dailyRates={{}} />);

    expect(screen.getByText("일")).toBeInTheDocument();
    expect(screen.getByText("월")).toBeInTheDocument();
    expect(screen.getByText("토")).toBeInTheDocument();
  });

  it("해당 월의 날짜를 모두 표시한다", () => {
    render(<CalendarGrid month={testMonth} dailyRates={{}} />);

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByLabelText("4월 30일")).toBeInTheDocument();

    // gridcell 개수 확인 (5~6주 * 7일)
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });

  it("달성률이 있는 날짜에 aria-label이 포함된다", () => {
    render(<CalendarGrid month={testMonth} dailyRates={mockRates} />);

    const cell = screen.getByLabelText("4월 1일: 달성률 100%");
    expect(cell).toBeInTheDocument();

    const cell50 = screen.getByLabelText("4월 2일: 달성률 50%");
    expect(cell50).toBeInTheDocument();
  });

  it("오늘 날짜에 aria-current=date가 설정된다", () => {
    const today = new Date();
    render(<CalendarGrid month={today} dailyRates={{}} />);

    const todayCells = screen
      .getAllByRole("gridcell")
      .filter((el) => el.getAttribute("aria-current") === "date");
    expect(todayCells.length).toBe(1);
  });

  it("grid role이 적용되어 있다", () => {
    render(<CalendarGrid month={testMonth} dailyRates={{}} />);

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
  });

  it("접근성 위반이 없다", async () => {
    const { container } = render(
      <CalendarGrid month={testMonth} dailyRates={mockRates} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
