// 날짜·시간을 항상 "한국 시간(KST)"으로 보여주는 도우미
//
// 왜 필요한가: toLocaleString 같은 함수는 "코드가 실행되는 컴퓨터의 시간대"를 쓴다.
// - Vercel 서버는 UTC(협정 세계시) → 서버에서 그린 시간은 한국보다 9시간 늦게 보인다
// - 사용자 브라우저는 그 사람 컴퓨터 시간대
// 그래서 timeZone: "Asia/Seoul"을 직접 적어서, 어디서 실행되든 같은 한국 시간이 나오게 한다.
// (서버·브라우저 결과가 같아야 하이드레이션 불일치도 생기지 않는다)

const TZ = "Asia/Seoul";

// Intl.DateTimeFormat은 만들 때 비용이 있어서 한 번만 만들어 재사용한다
const fullDate = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, year: "numeric", month: "long", day: "numeric" });
const monthDay = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "long", day: "numeric" });
const time = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
// 같은 날인지 비교용 (예: "2026-11-11")
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// 예: 2026년 11월 11일
export function formatKstDate(iso: string): string {
  return fullDate.format(new Date(iso));
}

// 채팅용 짧은 표시: 오늘이면 "오후 3:12", 아니면 "11월 9일" (오늘인지도 한국 날짜로 판단)
export function formatKstChatTime(iso: string): string {
  const d = new Date(iso);
  return dayKey.format(d) === dayKey.format(new Date()) ? time.format(d) : monthDay.format(d);
}
