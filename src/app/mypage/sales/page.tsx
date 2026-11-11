import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import PostCard from "@/components/PostCard";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, STATUS_LABEL, type Post, type PostStatus } from "@/lib/posts";

export const metadata = { title: "판매 내역 · 고구마마켓" };

const TABS: PostStatus[] = ["selling", "reserved", "sold"];

/* ── 내 판매 내역: 판매중 / 예약중 / 거래완료 탭 ── */
// /mypage 아래라서 proxy.ts가 로그인을 확인한다
export default function SalesPage({ searchParams }: PageProps<"/mypage/sales">) {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">附 錄 · 一</p>
        <h1 className="font-title text-3xl font-extrabold mt-2">나의 판매 장부</h1>
        <p className="text-sm text-ink-soft italic mt-2">내가 장터에 내놓은 물건들</p>
      </div>
      <Suspense fallback={<p className="text-center text-ink-soft italic">장부를 펼치는 중…</p>}>
        <Sales searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Sales({ searchParams }: { searchParams: PageProps<"/mypage/sales">["searchParams"] }) {
  const params = await searchParams;
  const tab: PostStatus = TABS.includes(params.tab as PostStatus) ? (params.tab as PostStatus) : "selling";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/sales");

  // 탭별 개수(제목 옆 숫자)와 현재 탭의 글을 함께 불러온다
  const [{ data: all }, { data }] = await Promise.all([
    supabase.from("goguma_posts").select("status").eq("seller_id", user.id),
    supabase
      .from("goguma_posts")
      .select(POST_SELECT)
      .eq("seller_id", user.id)
      .eq("status", tab)
      .order("bumped_at", { ascending: false }),
  ]);
  const counts = Object.fromEntries(TABS.map((t) => [t, (all ?? []).filter((p) => p.status === t).length]));
  const posts = (data ?? []) as unknown as Post[];

  return (
    <>
      <nav className="flex justify-center gap-2" aria-label="판매 상태">
        {TABS.map((t) => (
          <Link
            key={t}
            href={t === "selling" ? "/mypage/sales" : `/mypage/sales?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`px-4 py-1.5 border text-sm ${
              t === tab ? "bg-goguma text-page border-goguma-deep" : "border-line hover:border-goguma"
            }`}
          >
            {STATUS_LABEL[t]} {counts[t]}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-ink-soft italic">{STATUS_LABEL[tab]}인 물건이 없어요.</p>
          {tab === "selling" && (
            <Link href="/posts/new" className="stamp-btn inline-block px-5 py-2">
              ✎ 판매글 쓰기
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} showSeller={false} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-center text-xs text-ink-soft">
        거래 상태는 각 글의 “고치기”에서 바꿀 수 있어요.
      </p>
    </>
  );
}
