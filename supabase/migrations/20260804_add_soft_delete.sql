-- 삭제 표시(soft delete) 도입
--
-- 왜: pull은 서버 목록을 진실로 보고 로컬을 맞춘다. 행을 진짜로 지우면
-- "목록에 없음"이 삭제인지 응답이 낡은 건지 구분할 수 없고, 무엇보다
-- 사라진 행과는 최신 여부를 비교할 수가 없다.
-- 삭제를 deleted_at을 채우는 수정으로 바꾸면 삭제도 updated_at을 갖게 되어,
-- 낡은 응답이 새 삭제를 덮어쓰지 못한다.

ALTER TABLE habits ADD COLUMN deleted_at TIMESTAMPTZ;

-- habit_logs에는 updated_at이 없었다. 최신 여부 비교에 필요하므로 함께 추가한다.
ALTER TABLE habit_logs ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE habit_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

CREATE TRIGGER habit_logs_updated_at BEFORE UPDATE ON habit_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 기존 UNIQUE (habit_id, completed_at)는 삭제 표시된 행까지 자리를 차지해
-- "오늘 체크 해제 후 다시 체크"를 막는다. 살아 있는 행에만 적용되도록 바꾼다.
ALTER TABLE habit_logs DROP CONSTRAINT habit_logs_habit_id_completed_at_key;

CREATE UNIQUE INDEX habit_logs_active_unique
  ON habit_logs(habit_id, completed_at)
  WHERE deleted_at IS NULL;

-- 습관을 삭제 표시하면 자식 로그도 함께 표시한다.
-- 기존에는 진짜 DELETE의 FK 연쇄 삭제가 해주던 일인데, 이제 DELETE가 일어나지
-- 않으므로 트리거로 대신한다. 클라이언트가 로그마다 요청을 보내지 않아도 된다.
CREATE OR REPLACE FUNCTION cascade_habit_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE habit_logs
      SET deleted_at = NEW.deleted_at
      WHERE habit_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER habits_cascade_soft_delete AFTER UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION cascade_habit_soft_delete();

-- 삭제가 UPDATE로 바뀌므로 habit_logs에 UPDATE 정책이 필요하다.
-- (habits에는 이미 있다.)
CREATE POLICY "Users can update own habit_logs" ON habit_logs FOR UPDATE
  USING (habit_id IN (SELECT id FROM habits WHERE user_id = auth.uid()));

-- 살아 있는 행만 조회하는 질의를 위한 인덱스
CREATE INDEX idx_habits_active ON habits(user_id) WHERE deleted_at IS NULL;
