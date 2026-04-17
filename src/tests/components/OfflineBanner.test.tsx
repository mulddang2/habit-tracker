import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfflineBanner } from "@/components/OfflineBanner";

let mockOnlineStatus = true;

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => mockOnlineStatus,
}));

describe("OfflineBanner", () => {
  it("온라인 상태에서는 배너를 렌더링하지 않는다", () => {
    mockOnlineStatus = true;

    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("오프라인 상태에서 경고 배너를 표시한다", () => {
    mockOnlineStatus = false;

    render(<OfflineBanner />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/오프라인 상태입니다/)).toBeInTheDocument();
  });

  it("오프라인 배너에 동기화 안내 메시지가 포함된다", () => {
    mockOnlineStatus = false;

    render(<OfflineBanner />);

    expect(
      screen.getByText(/변경사항은 연결 복구 시 자동으로 동기화됩니다/)
    ).toBeInTheDocument();
  });

  it("오프라인 배너에 role='alert'이 설정되어 접근성을 보장한다", () => {
    mockOnlineStatus = false;

    render(<OfflineBanner />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });
});
