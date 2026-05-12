# ADR-001: 오프라인 퍼스트 — IndexedDB + sync_queue 기반 구조

- 상태: 채택 (Accepted)
- 일자: 2026-04 ~ (1주차 안정화 사이클 2026-05-04 ~ 10 동안 검증)
- 작성자: 개인 프로젝트

## 컨텍스트

이 앱은 **모바일과 PC를 동시에 사용하는 환경**을 1차 전제로 둔다. 사용자는 출근길에 모바일에서 습관을 체크하고, 사무실 자리에 앉으면 PC에서 같은 데이터를 본다. 모바일 네트워크는 지하철·엘리베이터에서 자주 끊긴다.

가장 단순한 구현(매 mutation마다 Supabase에 직접 fetch)은 두 가지 문제를 가진다.

1. **네트워크 실패에 취약하다** — 체크 직후 화면을 닫거나 네트워크가 끊기면 데이터가 사라진다.
2. **체감 응답이 느리다** — 체크 → 서버 왕복(200ms 이상) → UI 갱신 순으로 동작하기 때문에, 빠른 연속 체크가 어색하게 느껴진다.

따라서 다음 세 가지가 필요하다.

- 로컬 mirror — 즉각적인 응답과 오프라인 동작을 위해
- 로컬 → 서버 변경의 **큐 기반 직렬화** — 순서 보장과 네트워크 복구 시 재시도를 위해
- 다른 기기의 변경을 가져오는 **hydrate 경로** — 멀티 디바이스 일관성을 위해

## 결정

세 부분으로 구성된 오프라인 퍼스트 구조를 채택한다.

1. **Dexie (IndexedDB) mirror** — `habits`, `habit_logs` 두 테이블을 로컬에 미러링한다. UI는 항상 로컬을 먼저 읽는다.
2. **`sync_queue` 큐** — 모든 mutation은 큐에 enqueue된 뒤 `flush()`가 순서대로 Supabase에 전송한다. enqueue 직후 `navigator.onLine`이 true이면 즉시 flush를 시도하고, 실패하면 다음 기회(`useSyncOnReconnect`)에 재시도한다.
3. **재접속·재방문 시 hydrate** — 다음 시점마다 서버에서 최신 상태를 가져와 로컬 mirror를 갱신한다. flush가 끝난 뒤에 실행해 race condition을 피한다.
   - 컴포넌트 최초 마운트
   - 온라인 복귀(`online` 이벤트)
   - 탭 활성화(`visibilitychange` → `visible`)
   - 창 포커스(`focus` 이벤트)

   앞 두 가지만으로는 **이미 열려 있는 탭이 다른 기기의 변경을 따라잡지 못한다**(PC가 켜져 있는 동안 모바일에서 체크해도 PC는 새로고침 전까지 stale). 뒤 두 이벤트가 다른 탭/창에서 돌아온 시점을 잡아 보강한다.

## 결과 / 트레이드오프

1주간의 도그푸딩 사이클을 거치며 이 구조에 **5가지 결함 유형**이 잠재해 있다는 점이 드러났고, 모두 회귀 테스트로 수렴시켰다. 사이클 종료 후 README 검토 중 한 가지 갭(B8)을 추가로 발견·보강. 유형별로 한 줄 요약은 아래와 같다.

- **mirror가 아닌 upsert** (B1) — hydrate의 `bulkPut`만으로는 서버에서 **삭제된** row가 로컬에 남는다. mirror는 delta가 아니라 **전체 동기화**여야 한다.
- **캐시 무효화 누락** (B2, B4) — hydrate 후 React Query 캐시를 무효화하지 않으면, staleTime(5분) 동안 화면이 옛 데이터로 박혀 있는다. mutation `onSettled`에서도 **파생 키**(weekly 등)를 빠뜨리기 쉽다.
- **flush ↔ hydrate race** (B3a/b) — fire-and-forget 방식의 flush와 hydrate가 경합해 **방금 삭제한 row가 다시 부활**한다. flush 진행 중인 id를 "locked"로 표시해 hydrate가 덮어쓰지 못하게 막는 방식으로 해결.
- **사용자 경계 누수** (B5) — `signOut`이 supabase 세션만 끊고 IndexedDB·zustand persist를 그대로 두면, 이전 사용자의 미동기화 큐가 **다음 사용자 계정으로 푸시**된다. signOut 시 로컬 데이터까지 명시적으로 비워야 한다.
- **head-of-line blocking** (B6) — RLS 위반·FK 깨짐 같은 **영구 실패** 항목이 재시도 한도 없이 큐의 가장 앞을 점유해 **멀티 디바이스 동기화 전체를 멈춰 세운다**. `MAX_SYNC_RETRIES = 5` 한도를 도입.
- **활성 탭의 다른 기기 변경 미반영** (B8, 사이클 마감 이후 보강) — 초기에는 hydrate 트리거가 마운트와 `online`뿐이라, **이미 열려 있는 탭이 다른 기기 변경을 따라잡지 못했다**. `visibilitychange`(visible) · `focus` 이벤트를 추가해, 다른 탭/창에서 돌아오는 시점에 자동 동기화되도록 보강.

발견 → 수정 → 테스트 사이클의 자세한 기록은 [`notes/sync-stabilization-log.md`](../sync-stabilization-log.md) 참고.

### 트레이드오프

- 가장 단순한 구현 대비 코드 양이 약 **3배** 늘었다. 다만 그 코드 대부분은 위 결함 유형을 한 번씩 거치며 **필요성이 입증된** 코드다.
- 로컬과 서버 두 상태를 동기화하는 모델은 본질적으로 race condition을 만든다. 모든 mutation 경로에 대한 **회귀 테스트가 필수**이며, 이번 사이클을 통해 그 테스트 자산을 확보했다 (233 케이스 통과).

## 대안 검토

- **Supabase Realtime 채널** — 멀티 디바이스 push 갱신을 깔끔하게 풀 수 있지만, (a) 오프라인 시나리오 자체를 해결해주지는 못하고, (b) WebSocket 채널을 추가로 관리해야 하는 부담이 생긴다. 후속 작업으로 분리.
- **`useSWR` 또는 React Query 단독 캐싱** — 메모리 캐시는 새로고침이나 앱 종료 시 휘발한다. mirror가 **디스크에** 있어야 오프라인 첫 진입 시 화면이 비어 있지 않다.
- **Service Worker만으로 background sync** — Workbox / Serwist의 background-sync는 **요청 큐**에 가까워, 도메인 mutation의 **논리적 순서**를 보장하기 어렵다. `sync_queue`는 도메인 객체 단위로 직렬화한다.

## 참고

- 코드 진입점: [`src/lib/db/sync.ts`](../../src/lib/db/sync.ts), [`src/lib/db/hydrate.ts`](../../src/lib/db/hydrate.ts), [`src/hooks/useSyncOnReconnect.ts`](../../src/hooks/useSyncOnReconnect.ts)
- 안정화 일지: [`notes/sync-stabilization-log.md`](../sync-stabilization-log.md)
