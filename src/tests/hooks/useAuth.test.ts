import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/useAppStore";

const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
let authChangeCallback: (event: string, session: unknown) => void;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authChangeCallback = cb;
        mockOnAuthStateChange(cb);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      },
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  }),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().clearUser();
  });

  it("세션이 있으면 유저 정보를 스토어에 저장한다", () => {
    renderHook(() => useAuth());

    act(() => {
      authChangeCallback("SIGNED_IN", {
        user: {
          id: "user-1",
          email: "test@test.com",
          user_metadata: {
            full_name: "테스트",
            avatar_url: "https://example.com/avatar.png",
          },
        },
      });
    });

    const user = useAppStore.getState().user;
    expect(user).toEqual({
      id: "user-1",
      email: "test@test.com",
      name: "테스트",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("세션이 없으면 유저를 클리어한다", () => {
    useAppStore.getState().setUser({
      id: "user-1",
      email: "test@test.com",
      name: "테스트",
      avatarUrl: "",
    });

    renderHook(() => useAuth());

    act(() => {
      authChangeCallback("SIGNED_OUT", null);
    });

    expect(useAppStore.getState().user).toBeNull();
  });

  it("signInWithGoogle을 호출한다", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("signOut을 호출하면 /login으로 이동한다", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    // window.location.href mock
    const locationSpy = vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      href: "",
      origin: "http://localhost:3000",
    } as Location);

    const hrefSetter = vi.fn();
    Object.defineProperty(window.location, "href", {
      set: hrefSetter,
      configurable: true,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    locationSpy.mockRestore();
  });

  it("user_metadata가 없으면 빈 문자열로 설정한다", () => {
    renderHook(() => useAuth());

    act(() => {
      authChangeCallback("SIGNED_IN", {
        user: {
          id: "user-2",
          email: null,
          user_metadata: {},
        },
      });
    });

    const user = useAppStore.getState().user;
    expect(user?.email).toBe("");
    expect(user?.name).toBe("");
    expect(user?.avatarUrl).toBe("");
  });
});
