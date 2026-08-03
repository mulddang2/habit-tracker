import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CategoryFilter,
  type CategoryFilterValue,
} from "@/components/habits/CategoryFilter";

// CategoryFilter는 제어 컴포넌트이므로, 선택 상태는 부모가 소유한다.
// HabitList가 하는 일을 최소한으로 흉내 내어 상호작용을 검증한다.
function Harness() {
  const [selected, setSelected] = useState<CategoryFilterValue>("전체");
  return <CategoryFilter selected={selected} onSelect={setSelected} />;
}

function renderFilter() {
  return render(<Harness />);
}

describe("CategoryFilter", () => {
  it("모든 카테고리 버튼을 렌더링한다", () => {
    renderFilter();

    expect(screen.getByRole("radio", { name: "전체" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "건강" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "공부" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "운동" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "라이프" })).toBeInTheDocument();
  });

  it("기본 선택은 전체이다", () => {
    renderFilter();

    const all = screen.getByRole("radio", { name: "전체" });
    expect(all).toHaveAttribute("aria-checked", "true");
  });

  it("카테고리를 클릭하면 선택이 변경된다", async () => {
    const user = userEvent.setup();
    renderFilter();

    const exercise = screen.getByRole("radio", { name: "운동" });
    await user.click(exercise);

    expect(exercise).toHaveAttribute("aria-checked", "true");

    const all = screen.getByRole("radio", { name: "전체" });
    expect(all).toHaveAttribute("aria-checked", "false");
  });

  it("선택된 카테고리를 onSelect로 전달한다", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CategoryFilter selected="전체" onSelect={onSelect} />);

    await user.click(screen.getByRole("radio", { name: "건강" }));

    expect(onSelect).toHaveBeenCalledWith("건강");
  });

  it("radiogroup role이 있다", () => {
    renderFilter();

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });
});
