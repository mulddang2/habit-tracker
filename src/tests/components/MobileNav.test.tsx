import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MobileNav } from "@/components/layout/MobileNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/habits",
}));

describe("MobileNav", () => {
  it("내비게이션 링크를 렌더링한다", () => {
    render(<MobileNav />);

    expect(screen.getByText("습관")).toBeInTheDocument();
    expect(screen.getByText("달력")).toBeInTheDocument();
    expect(screen.getByText("통계")).toBeInTheDocument();
  });

  it("aria-label이 설정되어 있다", () => {
    render(<MobileNav />);

    expect(screen.getByLabelText("모바일 내비게이션")).toBeInTheDocument();
  });

  it("현재 페이지에 aria-current=page가 설정된다", () => {
    render(<MobileNav />);

    const habitLink = screen.getByText("습관").closest("a");
    expect(habitLink).toHaveAttribute("aria-current", "page");

    const calendarLink = screen.getByText("달력").closest("a");
    expect(calendarLink).not.toHaveAttribute("aria-current");
  });

  it("아이콘에 aria-hidden이 설정된다", () => {
    const { container } = render(<MobileNav />);

    const icons = container.querySelectorAll("svg");
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("접근성 위반이 없다", async () => {
    const { container } = render(<MobileNav />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
