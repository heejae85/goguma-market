// 채팅에서 함께 쓰는 타입과 select 문
import { formatKstChatTime } from "@/lib/time";

export type ChatProfile = { id: string; nickname: string; avatar_path: string | null };

export type ChatMessage = {
  id: number;
  room_id: number;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type ChatRoomRow = {
  id: number;
  user_a: string;
  user_b: string;
  post_id: number | null;
  last_message_at: string;
  // 방에서 프로필로 가는 외래키가 둘(user_a, user_b)이라 외래키 이름으로 콕 집어 join한다
  a: ChatProfile | null;
  b: ChatProfile | null;
  post: { id: number; title: string; image_paths: string[]; seller_id: string; price: number } | null;
};

export const ROOM_SELECT =
  "id, user_a, user_b, post_id, last_message_at, " +
  "a:goguma_profiles!goguma_chat_rooms_user_a_fkey(id, nickname, avatar_path), " +
  "b:goguma_profiles!goguma_chat_rooms_user_b_fkey(id, nickname, avatar_path), " +
  "post:goguma_posts(id, title, image_paths, seller_id, price)";

export const MESSAGE_MAX = 1000;

// 방에서 "나"가 아닌 상대방
export function partnerOf(room: ChatRoomRow, meId: string): ChatProfile | null {
  return room.user_a === meId ? room.b : room.a;
}

// 짧은 시간 표시: 오늘이면 "오후 3:12", 아니면 "11월 9일" — 항상 한국 시간 (src/lib/time.ts)
export const formatChatTime = formatKstChatTime;
