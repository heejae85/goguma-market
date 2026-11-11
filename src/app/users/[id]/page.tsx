import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import ChatButton from "@/components/ChatButton";
import { startChat } from "@/app/chats/actions";
import { setBlock } from "@/app/trust/actions";
import { RATING_LABEL, kindnessScore, kindnessWord, type Rating } from "@/lib/trust";
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
  const [{ data: profile }, { data: postRows }, { data: auth }, { data: reviewRows }] = await Promise.all([
    supabase
      .from("goguma_profiles")
      .select("id, nickname, region, bio, avatar_path, created_at")
      .eq("id", rawId)
      .maybeSingle(),
    supabase
      .from("goguma_posts")
      .select(POST_SELECT)
      .eq("seller_id", rawId)
      .order("bumped_at", { ascending: false }),
    supabase.auth.getUser(),
    // 이 사람이 받은 거래 후기 (인심 지수 계산 + 최근 후기 보여주기)
    supabase
      .from("goguma_reviews")
      .select(
        "id, rating, body, created_at, reviewer_id, post_id, reviewer:goguma_profiles!goguma_reviews_reviewer_id_fkey(nickname, avatar_path), post:goguma_posts(title, seller_id)",
      )
      .eq("reviewee_id", rawId)
      .order("created_at", { ascending: false }),
  ]);
  if (!profile) notFound();

  const posts = (postRows ?? []) as unknown as Post[];
  const isMe = auth.user?.id === profile.id;
  const reviews = (reviewRows ?? []) as unknown as {
    id: number;
    rating: Rating;
    body: string;
    created_at: string;
    reviewer_id: string;
    reviewer: { nickname: string; avatar_path: string | null } | null;
    post: { title: string; seller_id: string } | null;
  }[];
  const score = kindnessScore(reviews.map((r) => r.rating));

  // 로그인한 다른 사람이 보는 중이면: 내가 이 사람을 차단했는지
  let iBlocked = false;
  if (auth.user && !isMe) {
    const { count } = await supabase
      .from("goguma_blocks")
      .select("blocked_id", { count: "exact", head: true })
      .eq("blocker_id", auth.user.id)
      .eq("blocked_id", profile.id);
    iBlocked = (count ?? 0) > 0;
  }
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

        {/* 인심 지수: 받은 후기로 계산 (50.0에서 시작) */}
        <div className="mt-8 text-left">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-ink-soft tracking-wider">
              인심 지수 <span className="font-normal text-xs">· 후기 {reviews.length}개</span>
            </span>
            <span className="font-title text-2xl font-bold text-goguma">{score.toFixed(1)}</span>
          </div>
          <div className="h-2.5 mt-1 border border-line bg-paper-deep/40" aria-hidden>
            <div className="h-full bg-goguma" style={{ width: `${score}%` }} />
          </div>
          <p className="text-xs text-sepia mt-1 text-right">{kindnessWord(score)}</p>
        </div>

        <dl className="grid grid-cols-3 gap-2 mt-6 border-y border-line/70 py-4">
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
        {/* 다른 이웃이면 바로 채팅 (판매글과 상관없는 대화방) — 차단했으면 채팅 대신 안내 */}
        {!isMe && auth.user && (
          <div className="mt-6 space-y-3">
            {iBlocked ? (
              <p className="text-sm text-ink-soft">내가 차단한 이웃이에요. 이 이웃의 글과 댓글은 보이지 않아요.</p>
            ) : (
              <ChatButton action={startChat.bind(null, profile.id, null)} label={`${profile.nickname} 님과 채팅하기`} />
            )}
            <div className="flex justify-center gap-4 text-xs">
              <form action={setBlock.bind(null, profile.id, !iBlocked)}>
                <button type="submit" className="text-ink-soft underline underline-offset-2 hover:text-goguma">
                  {iBlocked ? "차단 풀기" : "차단하기"}
                </button>
              </form>
              <Link
                href={`/report?user=${profile.id}`}
                className="text-ink-soft underline underline-offset-2 hover:text-goguma"
              >
                신고하기
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 받은 거래 후기 */}
      <div id="reviews" className="max-w-2xl mx-auto scroll-mt-6">
        <h2 className="font-title text-2xl font-bold text-center">받은 거래 후기</h2>
        <div className="ornament max-w-xs mx-auto my-4">✦</div>
        {reviews.length === 0 ? (
          <p className="text-center text-ink-soft italic py-2">아직 받은 후기가 없어요.</p>
        ) : (
          <ul className="book-page px-6 sm:px-10 py-4 divide-y divide-line/60">
            {reviews.slice(0, 20).map((r) => {
              const name = r.reviewer?.nickname ?? "이름 모를 이웃";
              // 후기를 쓴 사람이 그 글의 판매자면 → 이 사람은 구매자였다
              const role = r.post?.seller_id === r.reviewer_id ? "판매자" : "구매자";
              return (
                <li key={r.id} className="flex gap-3 py-4">
                  <Link href={`/users/${r.reviewer_id}`}>
                    <Avatar path={r.reviewer?.avatar_path} nickname={name} size={36} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Link href={`/users/${r.reviewer_id}`} className="font-bold hover:text-goguma">
                        {name}
                      </Link>
                      <span className="text-[10px] border border-sepia text-sepia px-1">{role}</span>
                      <span className="ml-auto text-xs text-ink-soft">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className={r.rating === 1 ? "text-ink-soft" : "text-goguma font-bold"}>
                        {RATING_LABEL[r.rating]}
                      </span>
                      {r.post && <span className="text-xs text-ink-soft"> · 〈{r.post.title}〉</span>}
                    </p>
                    {r.body && <p className="text-ink mt-1 whitespace-pre-wrap break-words">{r.body}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
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
