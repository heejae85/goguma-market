"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ChatButton from "@/components/ChatButton";
import { createClient } from "@/lib/supabase/client";
import { useOnlineUsers, type OnlineUser } from "@/lib/presence";
import { startChat } from "./actions";

// 지금 장터에 접속해 있는 이웃 목록 (Realtime Presence, 실시간으로 바뀜)
//
// 주의: Presence로 들어오는 이름·사진은 "각 브라우저가 스스로 알린 값"이라 믿을 수 없다.
// (예: 이미 탈퇴·삭제된 계정의 탭이 열려 있으면 그 사람이 계속 접속 중으로 보인다 → 누르면 404)
// 그래서 id만 받아서, 실제로 있는 회원인지 DB(goguma_profiles)에서 다시 확인하고 DB의 이름·사진을 쓴다.
export default function OnlineNeighbors({ meId }: { meId: string }) {
  const online = useOnlineUsers();
  // 접속 목록이 바뀔 때만 다시 조회하도록 id들을 문자열 하나로 묶는다
  const idsKey = useMemo(
    () =>
      online
        .map((u) => u.id)
        .filter((id) => id !== meId)
        .sort()
        .join(","),
    [online, meId],
  );
  const [verified, setVerified] = useState<{ key: string; users: OnlineUser[] }>({ key: "", users: [] });

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    createClient()
      .from("goguma_profiles")
      .select("id, nickname, avatar_path")
      .in("id", idsKey.split(","))
      .then(({ data }) => {
        if (!cancelled) setVerified({ key: idsKey, users: (data ?? []) as OnlineUser[] });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  // 아직 확인 중이거나(키가 다름) 접속한 사람이 없으면 빈 목록
  const others = idsKey && verified.key === idsKey ? verified.users : [];

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
