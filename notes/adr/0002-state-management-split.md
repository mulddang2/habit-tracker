# ADR-002: 상태 관리 라이브러리 분리 — Zustand · Jotai · TanStack Query

- 상태: 부분 폐기 — Jotai는 2026-07 제거, Zustand · TanStack Query 분리는 유지
- 일자: 2026-04 (개정 2026-07)
- 작성자: 개인 프로젝트

## 컨텍스트

이 앱이 다루는 상태는 **수명·소유자·동기화 정책이 명확히 다르다**.

| 상태 종류          | 예                                                 | 수명             | 동기화 정책                             |
| ------------------ | -------------------------------------------------- | ---------------- | --------------------------------------- |
| 서버 상태          | habits, habit_logs, coach_events 통계              | 다른 기기와 공유 | 캐시 무효화 · refetch · 낙관적 업데이트 |
| 전역 UI 상태       | 로그인 유저, 선택 날짜, 코치 카드 마지막 수신 시각 | 앱 세션          | SSOT + 일부 persist                     |
| 컴포넌트 지역 상태 | 편집 중인 습관 ID, 카테고리 필터                   | 컴포넌트 트리    | 휘발성                                  |

이를 한 라이브러리(Redux 단독 또는 Zustand 단독)로 모두 처리할 수도 있다. 가능은 하지만, 그렇게 했을 때 발생하는 비용이 분명히 존재한다.

## 결정

세 라이브러리로 책임을 **물리적으로** 분리한다.

