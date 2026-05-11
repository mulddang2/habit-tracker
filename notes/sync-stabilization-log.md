# 동기화 안정화 사이클 일지

1주 동안 prod에서 habit-tracker를 직접 사용하며 드러난 multi-device·offline-first 동기화/캐시 클래스 버그와, 그 수정·테스트 사이클을 일자별로 보존한 기록.

원래는 "도그푸딩(KPI 측정)"으로 시작했으나, 1주차에 동기화 클래스 버그가 연쇄로 드러나면서 KPI 측정 단계로 진입하지 못함. 본 일지는 그 *안정화 사이클*을 있는 그대로 보존한 기록이며, 사용자 행동 KPI 측정은 별도 트랙으로 분리.

## 개요

- 기간: 2026-05-04 ~ 2026-05-10 (1주)
- 사용 환경: prod (배포 도메인)
- 산출물
  - 일자별 일지(아래)
  - 발견한 이슈 → 수정 커밋 매핑 6건 (B1~B6)
  - 모든 fix에 회귀 방지 테스트 동반 — 마감 시점 227 케이스 그린

## 일지

### 1일차 (2026-05-04)

- 체크: 5/5 (prod 기준)
- 코치: 안 받음 (첫날이라 제안받고 싶은 내용 없음)
- 메모: 다른 기기에서 한 삭제·체크가 이 기기에 반영 안 되는 동기화 클래스 단서 포착 (→ B1, B2)

### 2일차 (2026-05-05)

쉼

### 3일차 (2026-05-06)

- 체크: 1/3
- 코치: 받음 (데이터 부족)
- 메모: 1일차 단서를 B1·B2로 정리해 6d63848로 수정 커밋. 직후 B3a 발견 — 삭제 직후 새로고침하면 서버 전송이 끝나기 전이어서 지운 항목이 다시 살아남.

### 4일차 (2026-05-07)

- 체크: 3/3
- 코치: 받음 -> 무시
  - 제안: 오늘은 '도그푸딩 작성'을 5분만 해보는 건 어떨까요?
  - 이유: 오늘 도그푸딩 작성 했는데, 위와 같이 제안해서 무시함.
- 메모: 체크해도 /stats 일별 트렌드의 오늘 막대가 0%로 멈춰 있는 걸 발견 → B4. `useToggleHabitLog.onSettled`이 byDate/byMonth만 무효화하고 `useWeeklyStats`가 쓰는 weekly 파생 키를 빼먹어서, /stats를 먼저 본 적 있으면 캐시가 staleTime 안에 살아남아 안 갱신됨. 큰 글씨 "이번 달 전체 달성률"은 byMonth라 멀쩡한데 그 아래 차트만 0%로 박힘. 회귀 방지 테스트로 수정 전후 동작 검증 후 커밋. `useDeleteHabit`에도 같은 클래스(habit_logs도 같이 지우는데 캐시는 habits만 무효화) 누락이 있어 함께 정리. B3a/B3b도 aecbd63의 locked ids 패턴으로 처리 완료 — 이슈 모음에 반영함.

### 5일차 (2026-05-08)

- 체크: 0/3
- 코치: 안 받음
- 메모: 같은 기기에서 계정 전환을 점검하다 B5 발견 — `signOut`이 supabase 세션만 끊고 IndexedDB 3개 테이블(habits, habit_logs, sync_queue)과 `useCoachStore` persist를 그대로 두어, 이전 사용자의 미동기화 큐가 다음 사용자 계정으로 푸시되거나 코치 쿨다운이 인계됨. `src/lib/db/clearLocalData.ts` 추가 후 `useAuth.signOut`에서 supabase 응답 성공 시에만 호출(실패 시에는 로컬 보존 — 네트워크 일시 장애로 데이터 날리지 않도록). 테스트 5건 보강. → c126a9d

### 6일차 (2026-05-09)

쉼

### 7일차 (2026-05-10)

- 체크: 0/3
- 코치: 안 받음
- 메모: 전체 테스트 통과 확인(37 파일/227 케이스). `flush()` 실패 경로를 정독하다 B6 발견 — 실패 항목의 `retries`를 증가시키지만 한도가 없어, RLS 위반(PGRST301)·FK 깨짐 같은 **영구** 실패 항목이 큐 헤드를 영원히 점유하고 뒤 항목 처리를 막는 구조. 단일 poison-pill 하나가 멀티 기기 동기화 전체를 정지시킬 수 있음. `MAX_SYNC_RETRIES = 5` 한도 도달 시 항목을 폐기하고 `console.error`로 기록한 뒤 다음 항목으로 넘어가도록 수정. 실제 PostgrestError 형태로 시나리오 테스트 3건 보강.

