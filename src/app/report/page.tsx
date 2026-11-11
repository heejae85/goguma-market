import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/posts";
import ReportForm from "./ReportForm";

export const metadata = { title: "신고하기 · 고구마마켓" };

/* ── 신고: /report?post=글번호 또는 /report?user=회원id ── */
export default function ReportPage({ searchParams }: PageProps<"/report">) {
  return (
    <BookCard chapter="告 發" title="신고하기" subtitle="장터를 깨끗하게 지키는 데 힘을 보태 주세요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">장부를 펼치는 중…</p>}>
        <Report searchParams={searchParams} />
      </Suspense>
    </BookCard>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/report">["searchParams"] }) {
  const params = await searchParams;
  const postRaw = typeof params.post === "string" ? params.post : "";
  const userRaw = typeof params.user === "string" ? params.user : "";
  const postId = /^\d{1,15}$/.test(postRaw) ? Number(postRaw) : null;
  const userId = isUuid(userRaw) ? userRaw : null;
  if (!postId && !userId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/report?${postId ? `post=${postId}` : `user=${userId}`}`);

  // 무엇을 신고하는지 보여주기 (없는 대상이면 404)
  let target = "";
  if (postId) {
    const { data } = await supabase.from("goguma_posts").select("title").eq("id", postId).maybeSingle();
    if (!data) notFound();
    target = `글 〈${data.title}〉`;
  } else if (userId) {
    const { data } = await supabase.from("goguma_profiles").select("nickname").eq("id", userId).maybeSingle();
    if (!data) notFound();
    target = `이웃 「${data.nickname}」`;
  }

  return (
    <>
      <p className="text-center text-sm text-ink-soft mb-6">신고 대상: {target}</p>
      <ReportForm postId={postId} userId={userId} backHref={postId ? `/posts/${postId}` : `/users/${userId}`} />
    </>
  );
}
