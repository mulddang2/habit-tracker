"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  LogOut,
  ListChecks,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/habits", label: "습관", icon: ListChecks },
  { href: "/calendar", label: "달력", icon: CalendarDays },
  { href: "/stats", label: "통계", icon: BarChart3 },
] as const;

export function DashboardHeader() {
  const { signOut } = useAuth();
  const user = useAppStore((s) => s.user);
  const pathname = usePathname();

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">습관 트래커</h1>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

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
