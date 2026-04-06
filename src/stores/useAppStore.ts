import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

interface AppState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
