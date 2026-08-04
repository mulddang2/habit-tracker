/**
 * 삭제 표시(soft delete) 공통 규칙.
 *
 * 행을 진짜로 지우는 대신 deleted_at을 채운다. 그래야 삭제도 updated_at을
 * 가진 하나의 수정이 되고, "서버 응답과 로컬 중 어느 쪽이 최신인가"를
 * 삭제·수정·생성에 똑같이 적용할 수 있다.
 */

export interface Versioned {
  updated_at?: string | null;
  deleted_at?: string | null;
}

/**
 * 화면에 보여줄 행인지.
 * 삭제 표시 도입 전에 저장된 로컬 행에는 deleted_at 자체가 없으므로,
 * 값이 없는 경우도 살아 있는 것으로 본다.
 */
export function isAlive(row: Versioned): boolean {
  return !row.deleted_at;
}

/**
 * 시각 문자열을 비교 가능한 수로. 없거나 깨진 값은 "아주 오래됨"으로 본다.
 *
 * 문자열끼리 직접 비교하면 안 된다. 서버(Postgres)는 `+00:00`에 마이크로초,
 * 클라이언트(`toISOString`)는 `Z`에 밀리초라 표기가 달라 사전순 비교가 틀린다.
 */
function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 서버 행으로 로컬 행을 덮어써야 하는지.
 *
 * 로컬에 없으면 받아들이고, 있으면 서버가 더 최신일 때만 덮어쓴다.
 * 이 판단이 낡은 응답으로부터 아직 못 보낸 로컬 변경을 지켜준다 —
 * 특히 방금 한 삭제를, 그 삭제를 아직 모르는 서버 응답이 되살리지 못하게 한다.
 */
export function serverWins(server: Versioned, local: Versioned | undefined) {
  if (!local) return true;
  return timeOf(server.updated_at) > timeOf(local.updated_at);
}
