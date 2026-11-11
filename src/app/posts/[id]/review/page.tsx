import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { parsePostId } from "@/lib/posts";
import { RATING_LABEL, type Rating } from "@/lib/trust";
import { createReview } from "@/app/trust/actions";
import ReviewForm from "./ReviewForm";

export const metadata = { title: "거래 후기 · 고구마마켓" };

/* ── 거래 후기 쓰기 (판매자 ↔ 구매자) ── */
export default function ReviewPage({ params }: PageProps<"/posts/[id]/review">) {
  return (
    <BookCard chapter="去 來 後 記" title="거래 후기" subtitle="이웃의 인심을 장부에 남겨 주세요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">붓을 고르는 중…</p>}>
        {params.then(({ id }) => (
          <Review rawId={id} />
        ))}
      </Suspense>
    </BookCard>
  );
}

async function Review({ rawId }: { rawId: string }) {
  const id = parsePostId(rawId);
  if (id === null) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${id}/review`);

  const { data: post } = await supabase
    .from("goguma_posts")
    .select(
      "id, title, status, seller_id, buyer_id, seller:goguma_profiles!goguma_posts_seller_id_fkey(nickname), buyer:goguma_profiles!goguma_posts_buyer_id_fkey(nickname)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const p = post as unknown as {
    title: string;
    status: string;
    seller_id: string;
    buyer_id: string | null;
    seller: { nickname: string } | null;
    buyer: { nickname: string } | null;
  };
  const iAmSeller = p.seller_id === user.id;
  const iAmBuyer = p.buyer_id === user.id;
  if (p.status !== "sold" || !p.buyer_id || (!iAmSeller && !iAmBuyer)) redirect(`/posts/${id}`);

  const partnerName = (iAmSeller ? p.buyer?.nickname : p.seller?.nickname) ?? "이웃";
  const partnerId = iAmSeller ? p.buyer_id : p.seller_id;

  // 이미 남긴 후기가 있으면 보여주기만
  const { data: mine } = await supabase
    .from("goguma_reviews")
    .select("rating, body")
    .eq("post_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  return (
    <>
      <p className="text-center text-sm text-ink-soft mb-6">
        〈{p.title}〉 · {iAmSeller ? "구매자" : "판매자"} {partnerName}
      </p>
      {mine ? (
        <div className="text-center space-y-4">
          <p className="text-ink">
            이미 후기를 남겼어요: <span className="font-bold text-goguma">{RATING_LABEL[mine.rating as Rating]}</span>
          </p>
          {mine.body && <p className="italic text-ink-soft">“{mine.body}”</p>}
          <Link href={`/users/${partnerId}`} className="ghost-btn inline-block px-5 py-2">
            {partnerName} 님 프로필 보기
          </Link>
        </div>
      ) : (
        <ReviewForm action={createReview.bind(null, id)} partnerName={partnerName} />
      )}
    </>
  );
}
