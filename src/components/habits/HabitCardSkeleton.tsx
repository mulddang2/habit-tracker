export function HabitCardSkeleton() {
  return (
    <div
      className="flex animate-pulse items-center gap-3 rounded-lg border p-3"
      role="status"
      aria-label="습관 로딩 중"
    >
      <div className="bg-muted size-4 shrink-0 rounded" />

      <div className="flex flex-1 items-center gap-2">
        <div className="bg-muted h-4 w-24 rounded" />
        <div className="bg-muted h-5 w-10 rounded-full" />
      </div>

      <div className="flex gap-1">
        <div className="bg-muted size-6 rounded" />
        <div className="bg-muted size-6 rounded" />
      </div>
    </div>
  );
}
