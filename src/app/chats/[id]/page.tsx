import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { ROOM_SELECT, partnerOf, type ChatMessage, type ChatRoomRow } from "@/lib/chat";
import { formatPrice, imageUrl, parsePostId } from "@/lib/posts";
import ChatRoom from "./ChatRoom";

export const metadata = { title: "편지 나누기 · 고구마마켓" };

/* ── 채팅방 ── */
export default function ChatRoomPage({ params }: PageProps<"/chats/[id]">) {
  return (
    <section className="book-page max-w-2xl mx-auto px-5 sm:px-10 py-8">
      <Suspense fallback={<p className="text-center text-ink-soft italic py-10">편지를 펼치는 중…</p>}>
        {params.then(({ id }) => (
          <Room rawId={id} />
        ))}
      </Suspense>
    </section>
  );
}

async function Room({ rawId }: { rawId: string }) {
  const roomId = parsePostId(rawId); // 숫자 id 확인 (판매글 id와 같은 규칙)
  if (roomId === null) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/chats/${roomId}`);

  // RLS: 내가 들어간 방이 아니면 아무것도 안 돌아온다 → 404
  const [{ data: roomRow }, { data: messageRows }] = await Promise.all([
    supabase.from("goguma_chat_rooms").select(ROOM_SELECT).eq("id", roomId).maybeSingle(),
    supabase
      .from("goguma_chat_messages")
      .select("id, room_id, sender_id, body, created_at, read_at")
      .eq("room_id", roomId)
      .order("id", { ascending: true })
      .limit(300),
  ]);
  if (!roomRow) notFound();

  const room = roomRow as unknown as ChatRoomRow;
  const partner = partnerOf(room, user.id);
  if (!partner) notFound();
  // 둘 사이에 (어느 쪽이든) 차단이 있으면 입력칸을 막는다 (DB 정책도 메시지 보내기를 막음)
  const { data: blocked } = await supabase.rpc("goguma_blocked_with", { p_other: partner.id });
  const role = room.post ? (room.post.seller_id === user.id ? "판매" : "구매") : null;

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/chats" className="text-sepia text-sm shrink-0" aria-label="편지함으로">
          ←
        </Link>
        <Link href={`/users/${partner.id}`} className="flex items-center gap-2 min-w-0 group">
          <Avatar path={partner.avatar_path} nickname={partner.nickname} size={40} />
          <span className="min-w-0">
            <span className="block font-title text-lg font-bold truncate group-hover:text-goguma">
              {partner.nickname}
            </span>
            {role && (
              <span className="block text-xs text-ink-soft">
                {role === "구매" ? "판매자와 나누는 이야기" : "구매 희망 이웃과 나누는 이야기"}
              </span>
            )}
          </span>
        </Link>
      </div>

      {/* 어떤 물건 이야기인지 */}
      {room.post && (
        <Link
          href={`/posts/${room.post.id}`}
          className="flex items-center gap-3 mt-4 border border-line bg-paper/50 p-2 hover:bg-paper-deep/40"
        >
          <span className="relative w-12 h-12 shrink-0 border border-line bg-paper-deep/40 overflow-hidden">
            {room.post.image_paths?.[0] && (
              <Image src={imageUrl(room.post.image_paths[0])} alt="" fill sizes="48px" className="object-cover" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold truncate">{room.post.title}</span>
            <span className="block text-sm text-goguma">{formatPrice(room.post.price)}</span>
          </span>
        </Link>
      )}

      <div className="ornament my-4">✉</div>

      <ChatRoom
        roomId={room.id}
        meId={user.id}
        partner={partner}
        blocked={!!blocked}
        initialMessages={(messageRows ?? []) as ChatMessage[]}
      />
    </>
  );
}
