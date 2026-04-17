import { db, type SyncQueueItem } from "./local";
import { createClient } from "@/lib/supabase/client";

export async function enqueue(
  item: Omit<SyncQueueItem, "id" | "retries" | "created_at">
): Promise<void> {
  await db.sync_queue.add({
    ...item,
    created_at: Date.now(),
    retries: 0,
  });
}

export async function flush(): Promise<void> {
  const items = await db.sync_queue.orderBy("id").toArray();
  if (items.length === 0) return;

  const supabase = createClient();

  for (const item of items) {
    try {
      await processItem(supabase, item);
      await db.sync_queue.delete(item.id!);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.sync_queue.update(item.id!, {
        retries: item.retries + 1,
        last_error: message,
      });
      // 순서를 보장하기 위해 나머지 항목 처리 중단
      break;
    }
  }
}

async function processItem(
  supabase: ReturnType<typeof createClient>,
  item: SyncQueueItem
): Promise<void> {
  const { table, operation, payload } = item;

  switch (operation) {
    case "INSERT": {
      const { error } = await supabase.from(table).insert(payload);
      if (error) {
        // 중복 키 에러는 이미 서버에 존재 — 무시
        if (error.code === "23505") return;
        throw error;
      }
      break;
    }
    case "UPDATE": {
      const { id, ...data } = payload;
      const { error } = await supabase
        .from(table)
        .update(data)
        .eq("id", id as string);
      if (error) throw error;
      break;
    }
    case "DELETE": {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", payload.id as string);
      if (error) throw error;
      break;
    }
  }
}

export async function getPendingCount(): Promise<number> {
  return db.sync_queue.count();
}
