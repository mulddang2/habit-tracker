"use client";

import { useAtom } from "jotai";
import { categoryFilterAtom } from "@/atoms/habitAtoms";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types/habit";

const FILTERS: (Category | "전체")[] = [
  "전체",
  "건강",
  "공부",
  "운동",
  "라이프",
];

export function CategoryFilter() {
  const [selected, setSelected] = useAtom(categoryFilterAtom);

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="카테고리 필터">
      {FILTERS.map((filter) => (
        <Button
          key={filter}
          variant={selected === filter ? "default" : "outline"}
          size="sm"
          role="radio"
          aria-checked={selected === filter}
          onClick={() => setSelected(filter)}
        >
          {filter}
        </Button>
      ))}
    </div>
  );
}
