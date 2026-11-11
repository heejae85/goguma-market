import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORY_LABEL,
  POST_SELECT,
  countOf,
  formatDate,
  formatPrice,
  parsePostId,
  type Post,
} from "@/lib/posts";
import { bumpPost, deletePost } from "@/app/posts/actions";
import { after } from "next/server";
import BumpButton from "./BumpButton";
import DeletePostButton from "./DeletePostButton";
import PhotoGallery from "./PhotoGallery";
import LikeButton from "./LikeButton";
import CommentForm from "./CommentForm";
import DeleteCommentButton from "./DeleteCommentButton";
import { addComment, deleteComment } from "./interactions";
import ChatButton from "@/components/ChatButton";
import { startChat } from "@/app/chats/actions";

export const metadata = { title: "장터 물건 · 고구마마켓" };

type Comment = {
  id: number;
  body: string;
  created_at: string;
  author_id: string;
  author: { nickname: string; avatar_path: string | null } | null;
};

/* ── R: 판매글 하나 보기 ── */
// Cache Components에서는 params도 요청 시점 데이터라(generateStaticParams가 없으므로)
// Suspense 안에서 꺼내 써야 한다. page에서 await하지 않고 Promise 그대로 넘긴다.
export default function PostDetailPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <section className="book-page max-w-2xl mx-auto px-8 sm:px-14 py-12">
      <p className="text-center text-xs tracking-[0.4em] text-sepia">第 三 章 · 장터 물건</p>
      <Suspense fallback={<p className="text-center text-ink-soft italic mt-8">책장을 넘기는 중…</p>}>
        {params.then(({ id }) => (
          <PostDetail rawId={id} />
        ))}
      </Suspense>
      <div className="text-center mt-10">
        <Link href="/posts" className="text-sm text-sepia underline underline-offset-4">
          ← 장터 목록으로
        </Link>
      </div>
    </section>
  );
}

