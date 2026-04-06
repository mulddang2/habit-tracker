"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { habitSchema, type HabitFormData } from "@/lib/validations/habit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/types/habit";

const CATEGORIES: Category[] = ["건강", "공부", "운동", "라이프"];

interface HabitFormProps {
  defaultValues?: HabitFormData;
  onSubmit: (data: HabitFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
}

export function HabitForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = "추가",
}: HabitFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: defaultValues ?? { title: "", category: undefined },
  });

  const selectedCategory = useWatch({ control, name: "category" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium">
          습관 이름
        </label>
        <Input
          id="title"
          placeholder="예: 물 2L 마시기"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          {...register("title")}
        />
        {errors.title && (
          <p id="title-error" className="text-destructive text-sm" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="text-sm font-medium">
          카테고리
        </label>
        <Select
          value={selectedCategory ?? ""}
          onValueChange={(val) =>
            setValue("category", val as Category, { shouldValidate: true })
          }
        >
          <SelectTrigger id="category" className="w-full">
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p
            id="category-error"
            className="text-destructive text-sm"
            role="alert"
          >
            {errors.category.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
