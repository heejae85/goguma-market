import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/posts";
import { setBlock } from "@/app/trust/actions";

export const metadata = { title: "차단한 이웃 · 고구마마켓" };

/* ── 내가 차단한 이웃 목록 + 차단 풀기 ── */
export default function BlocksPage() {
  return (
    <BookCard chapter="附 錄 · 三" title="차단한 이웃" subtitle="이 이웃들의 글·댓글은 보이지 않고, 서로 편지할 수 없어요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">명부를 펼치는 중…</p>}>
        <Blocks />
      </Suspense>
    </BookCard>
  );
}

async function Blocks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/blocks");

  const { data } = await supabase
    .from("goguma_blocks")
    .select("blocked_id, created_at, blocked:goguma_profiles!goguma_blocks_blocked_id_fkey(nickname, avatar_path)")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    blocked_id: string;
    created_at: string;
    blocked: { nickname: string; avatar_path: string | null } | null;
  }[];

  if (rows.length === 0) {
    return <p className="text-center text-ink-soft italic">차단한 이웃이 없어요.</p>;
  }

  return (
    <ul className="divide-y divide-line/60">
      {rows.map((r) => {
        const name = r.blocked?.nickname ?? "이름 모를 이웃";
        return (
          <li key={r.blocked_id} className="flex items-center gap-3 py-3">
            <Avatar path={r.blocked?.avatar_path} nickname={name} size={36} />
            <Link href={`/users/${r.blocked_id}`} className="flex-1 min-w-0">
              <span className="block font-bold truncate">{name}</span>
              <span className="block text-xs text-ink-soft">{formatDate(r.created_at)} 차단</span>
            </Link>
            <form action={setBlock.bind(null, r.blocked_id, false)}>
              <button type="submit" className="ghost-btn px-3 py-1.5 text-sm">
                차단 풀기
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
