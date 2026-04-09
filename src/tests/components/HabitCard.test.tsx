import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HabitCard } from "@/components/habits/HabitCard";
import type { Habit } from "@/types/habit";

const mockHabit: Habit = {
  id: "1",
  user_id: "user-1",
  title: "물 2L 마시기",
  category: "건강",
  reminder_time: null,
  order: 1,
  created_at: "2026-04-01",
  updated_at: "2026-04-01",
};

const defaultProps = {
  habit: mockHabit,
  isCompleted: false,
  onToggle: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe("HabitCard", () => {
  it("습관 제목과 카테고리를 렌더링한다", () => {
    render(<HabitCard {...defaultProps} />);

    expect(screen.getByText("물 2L 마시기")).toBeInTheDocument();
    expect(screen.getByText("건강")).toBeInTheDocument();
  });

  it("완료 상태에서 line-through 클래스가 적용된다", () => {
    render(<HabitCard {...defaultProps} isCompleted={true} />);

    const title = screen.getByText("물 2L 마시기");
    expect(title.className).toContain("line-through");
  });

  it("미완료 상태에서 line-through가 없다", () => {
    render(<HabitCard {...defaultProps} isCompleted={false} />);

    const title = screen.getByText("물 2L 마시기");
    expect(title.className).not.toContain("line-through");
  });

  it("체크박스 클릭 시 onToggle을 호출한다", async () => {
    const onToggle = vi.fn();
    render(<HabitCard {...defaultProps} onToggle={onToggle} />);

    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("수정 버튼 클릭 시 onEdit을 호출한다", async () => {
    const onEdit = vi.fn();
    render(<HabitCard {...defaultProps} onEdit={onEdit} />);

    const editButton = screen.getByLabelText("물 2L 마시기 수정");
    await userEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("삭제 버튼 클릭 시 onDelete를 호출한다", async () => {
    const onDelete = vi.fn();
    render(<HabitCard {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.getByLabelText("물 2L 마시기 삭제");
    await userEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledOnce();
  });
});
