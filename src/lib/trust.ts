// 믿을 수 있는 거래(후기·인심 지수·신고·알림)에서 함께 쓰는 값과 도우미

/* ── 거래 후기 ── */
// DB의 rating 값(1~3)과 같다
export const RATINGS = [
  [3, "최고예요", "🍠🍠🍠"],
  [2, "좋아요", "🍠🍠"],
  [1, "아쉬워요", "🍂"],
] as const;
export type Rating = 1 | 2 | 3;
export const RATING_LABEL: Record<Rating, string> = { 3: "최고예요", 2: "좋아요", 1: "아쉬워요" };
export const REVIEW_MAX = 300;

/* ── 인심 지수 ── */
// 처음엔 50.0에서 시작해서, 받은 후기에 따라 오르내린다 (0~100)
// 최고예요 +1.5 / 좋아요 +0.5 / 아쉬워요 -2.0  → 나쁜 후기는 더 크게 반영
const RATING_POINTS: Record<Rating, number> = { 3: 1.5, 2: 0.5, 1: -2 };
export const BASE_KINDNESS = 50;

export function kindnessScore(ratings: number[]): number {
  const sum = ratings.reduce((s, r) => s + (RATING_POINTS[r as Rating] ?? 0), BASE_KINDNESS);
  return Math.round(Math.min(100, Math.max(0, sum)) * 10) / 10;
}

// 점수에 따른 짧은 말 (옛 장터 말투)
export function kindnessWord(score: number): string {
  if (score >= 70) return "인심 넉넉한 이웃";
  if (score >= 55) return "믿음직한 이웃";
  if (score >= 45) return "새로 온 이웃";
  if (score >= 30) return "조금 아쉬운 이웃";
  return "조심해야 할 이웃";
}

/* ── 신고 ── (DB check 제약과 같은 값) */
export const REPORT_REASONS = [
  ["scam", "사기가 의심돼요"],
  ["prohibited", "팔면 안 되는 물건이에요"],
  ["abuse", "욕설·비하·괴롭힘이 있어요"],
  ["spam", "광고·도배예요"],
  ["etc", "기타"],
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number][0];
export const isReportReason = (v: string): v is ReportReason => REPORT_REASONS.some(([k]) => k === v);

/* ── 알림 ── */
export type NotificationType = "comment" | "like" | "review" | "sold";
export const NOTIFICATION_TEXT: Record<NotificationType, string> = {
  comment: "님이 내 글에 댓글을 남겼어요",
  like: "님이 내 물건에 좋아요를 눌렀어요",
  review: "님이 거래 후기를 남겼어요",
  sold: "님과의 거래가 완료됐어요. 후기를 남겨 주세요",
};
