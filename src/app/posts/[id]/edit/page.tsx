import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { parsePostId } from "@/lib/posts";
import { updatePost } from "@/app/posts/actions";
import PostForm from "@/app/posts/PostForm";

export const metadata = { title: "판매글 고치기 · 고구마마켓" };

/* ── U: 판매글 고치기 화면 ── */
export default function EditPostPage({ params }: PageProps<"/posts/[id]/edit">) {
  return (
    <BookCard chapter="第 四 章" title="판매글 고치기" subtitle="내놓은 물건 이야기를 다듬어 보세요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">원고를 꺼내는 중…</p>}>
        {params.then(({ id }) => (
          <EditPostForm rawId={id} />
        ))}
      </Suspense>
    </BookCard>
  );
}

async function EditPostForm({ rawId }: { rawId: string }) {
  const id = parsePostId(rawId);
  if (id === null) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${id}/edit`);

  const { data: post } = await supabase
    .from("goguma_posts")
    .select("id, seller_id, title, price, description, status, image_paths, category")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();
  // 남의 글 수정 화면에는 들어오지 못하게 글 보기로 돌려보낸다
  if (post.seller_id !== user.id) redirect(`/posts/${id}`);

  return (
    <PostForm
      action={updatePost.bind(null, id)}
      userId={user.id}
      defaults={{
        title: post.title,
        price: String(post.price),
        description: post.description,
        status: post.status,
        image_paths: (post.image_paths as string[]).join("\n"),
        category: post.category,
      }}
      showStatus
      submitLabel="고친 내용 저장"
      cancelHref={`/posts/${id}`}
    />
  );
}
