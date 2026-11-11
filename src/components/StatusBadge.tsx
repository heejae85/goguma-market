import { STATUS_LABEL, type PostStatus } from "@/lib/posts";

// 거래 상태 도장: 판매중은 세피아, 예약중은 고구마색, 거래완료는 흐린 먹색 (기존 색 토큰만 사용)
export default function StatusBadge({ status }: { status: PostStatus }) {
  const style =
    status === "selling"
      ? "border-sepia text-sepia"
      : status === "reserved"
        ? "border-goguma text-goguma"
        : "border-ink-soft text-ink-soft";
  return (
    <span className={`border px-2 py-0.5 text-xs tracking-widest ${style}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
