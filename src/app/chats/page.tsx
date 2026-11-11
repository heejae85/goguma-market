import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { ROOM_SELECT, formatChatTime, partnerOf, type ChatRoomRow } from "@/lib/chat";
import { imageUrl } from "@/lib/posts";
import OnlineNeighbors from "./OnlineNeighbors";

export const metadata = { title: "장터 편지함 · 고구마마켓" };

/* ── 채팅 목록 + 지금 접속 중인 이웃 ── */
export default function ChatsPage() {
  return (
    <section className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.4em] text-sepia">第 五 章</p>
        <h1 className="font-title text-3xl sm:text-4xl font-extrabold mt-2">장터 편지함</h1>
        <p className="text-sm text-ink-soft italic mt-2">이웃과 주고받은 이야기를 펼쳐 보세요</p>
      </div>

      <Suspense fallback={<p className="text-center text-ink-soft italic">편지함을 여는 중…</p>}>
        <ChatLists />
      </Suspense>
    </section>
  );
}

async function ChatLists() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/chats");

  // RLS 덕분에 "내가 들어간 방"만 돌아온다
  const [{ data: roomRows }, { data: unreadRows }] = await Promise.all([
    supabase
      .from("goguma_chat_rooms")
      .select(
        ROOM_SELECT +
          ", last:goguma_chat_messages(body, sender_id, created_at)",
      )
      // 방마다 마지막 메시지 한 개만 (join한 표 안에서 정렬·개수 제한, 별명 "last"로 가리킴)
      .order("created_at", { referencedTable: "last", ascending: false })
      .limit(1, { referencedTable: "last" })
      .order("last_message_at", { ascending: false }),
    // 안 읽은 메시지: 상대가 보냈고 read_at이 비어 있는 것
    supabase.from("goguma_chat_messages").select("room_id").is("read_at", null).neq("sender_id", user.id),
  ]);

  const rooms = (roomRows ?? []) as unknown as (ChatRoomRow & {
    last: { body: string; sender_id: string; created_at: string }[];
  })[];
  const unread = new Map<number, number>();
  for (const r of unreadRows ?? []) unread.set(r.room_id, (unread.get(r.room_id) ?? 0) + 1);

  return (
    <>
      <div className="book-page px-6 sm:px-10 py-8">
        <h2 className="font-title text-xl font-bold flex items-center gap-2">
          <span className="seal text-sm">在</span> 지금 장터에 나온 이웃
        </h2>
        <div className="mt-3">
          <OnlineNeighbors meId={user.id} />
        </div>
      </div>

      <div className="book-page px-6 sm:px-10 py-8">
        <h2 className="font-title text-xl font-bold flex items-center gap-2">
          <span className="seal text-sm">信</span> 주고받은 편지
        </h2>

        {rooms.length === 0 ? (
          <p className="text-sm text-ink-soft italic text-center py-6">
            아직 나눈 대화가 없어요. 마음에 드는 물건의 판매자에게 말을 걸어 보세요.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60">
            {rooms.map((room) => {
              const partner = partnerOf(room, user.id);
              const name = partner?.nickname ?? "이름 모를 이웃";
              const last = room.last?.[0];
              const count = unread.get(room.id) ?? 0;
              // 판매글에서 시작한 대화면, 내가 판매자인지 구매자인지 표시
              const role = room.post ? (room.post.seller_id === user.id ? "판매" : "구매") : null;
              return (
                <li key={room.id}>
                  <Link href={`/chats/${room.id}`} className="flex items-center gap-3 py-4 hover:bg-paper-deep/30 -mx-2 px-2">
                    <Avatar path={partner?.avatar_path} nickname={name} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{name}</span>
                        {role && (
                          <span className="text-[10px] border border-sepia text-sepia px-1 shrink-0">{role}</span>
                        )}
                        <span className="ml-auto text-xs text-ink-soft shrink-0">
                          {formatChatTime(last?.created_at ?? room.last_message_at)}
                        </span>
                      </div>
                      {room.post && (
                        <p className="text-xs text-sepia truncate mt-0.5">〈{room.post.title}〉</p>
                      )}
                      <p className={`text-sm truncate mt-0.5 ${count ? "text-ink font-bold" : "text-ink-soft"}`}>
                        {last ? `${last.sender_id === user.id ? "나: " : ""}${last.body}` : "아직 주고받은 말이 없어요"}
                      </p>
                    </div>
                    {room.post?.image_paths?.[0] && (
                      <span className="relative w-12 h-12 shrink-0 border border-line overflow-hidden">
                        <Image src={imageUrl(room.post.image_paths[0])} alt="" fill sizes="48px" className="object-cover" />
                      </span>
                    )}
                    {count > 0 && (
                      <span className="shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-goguma text-page text-xs flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
