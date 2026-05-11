import { db, type SyncQueueItem } from "./local";
import { createClient } from "@/lib/supabase/client";

// 영구 실패한 항목이 큐 헤드를 영원히 막지 않도록 한도를 둔다.
// 한도 도달 시 큐에서 제거해 뒤 항목 처리를 차단 해제한다.
export const MAX_SYNC_RETRIES = 5;

export async function enqueue(
  item: Omit<SyncQueueItem, "id" | "retries" | "created_at">
): Promise<void> {
  await db.sync_queue.add({
    ...item,
    created_at: Date.now(),
    retries: 0,
  });
  if (typeof navigator !== "undefined" && navigator.onLine) {
    flush().catch(() => {});
  }
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
      const nextRetries = item.retries + 1;

      if (nextRetries >= MAX_SYNC_RETRIES) {
        // 영구 실패 — 큐에서 제거 후 다음 항목 계속 처리
        await db.sync_queue.delete(item.id!);
        console.error(
          `[sync] 항목 ${item.id} (${item.table}/${item.operation})를 ${MAX_SYNC_RETRIES}회 재시도 후 폐기:`,
          message
        );
        continue;
      }

      await db.sync_queue.update(item.id!, {
        retries: nextRetries,
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
