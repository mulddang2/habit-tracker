import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { HabitForm } from "@/components/habits/HabitForm";

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("HabitForm", () => {
  it("폼 필드를 렌더링한다", () => {
    render(<HabitForm {...defaultProps} />);

    expect(screen.getByLabelText("습관 이름")).toBeInTheDocument();
    expect(screen.getByText("카테고리")).toBeInTheDocument();
    expect(screen.getByText("알림 설정")).toBeInTheDocument();
  });

  it("취소 버튼 클릭 시 onCancel을 호출한다", async () => {
    const user = userEvent.setup();
    render(<HabitForm {...defaultProps} />);

    await user.click(screen.getByText("취소"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("빈 제목으로 제출 시 에러 메시지를 표시한다", async () => {
    const user = userEvent.setup();
    render(<HabitForm {...defaultProps} />);

    await user.click(screen.getByText("추가"));

    expect(
      await screen.findByText("습관 이름을 입력해주세요")
    ).toBeInTheDocument();
  });

  it("isPending이면 버튼이 비활성화된다", () => {
    render(<HabitForm {...defaultProps} isPending={true} />);

    expect(screen.getByText("저장 중...")).toBeDisabled();
  });

  it("submitLabel을 커스텀할 수 있다", () => {
    render(<HabitForm {...defaultProps} submitLabel="수정" />);

    expect(screen.getByText("수정")).toBeInTheDocument();
  });

  it("defaultValues를 적용한다", () => {
    render(
      <HabitForm
        {...defaultProps}
        defaultValues={{ title: "독서", category: "공부", reminder_time: null }}
      />
    );

    expect(screen.getByDisplayValue("독서")).toBeInTheDocument();
  });

  it("접근성 위반이 없다", async () => {
    const { container } = render(<HabitForm {...defaultProps} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
