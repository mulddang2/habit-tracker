"use client";

import { Button } from "@/components/ui/button";
import type { Category } from "@/types/habit";

export type CategoryFilterValue = Category | "전체";

const FILTERS: CategoryFilterValue[] = [
  "전체",
  "건강",
  "공부",
  "운동",
  "라이프",
];

interface CategoryFilterProps {
  selected: CategoryFilterValue;
  onSelect: (filter: CategoryFilterValue) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="카테고리 필터">
      {FILTERS.map((filter) => (
        <Button
          key={filter}
          variant={selected === filter ? "default" : "outline"}
          size="sm"
          role="radio"
          aria-checked={selected === filter}
          onClick={() => onSelect(filter)}
        >
          {filter}
        </Button>
      ))}
    </div>
  );
}
