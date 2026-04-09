import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LoginForm } from "@/components/auth/LoginForm";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockSignInWithGoogle = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Google 로그인 버튼을 렌더링한다", () => {
    render(<LoginForm />);

    expect(screen.getByText("Google 계정으로 로그인")).toBeInTheDocument();
  });

  it("로그인 버튼 클릭 시 signInWithGoogle을 호출한다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByText("Google 계정으로 로그인"));
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it("로그인 중 에러 발생 시 에러 메시지를 표시한다", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockRejectedValue(new Error("fail"));

    render(<LoginForm />);

    await user.click(screen.getByText("Google 계정으로 로그인"));

    expect(
      await screen.findByText("Google 로그인 중 오류가 발생했습니다.")
    ).toBeInTheDocument();
  });

  it("form role과 aria-label이 있다", () => {
    render(<LoginForm />);

    expect(screen.getByRole("form")).toHaveAttribute("aria-label", "로그인");
  });

  it("접근성 위반이 없다", async () => {
    const { container } = render(<LoginForm />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
