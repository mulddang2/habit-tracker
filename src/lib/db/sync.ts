import { db, type SyncQueueItem } from "./local";
import { withSyncLock } from "./syncLock";
import { createClient } from "@/lib/supabase/client";

// 영구 실패한 항목이 큐 헤드를 영원히 막지 않도록 한도를 둔다.
// 한도 도달 시 큐에서 제거해 뒤 항목 처리를 차단 해제한다.
export const MAX_SYNC_RETRIES = 5;

type QueueInput = Omit<SyncQueueItem, "id" | "retries" | "created_at">;

/**
 * 큐 삽입만 수행한다 — 전송을 트리거하지 않는다.
 *
 * 호출자의 Dexie 트랜잭션에 합류시키기 위한 진입점. 로컬 변경과 큐 삽입이
 * 한 트랜잭션 안에서 함께 커밋되어야 pullFromServer가 "로컬은 이미 삭제됐는데
 * 큐에는 아직 없는" 중간 상태를 관측하지 못한다.
 */
export async function enqueueWithin(item: QueueInput): Promise<void> {
  await db.sync_queue.add({
    ...item,
    created_at: Date.now(),
    retries: 0,
  });
}

/** 트랜잭션 커밋 이후에 호출한다. 트랜잭션 안에서 부르면 안 된다. */
export function triggerPush(): void {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    pushToServer().catch(() => {});
  }
}

export async function enqueue(item: QueueInput): Promise<void> {
  await enqueueWithin(item);
  triggerPush();
}

// 중복 실행 가드 — 동시 호출이 같은 큐 항목을 두 번 전송하지 않도록 한다.
// 진행 중 들어온 요청은 현재 실행을 공유하되, 그 사이 쌓인 항목을 놓치지
// 않도록 완료 후 한 번 더 돌린다.
let running: Promise<void> | null = null;
let rerunRequested = false;

export async function pushToServer(): Promise<void> {
  if (running) {
    rerunRequested = true;
    return running;
  }

  running = (async () => {
    try {
      do {
        rerunRequested = false;
        // pullFromServer와 겹치지 않게 순서를 세운다. 잠금을 한 번에 오래 쥐지
        // 않도록 루프 안쪽에서 잡았다 놓아, 반복 사이에 조회가 끼어들 수 있게 한다.
        await withSyncLock(drainQueue);
      } while (rerunRequested);
    } finally {
      running = null;
    }
  })();

  return running;
}

async function drainQueue(): Promise<void> {
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
