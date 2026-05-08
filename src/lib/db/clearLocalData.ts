import { db } from "./local";
import { useCoachStore } from "@/stores/useCoachStore";

/**
 * 로그아웃·계정 전환 시 호출. 로컬 IndexedDB와 사용자별 zustand persist를 모두 비운다.
 *
 * Why: hydrate는 서버 응답을 mirror하지만 sync_queue에 잔존하는 작업과 coach-store는 정리하지 않음.
 * 이를 두면 다음 사용자의 계정으로 큐가 푸시되거나 쿨다운이 인계되는 등 데이터가 누수된다.
 */
export async function clearLocalUserData(): Promise<void> {
  await Promise.all([
    db.habits.clear(),
    db.habit_logs.clear(),
    db.sync_queue.clear(),
  ]);
  useCoachStore.persist.clearStorage();
  useCoachStore.getState().reset();
}
