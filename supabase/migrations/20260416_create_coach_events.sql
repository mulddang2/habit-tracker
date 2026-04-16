create table coach_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_version text not null,
  suggestion jsonb not null,
  action text not null check (action in ('accepted', 'dismissed', 'ignored')),
  created_at timestamptz not null default now()
);

-- 사용자별 이벤트 조회 인덱스
create index idx_coach_events_user_id on coach_events(user_id);

-- 날짜 범위 조회용 인덱스
create index idx_coach_events_created_at on coach_events(created_at);

-- RLS 활성화
alter table coach_events enable row level security;

-- 본인 데이터만 조회/삽입 가능
create policy "Users can view own coach events"
  on coach_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own coach events"
  on coach_events for insert
  with check (auth.uid() = user_id);