import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import Image from "next/image";
import { POST_SELECT, formatDate, formatPrice, imageUrl, type Post } from "@/lib/posts";

export const metadata = { title: "장터 구경 · 고구마마켓" };

/* ── R: 판매글 목록 ── */
export default function PostsPage() {
  return (
    <section className="space-y-8">
      {/* 제목 부분은 정적이라 Suspense 밖 → 빌드 때 미리 그려진다 */}
      <div className="text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">第 三 章</p>
        <h1 className="font-title text-3xl sm:text-4xl font-extrabold mt-2">장터 구경</h1>
        <p className="text-sm text-ink-soft italic mt-2">이웃들이 내놓은 물건을 둘러보세요</p>
        <div className="mt-6">
          <Link href="/posts/new" className="stamp-btn inline-block px-6 py-2.5">
            ✎ 판매글 쓰기
          </Link>
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
          <Link
            href={`/posts/${post.id}`}
            className={`book-page block h-full px-7 py-7 hover:-translate-y-0.5 transition-transform ${
              post.status === "sold" ? "opacity-60" : ""
            }`}
          >
            {/* 대표 사진(첫 장). 사진이 없으면 책 장식으로 자리를 채운다 */}
            <div className="relative aspect-[4/3] mb-4 border border-line bg-paper-deep/40 overflow-hidden">
              {post.image_paths.length > 0 ? (
                <>
                  <Image
                    src={imageUrl(post.image_paths[0])}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                    className="object-cover"
                  />
                  {post.image_paths.length > 1 && (
                    <span className="absolute right-1.5 bottom-1.5 bg-ink/70 text-page text-[11px] px-1.5">
                      ❐ {post.image_paths.length}
                    </span>
                  )}
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-3xl text-line">
                  ❦
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <StatusBadge status={post.status} />
              <span className="text-ink-soft">{formatDate(post.created_at)}</span>
            </div>
            <h2 className="font-title text-lg font-bold mt-3 line-clamp-2">{post.title}</h2>
            <p className="text-goguma font-bold mt-2">{formatPrice(post.price)}</p>
            <p className="text-xs text-ink-soft mt-3 border-t border-line/60 pt-2">
              {post.seller?.nickname ?? "이름 모를 이웃"}
              {post.seller?.region && ` · ${post.seller.region}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