## 회고

- 산출물 요약:
  - 7일 동안 발견·수정·테스트 완료한 동기화/캐시 클래스 버그 6 카테고리(B1·B2·B3a/b·B4·B5·B6, 총 7개 항목)
  - 발견 → 수정 사이클이 평균 1~2일 (B1·B2 발견 이틀 후 6d63848, B4 발견 당일 690f00e)
  - 모든 fix에 회귀 방지 테스트 동반 — 마감 시점 227 케이스 그린
- 패턴화된 결함 클래스:
  - **mirror 대신 upsert** — hydrate의 bulkPut만으로는 서버 삭제가 전파 안 됨 (B1)
  - **캐시 무효화 누락** — hydrate(B2) 및 mutation onSettled(B4, useDeleteHabit 동일 클래스)에서 일부 React Query 키 무효화를 빼먹음
  - **flush-hydrate race** — fire-and-forget flush와 hydrate가 경합해 삭제된 row가 되살아남 (B3a/B3b, locked ids 패턴으로 해결)
  - **사용자 경계 누수** — signOut이 supabase 세션만 끊고 로컬 IndexedDB·zustand persist를 두면 큐가 다음 계정으로 푸시됨 (B5)
  - **head-of-line blocking** — poison-pill 항목이 재시도 한도 없이 큐 헤드를 점유 (B6, MAX_SYNC_RETRIES 도입)
- 미해결로 남긴 것:
  - **코치의 당일 완료 상태 미반영**(잠재 B7) — 4일차에 "오늘 이미 한 일을 제안"받음. 코치가 당일 완료 작업을 프롬프트 컨텍스트에 포함하지 않아 이미 한 일을 또 권하는 클래스. 사용자 KPI 측정 트랙으로 분리해 추후 처리.
- 프로세스 메모:
  - 5/8 무렵 일지가 stash로 묻혀 마감 직전에야 발견 — 주간 일괄 커밋 정책상 커밋은 미루더라도 **작성 즉시 working tree에 두기(stash 금지)** 규칙을 다음 사이클부터 적용한다.

## 발견한 이슈 / 아이디어 모음

- B1: 멀티 기기에서 삭제한 데이터가 다른 기기 로컬에 잔존. hydrate(`src/lib/db/hydrate.ts`)가 bulkPut만 사용해 mirror가 아닌 upsert로 동작 → 6d63848
- B2: prod의 신규 데이터(체크 등)가 다른 기기 화면에 즉시 안 뜸. hydrate 후 React Query 캐시 무효화 누락(`src/hooks/useSyncOnReconnect.ts`), staleTime 5분 동안 stale → 6d63848
- B3a: 단일 기기에서 삭제 후 F5하면 삭제한 row 부활. `enqueue`의 fire-and-forget `flush()`(`src/lib/db/sync.ts:13`)가 F5와 race → hydrate가 서버 데이터로 부활시킴. B2 fix가 stale 캐시 가림막을 걷어 더 잘 보임. → aecbd63 (locked ids 패턴)
- B3b: 오프라인에서 수정한 row가 hydrate에 의해 서버 옛값으로 덮어써질 수 있음. B3a와 동일 클래스. → aecbd63 (locked ids 패턴, UPDATE도 함께 보호)
- B4: 체크/해제 후 /stats 일별 트렌드의 오늘 막대가 0%로 stale. `useToggleHabitLog.onSettled`(`src/hooks/useHabitLogs.ts`)이 byDate/byMonth만 무효화해 `useWeeklyStats`의 weekly 파생 키 누락. `useDeleteHabit`도 동일 클래스(habit_logs까지 지우는데 캐시는 habits만) 누락이라 함께 처리. → 690f00e
- B5: 같은 기기에서 계정 전환 시 이전 사용자의 sync_queue가 다음 사용자 계정으로 푸시되거나 코치 쿨다운이 인계됨. `useAuth.signOut`(`src/hooks/useAuth.ts`)이 supabase 세션만 끊고 IndexedDB·`useCoachStore` persist를 정리하지 않음. `clearLocalUserData()` 추가, supabase 응답 성공 시에만 호출(에러 시 보존). → c126a9d
- B6: 영구 실패한 sync_queue 항목(RLS 위반/FK 깨짐 등)이 retries 한도 없이 큐 헤드를 점유해 뒤 항목 처리를 차단. `flush()`(`src/lib/db/sync.ts`)에 `MAX_SYNC_RETRIES = 5` 도입, 한도 도달 시 폐기로 차단 해제. → fe78279

### 아이디어

- 체크 항목에 기한(만료일)을 두는 옵션 — 3일차에 떠오름. 단기 목표성 습관에 대응하기 위함.
