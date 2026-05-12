-- 라이브 데모 계정용 seed
--
-- 사용법:
--   psql "$SUPABASE_DB_URL" -v demo_user_id="'<USER_ID>'" -f supabase/seeds/demo-user-seed.sql
--
-- 또는 Supabase SQL Editor:
--   :demo_user_id 자리에 데모 user_id를 SQL 문자열로 치환 (예: 'aaaaaaaa-bbbb-cccc-...')
--
-- 멱등성: 데모 user의 habits/habit_logs를 모두 제거한 뒤 재삽입한다.
--         habit_logs는 habits FK CASCADE로 같이 제거됨.

BEGIN;

-- 기존 데모 데이터 정리
DELETE FROM habits WHERE user_id = :demo_user_id;

-- habits 6개 (4 카테고리 분포)
WITH inserted_habits AS (
  INSERT INTO habits (user_id, title, category, "order", created_at, updated_at)
  VALUES
    (:demo_user_id, '물 2L 마시기',       '건강',   1, now() - interval '14 days', now()),
    (:demo_user_id, '아침 스트레칭 5분',  '운동',   2, now() - interval '14 days', now()),
    (:demo_user_id, '코딩 30분',          '공부',   3, now() - interval '14 days', now()),
    (:demo_user_id, '독서 10페이지',      '공부',   4, now() - interval '14 days', now()),
    (:demo_user_id, '저녁 산책 15분',     '운동',   5, now() - interval '14 days', now()),
    (:demo_user_id, '자기 전 일기',       '라이프', 6, now() - interval '14 days', now())
  RETURNING id, title
)
-- 최근 14일 habit_logs: title별로 다른 분포(60~95%) 생성
INSERT INTO habit_logs (habit_id, completed_at)
SELECT
  h.id,
  d::date
FROM inserted_habits h
CROSS JOIN generate_series(
  (CURRENT_DATE - interval '13 days')::date,
  CURRENT_DATE,
  interval '1 day'
) AS d
WHERE
  -- 결정론적 분포: habit title 해시 + date 해시 기반 (재현 가능)
  CASE h.title
    WHEN '물 2L 마시기'       THEN (hashtext(h.id::text || d::text) % 100) < 90  -- ~90%
    WHEN '아침 스트레칭 5분'  THEN (hashtext(h.id::text || d::text) % 100) < 70  -- ~70%
    WHEN '코딩 30분'          THEN (hashtext(h.id::text || d::text) % 100) < 80  -- ~80%
    WHEN '독서 10페이지'      THEN (hashtext(h.id::text || d::text) % 100) < 60  -- ~60%
    WHEN '저녁 산책 15분'     THEN (hashtext(h.id::text || d::text) % 100) < 65  -- ~65%
    WHEN '자기 전 일기'       THEN (hashtext(h.id::text || d::text) % 100) < 75  -- ~75%
  END;

-- 검증: 데모 user의 habits/logs 카운트 출력
SELECT
  (SELECT count(*) FROM habits WHERE user_id = :demo_user_id) AS habits_count,
  (SELECT count(*) FROM habit_logs hl
     JOIN habits h ON h.id = hl.habit_id
    WHERE h.user_id = :demo_user_id) AS logs_count;

COMMIT;
