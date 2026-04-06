"use client";

import Image from "next/image";
import { User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  const { signOut } = useAuth();
  const user = useAppStore((s) => s.user);

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <h1 className="text-lg font-bold">습관 트래커</h1>

        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name || "프로필"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="bg-muted flex size-8 items-center justify-center rounded-full">
              <User className="size-4" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={signOut}
            aria-label="로그아웃"
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
