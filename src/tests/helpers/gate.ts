/**
 * 경합(race) 테스트용 게이트.
 *
 * 타이밍이나 마이크로태스크 개수에 기대지 않는다.
 * - `arrival` : 코드가 이 비동기 지점에 *도달*하면 resolve → 응답 대기 중임을 확신하고 개입한다.
 * - `open()`  : 테스트가 원하는 시점에 응답을 흘려보낸다.
 */
export function makeGate<T>(value: T) {
  let open!: () => void;
  let arrive!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  const arrival = new Promise<void>((r) => (arrive = r));
  return {
    arrival,
    open,
    call: () => {
      arrive();
      return opened.then(() => value);
    },
  };
}
