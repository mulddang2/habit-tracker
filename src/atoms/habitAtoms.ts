import { atom } from "jotai";
import type { Category } from "@/types/habit";

export const editingHabitIdAtom = atom<string | null>(null);

export const categoryFilterAtom = atom<Category | "전체">("전체");
