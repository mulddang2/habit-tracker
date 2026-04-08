import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useHabitsQuery,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  habitKeys,
} from "@/hooks/useHabits";
import { createQueryWrapper } from "@/tests/helpers/query-wrapper";
import type { Habit } from "@/types/habit";

vi.mock("@/lib/api/habits", () => ({
  fetchHabits: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
}));

import {
  fetchHabits,
  createHabit,
  updateHabit,
  deleteHabit,
} from "@/lib/api/habits";

const mockHabits: Habit[] = [
  {
    id: "1",
    user_id: "user-1",
    title: "물 2L 마시기",
    category: "건강",
    order: 1,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  },
  {
    id: "2",
    user_id: "user-1",
    title: "코딩 1시간",
    category: "공부",
    order: 2,
    created_at: "2026-04-01",
    updated_at: "2026-04-01",
  },
];

describe("useHabitsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("습관 목록을 조회한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useHabitsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHabits);
    expect(fetchHabits).toHaveBeenCalledOnce();
  });

  it("API 에러 시 에러 상태를 반환한다", async () => {
    vi.mocked(fetchHabits).mockRejectedValue(new Error("fetch error"));
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useHabitsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("fetch error");
  });
});

describe("useCreateHabit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("습관을 생성한다", async () => {
    const newHabit = { ...mockHabits[0], id: "3", title: "새 습관" };
    vi.mocked(createHabit).mockResolvedValue(newHabit);
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useCreateHabit(), { wrapper });

    result.current.mutate({ title: "새 습관", category: "건강" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createHabit).toHaveBeenCalledWith(
      { title: "새 습관", category: "건강" },
      expect.anything()
    );
  });

  it("옵티미스틱 업데이트로 캐시에 즉시 추가한다", async () => {
    vi.mocked(createHabit).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockHabits[0]), 100))
    );
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useCreateHabit(), { wrapper });

    result.current.mutate({ title: "새 습관", category: "운동" });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
      expect(cached).toHaveLength(3);
      expect(cached?.[2].title).toBe("새 습관");
      expect(cached?.[2].category).toBe("운동");
    });
  });

  it("서버 에러 시 추가된 항목이 롤백된다", async () => {
    vi.mocked(createHabit).mockRejectedValue(new Error("create error"));
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useCreateHabit(), { wrapper });

    result.current.mutate({ title: "실패할 습관", category: "건강" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
    expect(cached).toHaveLength(2);
  });
});

describe("useUpdateHabit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("옵티미스틱 업데이트로 캐시를 즉시 수정한다", async () => {
    vi.mocked(fetchHabits).mockResolvedValue(mockHabits);
    vi.mocked(updateHabit).mockResolvedValue({
      ...mockHabits[0],
      title: "수정된 습관",
    });
    const { wrapper, queryClient } = createQueryWrapper();

    // 캐시에 초기 데이터 세팅
    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useUpdateHabit(), { wrapper });

    result.current.mutate({ id: "1", title: "수정된 습관" });

    // 옵티미스틱 업데이트: 서버 응답 전에 캐시가 변경됨
    await waitFor(() => {
      const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
      expect(cached?.[0].title).toBe("수정된 습관");
    });
  });

  it("서버 에러 시 이전 상태로 롤백한다", async () => {
    vi.mocked(updateHabit).mockRejectedValue(new Error("update error"));
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useUpdateHabit(), { wrapper });

    result.current.mutate({ id: "1", title: "실패할 수정" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
    expect(cached?.[0].title).toBe("물 2L 마시기");
  });
});

describe("useDeleteHabit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("옵티미스틱 삭제로 캐시에서 즉시 제거한다", async () => {
    vi.mocked(deleteHabit).mockResolvedValue(undefined);
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useDeleteHabit(), { wrapper });

    result.current.mutate("1");

    await waitFor(() => {
      const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
      expect(cached).toHaveLength(1);
      expect(cached?.[0].id).toBe("2");
    });
  });

  it("서버 에러 시 삭제된 항목이 복원된다", async () => {
    vi.mocked(deleteHabit).mockRejectedValue(new Error("delete error"));
    const { wrapper, queryClient } = createQueryWrapper();

    queryClient.setQueryData(habitKeys.list(), mockHabits);

    const { result } = renderHook(() => useDeleteHabit(), { wrapper });

    result.current.mutate("1");

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Habit[]>(habitKeys.list());
    expect(cached).toHaveLength(2);
  });
});