- **TanStack Query** — 서버 상태 전부 담당. habit / log / stat의 **모든 캐시·무효화·낙관적 업데이트(optimistic update)** 가 한 곳에 모이도록 한다.
- **Zustand** — 전역 UI 상태 담당. 로그인 유저, 선택 날짜, 코치 카드를 마지막으로 받은 시각(persist). 모듈 단위 store로 분리.
- **Jotai** — 컴포넌트 지역 atom 상태 담당. 편집 중인 습관 ID, 카테고리 필터 등 컴포넌트 트리에 묶인 짧은 수명 상태. (→ 아래 [개정](#개정-jotai-제거-2026-07)에서 철회)

## 결과 / 트레이드오프

1주간의 안정화 사이클을 거치며 이 분리가 실제로 **얼마나 도움이 되는지** 한 번 검증되었다.

- **B4 (캐시 무효화 누락)** — 습관을 체크해도 `/stats`의 일별 트렌드에서 오늘 막대가 0%로 고정되어 있던 결함. 원인은 `useToggleHabitLog.onSettled`가 byDate / byMonth만 무효화하고 **weekly 파생 키**를 빠뜨린 것. 수정은 **TanStack Query 한 곳**에서 키 한 줄 추가로 끝났다.
  - 만약 서버 상태를 Zustand로 직접 관리했다면, **어떤 셀렉터가 어느 mutation 이후에 stale 상태가 되는지**를 매번 직접 추적해야 했을 것이다. TanStack Query에 위임함으로써 "이 mutation 이후에 어떤 query를 invalidate할지"가 **한 곳에 코드로 표현**된다.
- **B5 (유저 컨텍스트 누수)** — `signOut`이 IndexedDB만 비우는 데 그치면, `useCoachStore` persist의 마지막 수신 시각이 다음 사용자에게 그대로 남는다. **전역 UI 상태를 한 라이브러리(Zustand) 한 곳에만 둔** 덕분에, `signOut`에서 비워야 할 대상이 "Zustand persist + IndexedDB 두 곳"으로 명확했다. 만약 서버 상태와 UI 상태가 한 store에 섞여 있었다면, 어디까지 비울지에 대한 판단이 훨씬 복잡해졌을 것이다.
- **Jotai의 트레이드오프** — 사실 Jotai 자리는 React의 `useState` + Context로도 충분했다. Jotai를 굳이 쓰는 이점은 (a) 같은 atom을 다른 트리 위치에서 재구독할 수 있다는 점, (b) Zustand store가 **전역**인 데 비해 atom은 **지역적**이라는 의도 표현이다. 1인 코드베이스에서는 다소 **과한 선택**에 가깝다.

### 트레이드오프

- 학습 비용 — 새로 합류하는 개발자는 여러 라이브러리와 각각의 사용 패턴을 익혀야 한다. **팀 프로젝트**라면 정당화하기가 더 어려운 선택이다. (도입 시점 기준 3종 → 개정 후 2종)
- 결정 비용 — 새로운 상태가 생길 때마다 "어디에 두지?"를 매번 판단해야 한다. 기준이 분명하지 않으면 표류하기 쉽다. [컨텍스트의 상태 분류표](#컨텍스트)가 그 기준 역할을 한다. 다만 분류표는 상태의 **성격**만 규정할 뿐 도구를 규정하지는 않는다 — 실제로 이 비용이 청구된 사례가 아래 [개정](#개정-jotai-제거-2026-07)의 `categoryFilterAtom`이다. 분류표상 "컴포넌트 지역 상태"가 맞았지만, 그렇다고 atom이 필요하다는 뜻은 아니었다.

## 개정: Jotai 제거 (2026-07)

위 트레이드오프 항목에서 "다소 과한 선택"이라고 적어둔 판단을 3개월 뒤 실제로 실행했다. **Jotai를 제거하고 React `useState`로 대체한다.**

판단 근거는 사후 관찰이다. 4월에 정의한 atom은 둘이었는데, 7월 시점의 실제 사용 현황은 이랬다.

| atom                 | 프로덕션 사용처                            | 결과              |
| -------------------- | ------------------------------------------ | ----------------- |
| `editingHabitIdAtom` | 없음 — 정의와 테스트에만 존재              | 삭제              |
| `categoryFilterAtom` | `CategoryFilter`(쓰기) · `HabitList`(읽기) | `useState`로 이관 |

- **`editingHabitIdAtom`은 죽은 코드였다.** 편집 흐름은 `HabitList`가 `useState<Habit | null>`로 직접 소유하는 방향으로 자리를 잡았고, atom은 쓰이지 않은 채 테스트만 딸려 있었다. "지역 상태는 atom에 둔다"는 규칙을 미리 세워두면, 정작 구현 시점에는 더 가까운 수단(`useState`)을 쓰게 되고 규칙만 잔해로 남는다.
- **`categoryFilterAtom`은 형제 간 공유조차 아니었다.** `CategoryFilter`는 `HabitList`가 직접 렌더링하는 **자식**이다. 즉 prop 하나로 내려가는 부모-자식 관계였고, atom이 해결하던 문제(트리 위치가 떨어진 두 컴포넌트의 상태 공유)가 애초에 존재하지 않았다. `HabitList`의 `useState` + `CategoryFilter`의 `selected` / `onSelect` prop으로 대체했다.

남는 교훈은 라이브러리 선택 자체보다 **선택 시점**에 관한 것이다. 이 ADR의 4월 판단은 "이런 종류의 상태가 생길 것이다"라는 **예상**에 기대 라이브러리를 먼저 도입했다. 실제로 그 종류의 상태는 하나뿐이었고, 그마저도 prop drilling이 한 단계도 필요 없는 위치에 있었다. 지역 상태는 `useState`로 시작해 **공유가 실제로 아플 때** 도구를 올리는 편이 맞았다.

Zustand와 TanStack Query의 분리는 유지한다. 위 B4 / B5 사례처럼 **실제로 검증된 값어치**가 있고, 각각 대체 수단(직접 캐시 관리 / Context)의 비용이 분명하기 때문이다.

## 대안 검토

- **Zustand 단독** — 가능하다. 다만 서버 상태의 캐시·refetch·낙관적 업데이트를 직접 구현해야 한다. TanStack Query가 **이미 잘 풀어둔 문제**를 다시 푸는 비용이 크다.
- **Redux Toolkit + RTK Query** — RTK Query가 TanStack Query 자리를 대체할 수 있고, **단일 store**라는 장점도 있다. Redux의 보일러플레이트 비용을 어떻게 평가하느냐의 문제. 이 프로젝트에서는 **Zustand의 가벼움**을 우선했다.
- **React `useState` + Context** — 두 쪽으로 갈렸다. 컴포넌트 지역 상태에는 이 대안이 옳았고, 2026-07 [개정](#개정-jotai-제거-2026-07)에서 `useState`로 이관해 **실제로 채택**했다. 반면 전역 UI 상태(로그인 유저, 선택 날짜)에 Context만 사용하면 **불필요한 리렌더링**이 쉽게 발생하므로 그쪽은 기각을 유지한다 — Zustand는 선택적 구독으로 그 비용을 차단한다.

## 참고

- 서버 상태 무효화 경로의 한 예: [`src/hooks/useHabitLogs.ts`](https://github.com/mulddang2/habit-tracker/blob/main/src/hooks/useHabitLogs.ts)
- 안정화 일지의 B4 / B5 항목: [`notes/sync-stabilization-log.md`](https://github.com/mulddang2/habit-tracker/blob/main/notes/sync-stabilization-log.md)
