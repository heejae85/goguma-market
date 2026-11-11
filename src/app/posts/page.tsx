import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OldPainting from "@/components/OldPainting";
import PostCard from "@/components/PostCard";
import { POST_SELECT, type Post } from "@/lib/posts";

export const metadata = { title: "장터 구경 · 고구마마켓" };

/* ── R: 판매글 목록 ── */
export default function PostsPage() {
  return (
    <section className="space-y-8">
      {/* 제목 부분은 정적이라 Suspense 밖 → 빌드 때 미리 그려진다 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <OldPainting name="haengsang" className="w-36 sm:w-44 -rotate-2" sizes="176px" />
        <div className="text-center">
          <p className="text-xs tracking-[0.4em] text-sepia">第 三 章</p>
          <h1 className="font-title text-3xl sm:text-4xl font-extrabold mt-2">장터 구경</h1>
          <p className="text-sm text-ink-soft italic mt-2">
            봇짐 지고 장에 나온 이웃들의 물건을 둘러보세요
          </p>
          <div className="mt-6">
            <Link href="/posts/new" className="stamp-btn inline-block px-6 py-2.5">
              ✎ 판매글 쓰기
            </Link>
          </div>
        </div>
      </div>

      <div className="ornament max-w-md mx-auto">❦</div>

      {/* DB 조회는 요청 시점 데이터 → Suspense 안에서 */}
      <Suspense fallback={<p className="text-center text-ink-soft italic">장터 좌판을 펴는 중…</p>}>
        <PostList />
      </Suspense>
    </section>
  );
}

async function PostList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goguma_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return <p className="text-center text-goguma">장터 목록을 불러오지 못했습니다.</p>;
  }

  const posts = (data ?? []) as unknown as Post[];

  if (posts.length === 0) {
    return (
      <p className="text-center text-ink-soft italic py-10">
        아직 내놓은 물건이 없습니다. 첫 번째 판매글을 써 보세요.
      </p>
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
