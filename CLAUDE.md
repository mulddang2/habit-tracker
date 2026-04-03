# Habit Tracker

매일 습관을 기록·달성·시각화하는 개인 생산성 앱.

## 기술 스택

| 구분          | 기술                           |
| ------------- | ------------------------------ |
| 프레임워크    | Next.js 15 (App Router)        |
| 언어          | TypeScript                     |
| 전역 상태     | Zustand                        |
| 원자 상태     | Jotai                          |
| 서버 상태     | React Query (TanStack Query)   |
| DB            | Supabase                       |
| UI            | shadcn/ui + Tailwind CSS       |
| 차트          | Recharts                       |
| 폼            | React Hook Form + Zod          |
| 테스트        | Vitest + React Testing Library |
| CI/CD         | GitHub Actions + Vercel        |
| 성능 측정     | Lighthouse CI                  |
| 모니터링      | Sentry                         |
| 패키지 매니저 | pnpm                           |

## 상태관리 설계 원칙

```
Zustand      → 전역 UI 상태 — 로그인 유저 정보, 선택된 날짜, 다크모드 테마
React Query  → 서버 상태   — 습관 목록, 달성 기록, 통계 데이터 캐싱·동기화
Jotai        → 원자 상태   — 습관별 오늘 체크 여부, 편집 모드, 드래그 순서
Local state  → 컴포넌트 내 — 모달 열림 여부, 입력값, 폼 유효성
```

## 폴더 구조

```
src/
├── app/
│   ├── (auth)/             # 로그인·회원가입 라우트 그룹
│   ├── (dashboard)/        # 인증 필요한 라우트 그룹
│   │   ├── habits/         # 습관 목록·관리
│   │   ├── calendar/       # 달력 뷰
│   │   └── stats/          # 통계 대시보드
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   └── habits/             # 습관 도메인 컴포넌트
├── hooks/                  # 커스텀 훅
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   └── utils/              # 유틸 함수
├── stores/                 # Zustand 스토어
├── atoms/                  # Jotai 아톰
└── types/                  # TypeScript 타입 정의
```

## 핵심 기능

- 습관 CRUD (추가·수정·삭제)
- 오늘 습관 체크/해제 (Optimistic Update + 롤백)
- 카테고리 태그 (건강·공부·운동·라이프)
- 정렬·필터링
- 월별 달성률 캘린더 + 연속 달성 스트릭
- 주간·월간 달성률 차트
- 알림 기능 + 반응형 레이아웃
- 접근성 (WCAG AA 기준)

## 컨벤션

- 패키지 설치/스크립트 실행 시 `pnpm` 사용
- 테스트 커버리지 목표: 70%+
