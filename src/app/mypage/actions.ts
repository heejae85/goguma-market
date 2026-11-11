"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, BIO_MAX } from "@/lib/posts";

export type ProfileState = { error?: string };

/* ── 내 프로필 고치기: 자기소개, 동네, 프로필 사진 ── */
export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/profile");

  const bio = String(formData.get("bio") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  // 빈 문자열 = 프로필 사진 없음
  const avatarRaw = String(formData.get("avatar_path") ?? "");
  const avatarPath = avatarRaw || null;

  if (bio.length > BIO_MAX) return { error: `자기소개는 ${BIO_MAX}자 이내로 적어 주세요.` };
  if (region.length > 30) return { error: "동네 이름은 30자 이내로 적어 주세요." };
  // 프로필 사진은 "내 폴더/임의이름.webp" 모양만 허용 (DB check 제약도 한 번 더 막음)
  if (avatarPath && !new RegExp(`^${user.id}/[0-9a-f-]{36}\\.webp$`).test(avatarPath)) {
    return { error: "프로필 사진 정보가 올바르지 않아요. 사진을 다시 올려 주세요." };
  }

  // 바꾸기 전 사진 (바뀌면 옛 파일을 지우기 위해)
  const { data: before } = await supabase
    .from("goguma_profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("goguma_profiles")
    .update({ bio, region, avatar_path: avatarPath })
    .eq("id", user.id);
  if (error) return { error: "프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };

  if (before?.avatar_path && before.avatar_path !== avatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
  }

  // 헤더·글 보기·프로필 등 닉네임/사진이 나오는 모든 곳을 새로
  revalidatePath("/", "layout");
  redirect(`/users/${user.id}`);
}
