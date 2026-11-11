"use client";

import { useSyncExternalStore } from "react";

// "지금 장터에 있는 이웃" 목록을 브라우저 안에서 나눠 쓰는 작은 저장소
// - PresenceTracker(헤더)가 Supabase Realtime Presence 채널에 접속해 목록을 채우고
// - OnlineNeighbors, ChatRoom 등 여러 컴포넌트가 같은 목록을 읽는다
// (같은 채널에 여러 번 접속하지 않도록 접속은 한 곳에서만 한다)

export type OnlineUser = { id: string; nickname: string; avatar_path: string | null };

let online: OnlineUser[] = [];
const listeners = new Set<() => void>();

export function setOnlineUsers(users: OnlineUser[]) {
  online = users;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// useSyncExternalStore: React 바깥의 값을 컴포넌트에서 안전하게 구독하는 훅
export function useOnlineUsers(): OnlineUser[] {
  return useSyncExternalStore(
    subscribe,
    () => online,
    () => [], // 서버에서 그릴 때는 빈 목록
  );
}

export const PRESENCE_CHANNEL = "goguma-online";
