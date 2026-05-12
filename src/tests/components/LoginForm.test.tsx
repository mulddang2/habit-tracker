import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { LoginForm } from "@/components/auth/LoginForm";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockSignInWithGoogle = vi.fn();
const mockSignInWithDemo = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    signInWithDemo: mockSignInWithDemo,
  }),
}));

describe("LoginForm", () => {
  let hrefSetter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return "";
        },
        set href(value: string) {
          hrefSetter(value);
        },
      },
    });
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

  it("Google 로그인 중 에러 발생 시 에러 메시지를 표시한다", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockRejectedValue(new Error("fail"));

    render(<LoginForm />);

    await user.click(screen.getByText("Google 계정으로 로그인"));

    expect(
      await screen.findByText("Google 로그인 중 오류가 발생했습니다.")
    ).toBeInTheDocument();
  });

  it("데모 버튼을 렌더링한다", () => {
    render(<LoginForm />);

    expect(screen.getByText("🎭 데모 계정으로 둘러보기")).toBeInTheDocument();
  });

  it("데모 버튼 클릭 시 signInWithDemo를 호출하고 /habits로 풀 리로드한다", async () => {
    const user = userEvent.setup();
    mockSignInWithDemo.mockResolvedValue(undefined);

    render(<LoginForm />);

    await user.click(screen.getByText("🎭 데모 계정으로 둘러보기"));

    expect(mockSignInWithDemo).toHaveBeenCalled();
    expect(hrefSetter).toHaveBeenCalledWith("/habits");
  });

  it("데모 로그인 중 에러 발생 시 에러 메시지를 표시한다", async () => {
    const user = userEvent.setup();
    mockSignInWithDemo.mockRejectedValue(new Error("fail"));

    render(<LoginForm />);

    await user.click(screen.getByText("🎭 데모 계정으로 둘러보기"));

    expect(
      await screen.findByText("데모 로그인 중 오류가 발생했습니다.")
    ).toBeInTheDocument();
    expect(hrefSetter).not.toHaveBeenCalled();
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
