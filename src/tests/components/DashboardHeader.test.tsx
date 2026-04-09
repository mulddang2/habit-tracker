import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useAppStore } from "@/stores/useAppStore";

vi.mock("next/navigation", () => ({
  usePathname: () => "/habits",
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

const mockSignOut = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

describe("DashboardHeader", () => {
  it("앱 타이틀을 렌더링한다", () => {
    render(<DashboardHeader />);

    expect(screen.getByText("습관 트래커")).toBeInTheDocument();
  });

  it("내비게이션 링크를 렌더링한다", () => {
    render(<DashboardHeader />);

    expect(screen.getByText("습관")).toBeInTheDocument();
    expect(screen.getByText("달력")).toBeInTheDocument();
    expect(screen.getByText("통계")).toBeInTheDocument();
  });

  it("메인 내비게이션 aria-label이 있다", () => {
    render(<DashboardHeader />);

    expect(screen.getByLabelText("메인 내비게이션")).toBeInTheDocument();
  });

  it("현재 페이지에 aria-current=page가 설정된다", () => {
    render(<DashboardHeader />);

    const habitLink = screen.getByText("습관").closest("a");
    expect(habitLink).toHaveAttribute("aria-current", "page");
  });

  it("로그아웃 버튼이 있다", () => {
    render(<DashboardHeader />);

    expect(screen.getByLabelText("로그아웃")).toBeInTheDocument();
  });

  it("로그아웃 클릭 시 signOut을 호출한다", async () => {
    const user = userEvent.setup();
    render(<DashboardHeader />);

    await user.click(screen.getByLabelText("로그아웃"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("유저 아바타가 있으면 이미지를 렌더링한다", () => {
    useAppStore.setState({
      user: {
        id: "1",
        email: "test@test.com",
        name: "테스트",
        avatarUrl: "https://example.com/avatar.jpg",
      },
    });

    render(<DashboardHeader />);

    expect(screen.getByAltText("테스트")).toBeInTheDocument();
  });

  it("유저 아바타가 없으면 기본 아이콘을 렌더링한다", () => {
    useAppStore.setState({ user: null });
    render(<DashboardHeader />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
