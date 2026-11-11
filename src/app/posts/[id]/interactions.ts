"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_MAX } from "@/lib/posts";

// 좋아요·댓글 서버 액션
// 서버 액션은 누구나 부를 수 있으므로 매번 로그인을 확인하고, 최종 권한 확인은 RLS가 한다.

/* ── 좋아요 누르기/취소 ── */
// liked: 지금 화면에서 누른 결과(누름=true, 취소=false)
export async function setLike(postId: number, liked: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인하면 좋아요를 누를 수 있어요." };

  if (liked) {
    // 이미 눌렀으면 그대로 두기 (기본키 (post_id, user_id) 중복은 무시)
    const { error } = await supabase
      .from("goguma_post_likes")
      .upsert({ post_id: postId, user_id: user.id }, { ignoreDuplicates: true });
    if (error) return { error: "좋아요를 남기지 못했어요." };
  } else {
    const { error } = await supabase
      .from("goguma_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) return { error: "좋아요를 취소하지 못했어요." };
  }

  // 목록 카드의 ♥ 개수와 글 보기 화면을 새 값으로
  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  return {};
}

/* ── 댓글 쓰기 ── */
export type CommentState = { error?: string; ok?: number };

export async function addComment(
  postId: number,
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "댓글 내용을 적어 주세요." };
  if (body.length > COMMENT_MAX) return { error: `댓글은 ${COMMENT_MAX}자 이내로 적어 주세요.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인하면 댓글을 남길 수 있어요." };

  const { error } = await supabase
    .from("goguma_comments")
    .insert({ post_id: postId, author_id: user.id, body });
  if (error) {
    return {
      error:
        error.code === "23503"
          ? "고구마마켓 회원만 댓글을 남길 수 있어요."
          : "댓글을 남기지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/posts");
  // ok에 매번 다른 값을 넣어, 폼이 "성공했다"는 것을 알고 입력칸을 비우게 한다
  return { ok: Date.now() };
}

/* ── 댓글 지우기 (내 댓글만) ── */
export async function deleteComment(commentId: number, postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("goguma_comments").delete().eq("id", commentId).eq("author_id", user.id);

  revalidatePath(`/posts/${postId}`);
  revalidatePath("/posts");
}
