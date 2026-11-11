"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOnlineUsers } from "@/lib/presence";
import { MESSAGE_MAX, formatChatTime, type ChatMessage, type ChatProfile } from "@/lib/chat";

// 채팅방 본문: 메시지 목록 + 입력칸
// - 보내기: 브라우저에서 바로 insert (RLS가 "방 참여자 본인 이름으로만" 허용)
// - 받기: Supabase Realtime postgres_changes로 이 방의 새 메시지를 실시간으로 받는다
// - 읽음: 상대가 보낸 메시지를 화면에 띄우면 read_at을 채운다
export default function ChatRoom({
  roomId,
  meId,
  partner,
  blocked = false,
  initialMessages,
}: {
  roomId: number;
  meId: string;
  partner: ChatProfile;
  // 둘 사이에 차단이 있으면 편지를 보낼 수 없다
  blocked?: boolean;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const partnerOnline = useOnlineUsers().some((u) => u.id === partner.id);

  // 새 메시지를 목록에 넣기 (실시간·내가 보낸 것 둘 다 들어올 수 있어 id로 중복 제거)
  function upsert(msg: ChatMessage) {
    setMessages((prev) => {
      const i = prev.findIndex((m) => m.id === msg.id);
      if (i === -1) return [...prev, msg].sort((a, b) => a.id - b.id);
      const next = prev.slice();
      next[i] = msg;
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // 상대가 보낸 안 읽은 메시지를 읽음 처리
    async function markRead() {
      const { data } = await supabase
        .from("goguma_chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .neq("sender_id", meId)
        .is("read_at", null)
        .select("id");
      // 헤더의 "안 읽은 편지" 숫자를 새로 그리기 위해 서버 컴포넌트 새로고침
      if (data && data.length > 0) router.refresh();
    }

    const channel = supabase.channel(`goguma-room-${roomId}`);

    (async () => {
      // Realtime이 RLS(방 참여자만 읽기)를 적용하려면 내 로그인 토큰을 알아야 한다
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      supabase.realtime.setAuth(session?.access_token ?? null);

      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "goguma_chat_messages", filter: `room_id=eq.${roomId}` },
          (payload) => {
            const msg = payload.new as ChatMessage;
            upsert(msg);
            if (msg.sender_id !== meId) markRead();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "goguma_chat_messages", filter: `room_id=eq.${roomId}` },
          // 상대가 내 메시지를 읽으면 read_at이 채워져 "읽음"이 표시된다
          (payload) => upsert(payload.new as ChatMessage),
        )
        .subscribe();

      markRead();
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, meId, router]);

  // 새 메시지가 오면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    if (body.length > MESSAGE_MAX) {
      setError(`한 번에 ${MESSAGE_MAX}자까지 보낼 수 있어요.`);
      return;
    }
    setSending(true);
    setError(undefined);
    const { data, error } = await createClient()
      .from("goguma_chat_messages")
      .insert({ room_id: roomId, sender_id: meId, body })
      .select("id, room_id, sender_id, body, created_at, read_at")
      .single();
    setSending(false);
    if (error || !data) {
      setError("편지를 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    upsert(data as ChatMessage);
    setText("");
  }

  // 내가 보낸 메시지 중 상대가 읽은 마지막 것 → 그 아래에 "읽음" 표시
  const lastReadMine = [...messages].reverse().find((m) => m.sender_id === meId && m.read_at)?.id;

  return (
    <div className="flex flex-col">
      <p className="text-xs text-center text-ink-soft mb-3">
        {partnerOnline ? (
          <span className="text-sepia">● {partner.nickname} 님이 지금 장터에 있어요</span>
        ) : (
          <span>○ {partner.nickname} 님은 지금 자리를 비웠어요</span>
        )}
      </p>

      <div className="h-[55vh] min-h-72 overflow-y-auto border-y border-line/70 py-4 px-1 space-y-3 bg-paper/40">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-soft italic py-10">첫 인사를 건네 보세요. 🍠</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 whitespace-pre-wrap break-words leading-relaxed text-[15px] border ${
                  mine
                    ? "bg-goguma text-page border-goguma-deep"
                    : "bg-page text-ink border-line"
                }`}
              >
                {m.body}
              </div>
              <span className="text-[10px] text-ink-soft mt-0.5">
                {formatChatTime(m.created_at)}
                {mine && m.id === lastReadMine && " · 읽음"}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {blocked ? (
        <p className="mt-3 text-center text-sm text-ink-soft border border-line bg-paper/50 py-3">
          차단된 사이라 편지를 보낼 수 없어요.
        </p>
      ) : (
      <form
        className="mt-3 flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter = 보내기, Shift+Enter = 줄바꿈 (한글 조합 중 Enter는 무시)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={MESSAGE_MAX}
          rows={2}
          placeholder="편지를 적어 주세요… (Enter 보내기, Shift+Enter 줄바꿈)"
          className="ink-input flex-1 resize-none leading-relaxed"
        />
        <button type="submit" disabled={sending || !text.trim()} className="stamp-btn px-5 py-2.5 shrink-0">
          {sending ? "…" : "보내기"}
        </button>
      </form>
      )}
      {error && <p className="text-xs text-goguma mt-1">{error}</p>}
    </div>
  );
}
