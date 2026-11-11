import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, formatDate, formatPrice, parsePostId, type Post } from "@/lib/posts";
import { deletePost } from "@/app/posts/actions";
import DeletePostButton from "./DeletePostButton";
import PhotoGallery from "./PhotoGallery";

export const metadata = { title: "장터 물건 · 고구마마켓" };

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
  const [{ data }, { data: auth }] = await Promise.all([
    supabase.from("goguma_posts").select(POST_SELECT).eq("id", id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!data) notFound();

  const post = data as unknown as Post;
  // 수정/삭제 버튼은 작성자에게만 보여준다 (실제 권한 확인은 서버 액션 + RLS가 담당)
  const isOwner = auth.user?.id === post.seller_id;
  const edited = post.updated_at !== post.created_at;

  return (
    <article>
      <h1 className="font-title text-3xl font-extrabold text-center mt-2 break-all">{post.title}</h1>
      <div className="flex items-center justify-center gap-3 mt-4">
        <StatusBadge status={post.status} />
        <span className="text-xl font-bold text-goguma">{formatPrice(post.price)}</span>
      </div>

      <PhotoGallery paths={post.image_paths} title={post.title} />

      <div className="ornament my-6">❦</div>

      <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-ink-soft">
        <div>
          <dt className="inline">판매자 </dt>
          <dd className="inline font-bold text-ink">{post.seller?.nickname ?? "이름 모를 이웃"}</dd>
        </div>
        {post.seller?.region && (
          <div>
            <dt className="inline">동네 </dt>
            <dd className="inline text-ink">{post.seller.region}</dd>
          </div>
        )}
        <div>
          <dt className="inline">올린 날 </dt>
          <dd className="inline text-ink">
            {formatDate(post.created_at)}
            {edited && " (고침)"}
          </dd>
        </div>
      </dl>

      {/* whitespace-pre-wrap: 사용자가 넣은 줄바꿈을 그대로 보여준다.
          React는 문자열을 자동으로 이스케이프하므로 HTML이 섞여 있어도 안전하다 */}
      <p className="whitespace-pre-wrap break-words leading-loose text-ink mt-8">{post.description}</p>

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
        </>
      )}
    </article>
  );
}
