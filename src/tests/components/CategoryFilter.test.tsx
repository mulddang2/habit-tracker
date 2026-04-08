import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "jotai";
import { CategoryFilter } from "@/components/habits/CategoryFilter";

function renderWithJotai() {
  return render(
    <Provider>
      <CategoryFilter />
    </Provider>
  );
}

describe("CategoryFilter", () => {
  it("모든 카테고리 버튼을 렌더링한다", () => {
    renderWithJotai();

    expect(screen.getByRole("radio", { name: "전체" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "건강" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "공부" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "운동" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "라이프" })).toBeInTheDocument();
  });

  it("기본 선택은 전체이다", () => {
    renderWithJotai();

    const all = screen.getByRole("radio", { name: "전체" });
    expect(all).toHaveAttribute("aria-checked", "true");
  });

  it("카테고리를 클릭하면 선택이 변경된다", async () => {
    const user = userEvent.setup();
    renderWithJotai();

    const exercise = screen.getByRole("radio", { name: "운동" });
    await user.click(exercise);

    expect(exercise).toHaveAttribute("aria-checked", "true");

    const all = screen.getByRole("radio", { name: "전체" });
    expect(all).toHaveAttribute("aria-checked", "false");
  });

  it("radiogroup role이 있다", () => {
    renderWithJotai();

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });
});
