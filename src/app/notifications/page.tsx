import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { formatKstChatTime } from "@/lib/time";
import { NOTIFICATION_TEXT, type NotificationType } from "@/lib/trust";

export const metadata = { title: "장터 소식 · 고구마마켓" };

/* ── 알림(소식) 목록 ── */
// 알림은 DB 트리거가 만든다: 내 글에 댓글·좋아요, 받은 후기, 구매자로 지정됨
export default function NotificationsPage() {
  return (
    <section className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">消 息</p>
        <h1 className="font-title text-3xl font-extrabold mt-2">장터 소식</h1>
        <p className="text-sm text-ink-soft italic mt-2">내 물건과 거래에 생긴 일들</p>
      </div>
      <Suspense fallback={<p className="text-center text-ink-soft italic">소식을 모으는 중…</p>}>
        <Notifications />
      </Suspense>
    </section>
  );
}

type Row = {
  id: number;
  type: NotificationType;
  post_id: number | null;
  actor_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  actor: { nickname: string; avatar_path: string | null } | null;
  post: { title: string } | null;
};

async function Notifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const { data } = await supabase
    .from("goguma_notifications")
    .select(
      "id, type, post_id, actor_id, body, read_at, created_at, actor:goguma_profiles!goguma_notifications_actor_id_fkey(nickname, avatar_path), post:goguma_posts(title)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as unknown as Row[];

  // 화면을 보낸 "뒤에" 모두 읽음 처리 → 이번 화면에서는 새 소식이 강조되어 보이고, 다음부터는 읽은 것으로
  if (rows.some((r) => !r.read_at)) {
    after(async () => {
      await supabase
        .from("goguma_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
    });
  }

  if (rows.length === 0) {
    return <p className="text-center text-ink-soft italic py-10">아직 새 소식이 없어요.</p>;
  }

  return (
    <ul className="book-page px-4 sm:px-8 py-2 divide-y divide-line/60">
      {rows.map((n) => {
        const name = n.actor?.nickname ?? "이름 모를 이웃";
        // 후기 받음 → 내 프로필의 후기로, 구매자로 지정됨 → 후기 쓰기로, 나머지 → 그 글로
        const href =
          n.type === "review"
            ? `/users/${user.id}#reviews`
            : n.type === "sold" && n.post_id
              ? `/posts/${n.post_id}/review`
              : n.post_id
                ? `/posts/${n.post_id}`
                : "/notifications";
        return (
          <li key={n.id}>
            <Link
              href={href}
              className={`flex gap-3 py-4 px-2 -mx-2 hover:bg-paper-deep/30 ${n.read_at ? "" : "bg-goguma/5"}`}
            >
              <Avatar path={n.actor?.avatar_path} nickname={name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {!n.read_at && <span className="inline-block w-2 h-2 rounded-full bg-goguma mr-1.5 align-middle" />}
                  <span className="font-bold">{name}</span>
                  {NOTIFICATION_TEXT[n.type]}
                </p>
                {n.post && <p className="text-xs text-sepia truncate mt-0.5">〈{n.post.title}〉</p>}
                {n.body && n.type !== "sold" && (
                  <p className="text-sm text-ink-soft truncate mt-0.5">“{n.body}”</p>
                )}
              </div>
              <span className="text-xs text-ink-soft shrink-0">{formatKstChatTime(n.created_at)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
