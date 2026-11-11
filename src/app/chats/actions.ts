"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/posts";

/* ── 채팅 시작: 이미 방이 있으면 그 방으로, 없으면 새로 만들어서 이동 ── */
// partnerId: 대화할 상대, postId: 판매글에서 시작했으면 그 글 번호 (접속 목록에서 시작하면 null)
export async function startChat(partnerId: string, postId: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const back = postId ? `/posts/${postId}` : "/chats";
  if (!user) redirect(`/login?next=${back}`);
  // 서버 액션 인자는 브라우저에서 조작될 수 있으므로 모양을 확인한다
  if (!isUuid(partnerId) || partnerId === user.id) redirect(back);

  // 두 사람을 항상 (작은 id, 큰 id) 순서로 → DB의 check(user_a < user_b)·중복 방지와 맞춘다
  const [user_a, user_b] = [user.id, partnerId].sort();

  const findRoom = () => {
    const q = supabase.from("goguma_chat_rooms").select("id").eq("user_a", user_a).eq("user_b", user_b);
    return (postId === null ? q.is("post_id", null) : q.eq("post_id", postId)).maybeSingle();
  };

  const { data: existing } = await findRoom();
  if (existing) redirect(`/chats/${existing.id}`);

  const { data: created, error } = await supabase
    .from("goguma_chat_rooms")
    .insert({ user_a, user_b, post_id: postId })
    .select("id")
    .single();

  if (created) redirect(`/chats/${created.id}`);
  // 동시에 두 번 눌러서 이미 만들어졌다면(중복 에러 23505) 그 방을 다시 찾는다
  if (error?.code === "23505") {
    const { data: again } = await findRoom();
    if (again) redirect(`/chats/${again.id}`);
  }
  redirect(`${back}?chat=error`);
}
