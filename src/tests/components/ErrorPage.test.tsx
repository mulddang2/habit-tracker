import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorPage from "@/app/error";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";

describe("Error Page", () => {
  const mockReset = vi.fn();
  const mockError = new Error("테스트 에러");

  it("에러 메시지를 표시한다", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("문제가 발생했습니다")).toBeInTheDocument();
    expect(
      screen.getByText(/페이지를 불러오는 중 오류가 발생했습니다/)
    ).toBeInTheDocument();
  });

  it("Sentry에 에러를 전송한다", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it("다시 시도 버튼 클릭 시 reset을 호출한다", async () => {
    const user = userEvent.setup();
    render(<ErrorPage error={mockError} reset={mockReset} />);

    await user.click(screen.getByText("다시 시도"));
    expect(mockReset).toHaveBeenCalled();
  });

  it("홈으로 버튼이 있다", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByText("홈으로")).toBeInTheDocument();
  });

  it("role=alert이 설정되어 있다", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
