import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { parsePostId } from "@/lib/posts";
import { completeSale } from "@/app/trust/actions";
import CompleteForm from "./CompleteForm";

export const metadata = { title: "거래 완료 · 고구마마켓" };

/* ── 거래완료 처리: 구매자 고르기 (판매자만) ── */
export default function CompletePage({ params }: PageProps<"/posts/[id]/complete">) {
  return (
    <BookCard chapter="去 來 完 了" title="거래를 마쳤어요" subtitle="물건을 사 간 이웃을 장부에 적어 주세요">
      <Suspense fallback={<p className="text-center text-ink-soft italic">장부를 펼치는 중…</p>}>
        {params.then(({ id }) => (
          <Complete rawId={id} />
        ))}
      </Suspense>
    </BookCard>
  );
}

async function Complete({ rawId }: { rawId: string }) {
  const id = parsePostId(rawId);
  if (id === null) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${id}/complete`);

  const { data: post } = await supabase
    .from("goguma_posts")
    .select("id, title, seller_id, status, buyer_id")
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();
  if (post.seller_id !== user.id) redirect(`/posts/${id}`);
  if (post.status === "sold" && post.buyer_id) redirect(`/posts/${id}/review`);

  // 이 글로 시작한 채팅방의 상대들 = 구매자 후보
  const { data: rooms } = await supabase
    .from("goguma_chat_rooms")
    .select(
      "user_a, user_b, a:goguma_profiles!goguma_chat_rooms_user_a_fkey(id, nickname, avatar_path), b:goguma_profiles!goguma_chat_rooms_user_b_fkey(id, nickname, avatar_path)",
    )
    .eq("post_id", id)
    .order("last_message_at", { ascending: false });

  type P = { id: string; nickname: string; avatar_path: string | null };
  const partners = ((rooms ?? []) as unknown as { user_a: string; a: P | null; b: P | null }[])
    .map((r) => (r.user_a === user.id ? r.b : r.a))
    .filter((p): p is P => !!p);

  return (
    <>
      <p className="text-center text-sm text-ink-soft mb-6">〈{post.title}〉</p>
      {partners.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-ink leading-relaxed">
            이 물건으로 채팅한 이웃이 없어서 구매자를 정할 수 없어요.
            <br />
            구매자와 채팅으로 약속을 잡은 뒤에 거래완료를 눌러 주세요.
          </p>
          <p className="text-xs text-ink-soft">
            (구매자 없이 상태만 바꾸려면 “고치기”에서 거래 상태를 거래완료로 바꾸면 돼요. 이때는 후기를 남길 수 없어요.)
          </p>
          <Link href={`/posts/${id}`} className="ghost-btn inline-block px-5 py-2">
            글로 돌아가기
          </Link>
        </div>
      ) : (
        <CompleteForm action={completeSale.bind(null, id)} partners={partners} />
      )}
    </>
  );
}
