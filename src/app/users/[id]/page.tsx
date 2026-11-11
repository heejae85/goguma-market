import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, countOf, formatDate, isUuid, type Post } from "@/lib/posts";

export const metadata = { title: "이웃 프로필 · 고구마마켓" };

/* ── 작성자 프로필 + 글 모아보기 ── */
// 누구나 볼 수 있는 공개 페이지 (프로필·판매글 모두 공개 조회 정책)
export default function UserProfilePage({ params }: PageProps<"/users/[id]">) {
  return (
    <section className="space-y-10">
      <Suspense fallback={<p className="text-center text-ink-soft italic">이웃의 기록을 펼치는 중…</p>}>
        {params.then(({ id }) => (
          <Profile rawId={id} />
        ))}
      </Suspense>
    </section>
  );
}

async function Profile({ rawId }: { rawId: string }) {
  if (!isUuid(rawId)) notFound();

  const supabase = await createClient();
  const [{ data: profile }, { data: postRows }, { data: auth }] = await Promise.all([
    supabase
      .from("goguma_profiles")
      .select("id, nickname, region, bio, avatar_path, created_at")
      .eq("id", rawId)
      .maybeSingle(),
    supabase
      .from("goguma_posts")
      .select(POST_SELECT)
      .eq("seller_id", rawId)
      .order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  if (!profile) notFound();

  const posts = (postRows ?? []) as unknown as Post[];
  const isMe = auth.user?.id === profile.id;
  const selling = posts.filter((p) => p.status !== "sold").length;
  const likesReceived = posts.reduce((sum, p) => sum + countOf(p.likes), 0);

  return (
    <>
      {/* 프로필 머리: 책의 저자 소개 면처럼 */}
      <div className="book-page max-w-2xl mx-auto px-8 sm:px-14 py-12 text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">著 者 紹 介</p>
        <div className="mt-6 flex justify-center">
          <Avatar path={profile.avatar_path} nickname={profile.nickname} size={112} />
        </div>
        <h1 className="font-title text-3xl font-extrabold mt-4">{profile.nickname}</h1>
        <p className="text-sm text-ink-soft mt-1">
          {profile.region || "동네 미정"} · {formatDate(profile.created_at)} 명부 등재
        </p>

        <div className="ornament my-6">❦</div>

        {profile.bio ? (
          <p className="whitespace-pre-wrap break-words leading-loose text-ink italic">“{profile.bio}”</p>
        ) : (
          <p className="text-ink-soft italic text-sm">아직 자기소개가 없어요.</p>
        )}

        <dl className="grid grid-cols-3 gap-2 mt-8 border-y border-line/70 py-4">
          {[
            ["내놓은 물건", posts.length],
            ["거래 중", selling],
            ["받은 좋아요", likesReceived],
          ].map(([k, v]) => (
            <div key={k}>
              <dd className="font-title text-2xl font-bold text-goguma">{v}</dd>
              <dt className="text-xs text-ink-soft tracking-wider mt-1">{k}</dt>
            </div>
          ))}
        </dl>

        {isMe && (
          <Link href="/mypage/profile" className="ghost-btn inline-block px-6 py-2 mt-6 text-sm">
            프로필 고치기
          </Link>
        )}
      </div>

      {/* 글 모아보기 */}
      <div>
        <h2 className="font-title text-2xl font-bold text-center">
          {profile.nickname} 님의 좌판
        </h2>
        <div className="ornament max-w-xs mx-auto my-4">✦</div>
        {posts.length === 0 ? (
          <p className="text-center text-ink-soft italic py-6">아직 내놓은 물건이 없어요.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id}>
                {/* 같은 판매자의 글만 모여 있으니 카드에 판매자 이름은 빼고 보여준다 */}
                <PostCard post={post} showSeller={false} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
