"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, CalendarDays, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/habits", label: "습관", icon: ListChecks },
  { href: "/calendar", label: "달력", icon: CalendarDays },
  { href: "/stats", label: "통계", icon: BarChart3 },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background fixed inset-x-0 bottom-0 z-50 border-t sm:hidden"
      aria-label="모바일 내비게이션"
    >
      <div className="flex h-14 items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1 text-xs transition-colors",
              pathname === href ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