async function PostDetail({ rawId }: { rawId: string }) {
  const id = parsePostId(rawId);
  if (id === null) notFound();

  const supabase = await createClient();
  // 글, 로그인 정보, 댓글을 동시에 불러온다
  const [{ data }, { data: auth }, { data: commentRows }] = await Promise.all([
    supabase.from("goguma_posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from("goguma_comments")
      .select("id, body, created_at, author_id, author:goguma_profiles(nickname, avatar_path)")
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!data) notFound();

  // 조회수 +1: after()로 응답을 보낸 "뒤에" 실행 → 화면이 조회수 올리기를 기다리지 않는다
  after(async () => {
    await supabase.rpc("goguma_increment_view", { p_post_id: id });
  });

  const post = data as unknown as Post;
  const me = auth.user;

  // 로그인했으면: 좋아요 여부, 내가 차단한 사람들, (거래완료 글이면) 내가 남긴 후기 여부
  let liked = false;
  let blockedIds = new Set<string>();
  let reviewedByMe = false;
  if (me) {
    const [{ count }, { data: blocks }, { count: reviewCount }] = await Promise.all([
      supabase
        .from("goguma_post_likes")
        .select("post_id", { count: "exact", head: true })
        .eq("post_id", id)
        .eq("user_id", me.id),
      supabase.from("goguma_blocks").select("blocked_id").eq("blocker_id", me.id),
      supabase
        .from("goguma_reviews")
        .select("id", { count: "exact", head: true })
        .eq("post_id", id)
        .eq("reviewer_id", me.id),
    ]);
    liked = (count ?? 0) > 0;
    blockedIds = new Set((blocks ?? []).map((b) => b.blocked_id));
    reviewedByMe = (reviewCount ?? 0) > 0;
  }
  // 내가 차단한 이웃의 댓글은 보이지 않게
  const comments = ((commentRows ?? []) as unknown as Comment[]).filter((c) => !blockedIds.has(c.author_id));
  const sellerBlocked = blockedIds.has(post.seller_id);
  // 거래 당사자(판매자·구매자)이고 아직 후기를 안 남겼으면 후기 버튼
  const iAmBuyer = !!me && post.buyer_id === me.id;
  const canReview = post.status === "sold" && !!post.buyer_id && !reviewedByMe && (iAmBuyer || me?.id === post.seller_id);

  // 수정/삭제 버튼은 작성자에게만 보여준다 (실제 권한 확인은 서버 액션 + RLS가 담당)
  const isOwner = me?.id === post.seller_id;
  const edited = post.updated_at !== post.created_at;
  const sellerName = post.seller?.nickname ?? "이름 모를 이웃";

  return (
    <article>
      <p className="text-center mt-3">
        <Link
          href={`/posts?cat=${post.category}`}
          className="text-xs text-sepia tracking-wider underline-offset-2 hover:underline"
        >
          {CATEGORY_LABEL[post.category] ?? "기타"}
        </Link>
      </p>
      <h1 className="font-title text-3xl font-extrabold text-center mt-1 break-all">{post.title}</h1>
      <div className="flex items-center justify-center gap-3 mt-4">
        <StatusBadge status={post.status} />
        <span className="text-xl font-bold text-goguma">{formatPrice(post.price)}</span>
      </div>

      <PhotoGallery paths={post.image_paths} title={post.title} />

      <div className="ornament my-6">❦</div>

      {/* 판매자: 누르면 프로필(글 모아보기)로 */}
      <Link
        href={`/users/${post.seller_id}`}
        className="flex items-center justify-center gap-3 group"
      >
        <Avatar path={post.seller?.avatar_path} nickname={sellerName} size={44} />
        <span className="text-left">
          <span className="block font-bold text-ink group-hover:text-goguma">{sellerName}</span>
          <span className="block text-xs text-ink-soft">
            {post.seller?.region && `${post.seller.region} · `}
            {formatDate(post.created_at)}
            {edited && " (고침)"}
            {/* 지금 보는 것까지 더해서 보여준다 (+1은 응답 뒤에 DB에 반영) */}
            {` · 조회 ${post.view_count + 1}`}
          </span>
        </span>
      </Link>

      {/* whitespace-pre-wrap: 사용자가 넣은 줄바꿈을 그대로 보여준다.
          React는 문자열을 자동으로 이스케이프하므로 HTML이 섞여 있어도 안전하다 */}
      <p className="whitespace-pre-wrap break-words leading-loose text-ink mt-8">{post.description}</p>

      <div className="flex flex-wrap items-start justify-center gap-3 mt-8">
        <LikeButton
          postId={post.id}
          initialLiked={liked}
          initialCount={countOf(post.likes)}
          loggedIn={!!me}
        />
        {/* 구매자 → 판매자 채팅 (내 글에는 안 보임, 로그인 안 했으면 로그인으로, 차단한 사람이면 숨김) */}
        {!isOwner &&
          !sellerBlocked &&
          (me ? (
            <ChatButton
              action={startChat.bind(null, post.seller_id, post.id)}
              label="판매자와 채팅하기"
            />
          ) : (
            <Link href={`/login?next=/posts/${post.id}`} className="stamp-btn px-4 py-2">
              ✉ 판매자와 채팅하기
            </Link>
          ))}
      </div>

      {sellerBlocked && (
        <p className="text-center text-sm text-ink-soft mt-4">
          내가 차단한 이웃의 글이에요. 채팅할 수 없어요.
        </p>
      )}

      {/* 거래완료 + 구매자가 정해진 글: 거래 당사자에게 후기 안내 */}
      {canReview && (
        <div className="mt-6 text-center border border-goguma/40 bg-goguma/5 px-4 py-4">
          <p className="text-sm text-ink">거래가 끝났어요. {iAmBuyer ? "판매자" : "구매자"}에게 후기를 남겨 주세요.</p>
          <Link href={`/posts/${post.id}/review`} className="stamp-btn inline-block px-5 py-2 mt-3 text-sm">
            ✎ 거래 후기 남기기
          </Link>
        </div>
      )}

      {/* 신고: 로그인한 다른 사람에게만 */}
      {me && !isOwner && (
        <p className="text-right mt-6">
          <Link href={`/report?post=${post.id}`} className="text-xs text-ink-soft underline underline-offset-2 hover:text-goguma">
            이 글 신고하기
          </Link>
        </p>
      )}

      {isOwner && (
        <>
          <div className="ornament my-8">✦</div>
          <div className="flex gap-3">
            <Link href={`/posts/${post.id}/edit`} className="stamp-btn flex-1 py-3 text-center">
              고치기
            </Link>
            {/* bind로 id를 미리 묶은 서버 액션을 넘긴다 */}
            <DeletePostButton action={deletePost.bind(null, post.id)} />
          </div>
          {post.status !== "sold" && (
            <div className="mt-4 flex flex-col items-center gap-3">
              {/* 거래가 끝나면: 채팅한 이웃 중 구매자를 고르고 후기로 이어진다 */}
              <Link href={`/posts/${post.id}/complete`} className="ghost-btn px-5 py-2 text-sm">
                ✔ 거래 완료하기
              </Link>
              <BumpButton action={bumpPost.bind(null, post.id)} />
            </div>
          )}
        </>
      )}

      {/* ── 댓글 ── */}
      <section className="mt-12">
        <h2 className="font-title text-xl font-bold flex items-center gap-2">
          <span className="seal text-sm">問</span> 이웃들의 댓글
          <span className="text-sm font-normal text-ink-soft">({comments.length})</span>
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-ink-soft italic mt-4">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/60 border-y border-line/60">
            {comments.map((c) => {
              const name = c.author?.nickname ?? "이름 모를 이웃";
              return (
                <li key={c.id} className="flex gap-3 py-4">
                  <Link href={`/users/${c.author_id}`}>
                    <Avatar path={c.author?.avatar_path} nickname={name} size={36} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/users/${c.author_id}`} className="font-bold hover:text-goguma">
                        {name}
                        {c.author_id === post.seller_id && (
                          <span className="ml-1.5 text-[10px] border border-sepia text-sepia px-1">판매자</span>
                        )}
                      </Link>
                      <span className="text-xs text-ink-soft shrink-0">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-ink mt-1 leading-relaxed">{c.body}</p>
                    {me?.id === c.author_id && (
                      <div className="text-right mt-1">
                        <DeleteCommentButton action={deleteComment.bind(null, c.id, post.id)} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6">
          {me ? (
            <CommentForm action={addComment.bind(null, post.id)} />
          ) : (
            <p className="text-sm text-ink-soft text-center">
              <Link
                href={`/login?next=/posts/${post.id}`}
                className="text-goguma font-bold underline underline-offset-4"
              >
                로그인
              </Link>
              하면 댓글을 남길 수 있어요.
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
