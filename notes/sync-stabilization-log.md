# 동기화 안정화 사이클 일지

1주간 운영 환경에서 habit-tracker를 직접 사용하며 드러난 멀티 디바이스 / 오프라인 퍼스트 관련 동기화·캐시 버그와, 그 수정·테스트 사이클을 일자별로 정리한 기록.

## 개요

- 기간: 2026-05-04 ~ 2026-05-10 (1주)
- 사용 환경: 운영(prod, 배포 도메인)
- 산출물
  - 일자별 작업 기록 (아래)
  - 발견 이슈 → 수정 커밋 매핑 6건 (B1 ~ B6)
  - 모든 수정에 회귀 테스트 동반 — 마감 시점 227 케이스 전부 통과

## 일지

### 1일차 (2026-05-04)

- 체크: 5/5 (운영 환경 기준)
- 코치: 미사용 (첫날이라 제안받고 싶은 내용 없음)
- 메모: 다른 기기에서 한 삭제·체크가 이 기기에 반영되지 않는 동기화 이슈의 실마리를 포착 (→ B1, B2)

### 3일차 (2026-05-06)

- 체크: 1/3
- 코치: 사용 (데이터 부족으로 의미 있는 제안 없음)
- 메모: 1일차 단서를 B1·B2로 정리해 6d63848 커밋으로 수정. 직후 B3a를 추가로 발견 — 삭제 직후 새로고침하면 서버 전송이 채 끝나지 않아, 지운 항목이 다시 나타나는 문제.

### 4일차 (2026-05-07)

- 체크: 3/3
- 코치: 사용 → 무시
  - 제안 내용: "오늘은 '도그푸딩 작성'을 5분만 해보는 건 어떨까요?"
  - 무시한 이유: 이미 오늘 도그푸딩 작성을 끝냈는데 같은 작업을 또 권해서.
- 메모: 체크해도 `/stats`의 일별 트렌드에서 오늘 막대가 0%로 멈춰 있는 현상 발견 → B4. `useToggleHabitLog.onSettled`가 byDate / byMonth만 무효화하고, `useWeeklyStats`가 사용하는 weekly 파생 키를 빠뜨려서, `/stats`를 한 번이라도 본 적 있으면 staleTime 안에 캐시가 살아남아 갱신되지 않음. 큰 글씨로 표시되는 "이번 달 전체 달성률"은 byMonth 키를 쓰기 때문에 정상이지만, 그 아래 차트만 0%로 박혀 있음. 회귀 테스트로 수정 전후 동작을 검증한 뒤 커밋. `useDeleteHabit`에도 같은 유형(habit_logs까지 삭제하면서 캐시는 habits만 무효화)의 누락이 있어 함께 정리. B3a / B3b도 aecbd63의 locked ids 패턴으로 처리 완료 — 이슈 모음에 반영.

### 5일차 (2026-05-08)

- 체크: 0/3
- 코치: 미사용
- 메모: 같은 기기에서 계정 전환을 점검하다 B5 발견 — `signOut`이 supabase 세션만 끊고 IndexedDB의 3개 테이블(habits, habit_logs, sync_queue)과 `useCoachStore` persist를 그대로 두는 바람에, 이전 사용자의 미동기화 큐가 다음 사용자 계정으로 푸시되거나 코치의 마지막 받음 시각이 그대로 인계되는 문제. `src/lib/db/clearLocalData.ts`를 추가하고 `useAuth.signOut`에서 supabase 응답이 성공한 경우에만 호출하도록 수정(실패 시에는 로컬 데이터를 보존 — 일시적인 네트워크 장애로 사용자 데이터가 사라지지 않도록). 테스트 5건 추가. → c126a9d

### 7일차 (2026-05-10)

- 체크: 0/3
- 코치: 미사용
- 메모: 전체 테스트 통과 확인(37 파일 / 227 케이스). `flush()`의 실패 경로를 정독하다 B6 발견 — 실패 항목의 `retries`를 증가시키지만 한도가 없어, RLS 위반(PGRST301)이나 FK 깨짐처럼 **영구 실패하는 항목**이 큐의 가장 앞을 계속 점유해 뒤 항목 처리를 막는 구조. 단 하나의 영구 실패 항목(poison-pill)만으로 멀티 디바이스 동기화 전체가 멈출 수 있음. `MAX_SYNC_RETRIES = 5` 한도를 도입해, 한도에 도달한 항목은 폐기하고 `console.error`로 기록한 뒤 다음 항목으로 넘어가도록 수정. 실제 PostgrestError 형태를 활용한 시나리오 테스트 3건 추가.

## 회고

