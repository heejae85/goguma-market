import { Suspense } from "react";
import { redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/app/posts/actions";
import PostForm from "@/app/posts/PostForm";

export const metadata = { title: "판매글 쓰기 · 고구마마켓" };

/* ── C: 판매글 쓰기 화면 ── */
export default function NewPostPage() {
  return (
    <BookCard chapter="第 四 章" title="판매글 쓰기" subtitle="장터에 내놓을 물건을 소개해 주세요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">붓을 고르는 중…</p>}>
        <NewPostForm />
      </Suspense>
    </BookCard>
  );
}

async function NewPostForm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // proxy.ts에서도 막지만, 페이지에서 한 번 더 확인
  if (!user) redirect("/login?next=/posts/new");

  return (
    <PostForm action={createPost} userId={user.id} submitLabel="장터에 내놓기" cancelHref="/posts" />
  );
}
