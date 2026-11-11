"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRESENCE_CHANNEL, setOnlineUsers, type OnlineUser } from "@/lib/presence";

// 로그인한 사람이 사이트를 보고 있는 동안 "나 여기 있어요"를 알린다 (Supabase Realtime Presence)
// - 창을 닫거나 로그아웃하면 Supabase가 자동으로 목록에서 빼 준다 (DB에 저장하지 않음)
// - 헤더에 한 번만 넣어서, 어느 페이지에 있든 접속 중으로 보이게 한다
export default function PresenceTracker({ me }: { me: OnlineUser }) {
  // 객체(me)는 화면을 새로 그릴 때마다 새로 만들어지므로, 값 하나하나를 의존성으로 쓴다
  const { id, nickname, avatar_path } = me;

  useEffect(() => {
    const supabase = createClient();
    const myself: OnlineUser = { id, nickname, avatar_path };
    // presence key = 사용자 id → 같은 사람이 탭을 여러 개 열어도 한 명으로 묶인다
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<OnlineUser>();
        // state: { [사용자id]: [{...탭1}, {...탭2}] } → 사람마다 하나씩
        const users = Object.values(state)
          .map((tabs) => tabs[0])
          .filter(Boolean)
          .map((u) => ({ id: u.id, nickname: u.nickname, avatar_path: u.avatar_path }));
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(myself);
        }
      });

    return () => {
      setOnlineUsers([]);
      supabase.removeChannel(channel);
    };
  }, [id, nickname, avatar_path]);

  return null;
}