- 산출물 요약
  - 7일 동안 발견·수정·테스트를 모두 마친 동기화·캐시 버그 6가지 유형 (B1·B2·B3a/b·B4·B5·B6, 총 7개 항목)
  - 발견 → 수정까지 평균 1~2일 소요 (B1·B2는 발견 이틀 후 6d63848, B4는 발견 당일 690f00e)
  - 모든 수정에 회귀 테스트 동반 — 마감 시점 227 케이스 전부 통과
  - 결함 유형별 정리는 [`adr/0001-offline-first-with-sync-queue.md`](adr/0001-offline-first-with-sync-queue.md#결과--트레이드오프) 참고, 항목별 커밋·코드 경로는 본 일지 하단 "발견한 이슈 / 아이디어 모음" 참고
- 사이클 마감 시점의 미해결 항목 (이후 후속 처리)
  - **코치의 당일 완료 상태 미반영**(B7) — 4일차에 "오늘 이미 한 작업을 또 제안"받음. 코치가 당일 완료된 작업을 프롬프트 컨텍스트에 포함하지 않아, 이미 한 일을 다시 권하는 유형의 결함. 사이클 종료 후 5ed97fe에서 시스템 프롬프트에 "오늘 완료 항목에 reschedule/simplify/skip 금지" 규칙을 추가하고, 유저 프롬프트를 14일 매트릭스 + 오늘 완료 + 오늘 미완료 세 블록으로 분해해 해결. 회귀 테스트 3건 추가.

## 마감 이후 후속 개선

### B8: 활성 탭에서의 멀티 디바이스 동기화 누락 (2026-05-12)

README 검토 중 "여러 기기에서 일관된 상태를 유지" 표현과 실제 구현 사이의 갭이 드러남. `useSyncOnReconnect`가 동기화를 트리거하는 시점이 **컴포넌트 마운트 시점**과 **`online` 이벤트**(오프라인 → 온라인 전환) 두 가지뿐이라, **이미 열려 있는 탭은 다른 기기의 변경을 자동으로 따라잡지 못함**. 즉 PC가 활성 상태로 켜져 있는 동안 모바일에서 체크해도, PC 화면은 새로고침 전까지 stale.

수정 방향: `document.visibilitychange`(탭 활성화)와 `window.focus`(창 포커스) 이벤트에서도 hydrate를 트리거하도록 보강. 이 두 이벤트는 다른 탭/창에서 돌아왔을 때 발생하므로, 사용자가 PC에 돌아오는 순간 자동으로 모바일 변경이 따라잡힘.

- 코드: [`src/hooks/useSyncOnReconnect.ts`](../src/hooks/useSyncOnReconnect.ts) — visibilitychange + focus 리스너 추가
- 테스트: visible 전환 시 hydrate, hidden 전환 시 미실행, focus 시 hydrate, 언마운트 시 세 종류 리스너 정리 — 4건 추가 (전체 233 케이스 통과)

이 갭은 1주차 사이클에서 도그푸딩 중 한 기기로만 활성 사용한 탓에 드러나지 않았던 영역. 두 기기 모두 활성 상태에서의 사용을 가정한다면 처음부터 포함되었어야 할 트리거이며, **README의 표현이 실제 동작을 앞서간 사례**로 기록한다.

## 발견한 이슈 / 아이디어 모음

- **B1**: 멀티 디바이스 환경에서 삭제한 데이터가 다른 기기 로컬에 그대로 남음. hydrate(`src/lib/db/hydrate.ts`)가 `bulkPut`만 사용해 mirror가 아닌 upsert로 동작 → 6d63848
- **B2**: 운영 환경의 신규 데이터(체크 등)가 다른 기기 화면에 즉시 반영되지 않음. hydrate 이후 React Query 캐시 무효화가 누락되어(`src/hooks/useSyncOnReconnect.ts`), staleTime 5분 동안 stale 상태가 유지됨 → 6d63848
- **B3a**: 단일 기기에서 삭제 직후 새로고침하면 삭제한 row가 부활. `enqueue`의 fire-and-forget `flush()`(`src/lib/db/sync.ts:13`)가 새로고침과 경합 → hydrate가 서버 데이터로 다시 복원시킴. B2 수정으로 stale 캐시 가림막이 걷히면서 더 잘 드러남 → aecbd63 (locked ids 패턴 도입)
- **B3b**: 오프라인 상태에서 수정한 row가 hydrate에 의해 서버의 옛값으로 덮어써질 가능성 존재. B3a와 같은 유형 → aecbd63 (locked ids 패턴, UPDATE도 함께 보호)
- **B4**: 체크/해제 후 `/stats`의 일별 트렌드에서 오늘 막대가 0%로 stale 상태. `useToggleHabitLog.onSettled`(`src/hooks/useHabitLogs.ts`)가 byDate / byMonth만 무효화해 `useWeeklyStats`의 weekly 파생 키가 누락됨. `useDeleteHabit`도 동일 유형(habit_logs까지 삭제하지만 캐시는 habits만 무효화) → 690f00e
- **B5**: 같은 기기에서 계정을 전환할 때 이전 사용자의 sync_queue가 다음 사용자 계정으로 푸시되거나 코치의 마지막 받음 시각이 인계됨. `useAuth.signOut`(`src/hooks/useAuth.ts`)이 supabase 세션만 끊고 IndexedDB·`useCoachStore` persist를 정리하지 않음. `clearLocalUserData()`를 추가하고, supabase 응답이 성공한 경우에만 호출하도록 처리(에러 시에는 보존) → c126a9d
- **B6**: 영구 실패한 sync_queue 항목(RLS 위반 / FK 깨짐 등)이 retries 한도 없이 큐의 헤드를 점유해 뒤 항목 처리를 차단. `flush()`(`src/lib/db/sync.ts`)에 `MAX_SYNC_RETRIES = 5`를 도입, 한도에 도달하면 항목을 폐기해 큐의 막힘을 해소 → fe78279
- **B7**(사이클 종료 후 해결): 코치가 이미 오늘 완료한 습관에 reschedule/simplify/skip을 제안하는 문제. `src/lib/ai/coach.ts`의 시스템·유저 프롬프트를 수정해 "오늘 완료 항목은 격려만" 규칙을 강제, `COACH_PROMPT_VERSION`을 v2로 올림 → 5ed97fe
- **B8**(사이클 종료 후 해결): 이미 열려 있는 탭이 다른 기기의 변경을 자동으로 따라잡지 못함. `useSyncOnReconnect`에 `visibilitychange`·`focus` 트리거 추가 → 본 일지의 "마감 이후 후속 개선" 항목 참고
