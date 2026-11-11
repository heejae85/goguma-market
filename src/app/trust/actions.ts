"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/posts";
import { REVIEW_MAX, isReportReason, type Rating } from "@/lib/trust";

// 믿을 수 있는 거래: 거래완료(구매자 지정), 후기, 신고, 차단
// 서버 액션은 누구나 부를 수 있으므로 매번 로그인·값을 확인하고, 최종 권한은 RLS가 한 번 더 막는다.

async function requireUser(next: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${next}`);
  return { supabase, user };
}

export type FormState = { error?: string };

/* ── 거래완료 + 구매자 지정 ── */
export async function completeSale(postId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser(`/posts/${postId}/complete`);
  const buyerId = String(formData.get("buyer_id") ?? "");
  if (!isUuid(buyerId)) return { error: "구매한 이웃을 골라 주세요." };

  // DB 정책이 "이 글로 나와 채팅한 사람만 구매자" 조건을 확인한다 → 아니면 0행 수정
  const { data, error } = await supabase
    .from("goguma_posts")
    .update({ status: "sold", buyer_id: buyerId })
    .eq("id", postId)
    .eq("seller_id", user.id)
    .select("id");
  if (error || !data?.length) {
    return { error: "거래완료로 바꾸지 못했어요. 이 글로 채팅한 이웃만 구매자로 정할 수 있어요." };
  }

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/mypage/sales");
  // 바로 구매자에게 후기를 남길 수 있게 후기 쓰기로
  redirect(`/posts/${postId}/review`);
}

/* ── 거래 후기 남기기 ── */
export async function createReview(postId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser(`/posts/${postId}/review`);
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  if (![1, 2, 3].includes(rating)) return { error: "거래가 어땠는지 골라 주세요." };
  if (body.length > REVIEW_MAX) return { error: `후기는 ${REVIEW_MAX}자 이내로 적어 주세요.` };

  // 상대가 누구인지는 글에서 직접 구한다 (폼 값을 믿지 않음)
  const { data: post } = await supabase
    .from("goguma_posts")
    .select("seller_id, buyer_id, status")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.status !== "sold" || !post.buyer_id) return { error: "거래완료된 글에만 후기를 남길 수 있어요." };
  const reviewee =
    post.seller_id === user.id ? post.buyer_id : post.buyer_id === user.id ? post.seller_id : null;
  if (!reviewee) return { error: "이 거래의 판매자·구매자만 후기를 남길 수 있어요." };

  const { error } = await supabase
    .from("goguma_reviews")
    .insert({ post_id: postId, reviewer_id: user.id, reviewee_id: reviewee, rating: rating as Rating, body });
  if (error) {
    return { error: error.code === "23505" ? "이미 후기를 남겼어요." : "후기를 남기지 못했어요." };
  }

  revalidatePath(`/users/${reviewee}`);
  revalidatePath(`/posts/${postId}`);
  redirect(`/users/${reviewee}?reviewed=1`);
}

/* ── 신고 ── */
export type ReportState = { error?: string; done?: boolean };

export async function createReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const { supabase, user } = await requireUser("/posts");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 500);
  const postRaw = String(formData.get("post_id") ?? "");
  const userRaw = String(formData.get("user_id") ?? "");
  const postId = /^\d{1,15}$/.test(postRaw) ? Number(postRaw) : null;
  const targetUser = isUuid(userRaw) ? userRaw : null;

  if (!isReportReason(reason)) return { error: "신고하는 까닭을 골라 주세요." };
  if (!postId && !targetUser) return { error: "무엇을 신고하는지 알 수 없어요." };
  if (targetUser === user.id) return { error: "나를 신고할 수는 없어요." };

  const { error } = await supabase
    .from("goguma_reports")
    .insert({ reporter_id: user.id, post_id: postId, user_id: targetUser, reason, detail });
  if (error) return { error: "신고를 접수하지 못했어요. 잠시 후 다시 시도해 주세요." };
  return { done: true };
}

/* ── 차단 / 차단 풀기 ── */
export async function setBlock(targetId: string, block: boolean) {
  const { supabase, user } = await requireUser(`/users/${targetId}`);
  if (!isUuid(targetId) || targetId === user.id) return;

  if (block) {
    await supabase
      .from("goguma_blocks")
      .upsert({ blocker_id: user.id, blocked_id: targetId }, { ignoreDuplicates: true });
  } else {
    await supabase.from("goguma_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetId);
  }
  // 목록·댓글·채팅 어디서든 바로 반영되도록 전체 새로고침
  revalidatePath("/", "layout");
}
