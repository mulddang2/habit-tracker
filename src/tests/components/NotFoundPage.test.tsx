import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("NotFound Page", () => {
  it("404 메시지를 표시한다", () => {
    render(<NotFound />);

    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeInTheDocument();
  });

  it("홈으로 돌아가기 링크가 있다", () => {
    render(<NotFound />);

    const link = screen.getByText("홈으로 돌아가기");
    expect(link.closest("a")).toHaveAttribute("href", "/habits");
  });

  it("아이콘에 aria-hidden이 설정되어 있다", () => {
    const { container } = render(<NotFound />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
