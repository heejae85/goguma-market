import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import PostCard from "@/components/PostCard";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type Post } from "@/lib/posts";

export const metadata = { title: "관심 목록 · 고구마마켓" };

/* ── 관심 목록: 내가 좋아요(♥)를 누른 글 모아보기 ── */
export default function LikesPage() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">附 錄 · 二</p>
        <h1 className="font-title text-3xl font-extrabold mt-2">마음에 둔 물건</h1>
        <p className="text-sm text-ink-soft italic mt-2">좋아요(♥)를 누른 물건들을 모아 두었어요</p>
      </div>
      <Suspense fallback={<p className="text-center text-ink-soft italic">책갈피를 모으는 중…</p>}>
        <Likes />
      </Suspense>
    </section>
  );
}

async function Likes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/likes");

  // 좋아요 표에서 내 것만, 누른 순서(최근 먼저)대로 → 글 정보는 외래키로 join
  const { data } = await supabase
    .from("goguma_post_likes")
    .select(`created_at, post:goguma_posts(${POST_SELECT})`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const posts = (data ?? [])
    .map((row) => (row as unknown as { post: Post | null }).post)
    .filter((p): p is Post => !!p);

  if (posts.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-ink-soft italic">아직 마음에 둔 물건이 없어요. 글에서 ♡를 눌러 보세요.</p>
        <Link href="/posts" className="stamp-btn inline-block px-5 py-2">
          장터 구경하기
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
