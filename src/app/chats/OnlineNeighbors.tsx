"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";
import ChatButton from "@/components/ChatButton";
import { useOnlineUsers } from "@/lib/presence";
import { startChat } from "./actions";

// 지금 장터에 접속해 있는 이웃 목록 (Realtime Presence, 실시간으로 바뀜)
export default function OnlineNeighbors({ meId }: { meId: string }) {
  const others = useOnlineUsers().filter((u) => u.id !== meId);

  if (others.length === 0) {
    return (
      <p className="text-sm text-ink-soft italic text-center py-4">
        지금은 장터에 나온 이웃이 없어요. 조금 있다 다시 들러 보세요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {others.map((u) => (
        <li key={u.id} className="flex items-center gap-3 py-3">
          <Link href={`/users/${u.id}`} className="relative">
            <Avatar path={u.avatar_path} nickname={u.nickname} size={40} />
            {/* 접속 중 표시: 초록 대신 테마색(세피아) 점 */}
            <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-sepia border-2 border-page" />
          </Link>
          <Link href={`/users/${u.id}`} className="flex-1 font-bold hover:text-goguma truncate">
            {u.nickname}
          </Link>
          <ChatButton action={startChat.bind(null, u.id, null)} className="ghost-btn px-3 py-1.5 text-sm" />
        </li>
      ))}
    </ul>
  );
}
