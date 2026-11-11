"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { Field, Notice } from "@/components/BookCard";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";
import { AVATAR_BUCKET, BIO_MAX } from "@/lib/posts";
import { updateProfile, type ProfileState } from "@/app/mypage/actions";

// 프로필 고치기 폼
// 프로필 사진은 판매글 사진과 같은 방식: 브라우저에서 400px로 줄여 Storage "내 폴더"에 바로 올리고, 경로만 서버로 보낸다
export default function ProfileForm({
  userId,
  nickname,
  initial,
}: {
  userId: string;
  nickname: string;
  initial: { bio: string; region: string; avatar_path: string | null };
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_path);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setUploadError(undefined);
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      setUploadError("JPG, PNG, WebP 사진만 쓸 수 있어요.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { blob } = await resizeImage(file, 400);
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      // 저장하지 않은 채 다른 사진으로 또 바꾸면, 직전에 올린(아직 안 쓰인) 사진은 바로 지운다
      if (avatar && avatar !== initial.avatar_path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([avatar]);
      }
      setAvatar(path);
    } catch {
      setUploadError("사진을 올리지 못했어요. 2MB 이하의 사진으로 다시 해 보세요.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <input type="hidden" name="avatar_path" value={avatar ?? ""} />

      <div className="flex flex-col items-center gap-3">
        <Avatar path={avatar} nickname={nickname} size={112} />
        <div className="flex gap-2 text-sm">
          <label className="ghost-btn px-3 py-1.5 cursor-pointer">
            {uploading ? "올리는 중…" : "사진 고르기"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => pickAvatar(e.target.files?.[0])}
            />
          </label>
          {avatar && (
            <button type="button" onClick={() => setAvatar(null)} className="text-ink-soft underline underline-offset-2">
              사진 빼기
            </button>
          )}
        </div>
        {uploadError && <p className="text-xs text-goguma">{uploadError}</p>}
      </div>

      <Field label="우리 동네" hint="예) 역삼동">
        <input className="ink-input" name="region" maxLength={30} defaultValue={initial.region} placeholder="역삼동" />
      </Field>

      <Field label="자기소개" hint={`${BIO_MAX}자 이내 · 어떤 물건을 주로 내놓는지, 거래하기 좋은 시간 등`}>
        <textarea
          className="ink-input min-h-32 resize-y leading-relaxed"
          name="bio"
          maxLength={BIO_MAX}
          defaultValue={initial.bio}
          placeholder="옛 물건을 아끼는 동네 책방 주인입니다. 저녁 7시 이후 거래 좋아요."
        />
      </Field>

      <div className="flex gap-3">
        <Link href="/mypage" className="ghost-btn flex-1 py-3 text-center">
          그만두기
        </Link>
        <button type="submit" disabled={pending || uploading} className="stamp-btn flex-[2] py-3 text-lg">
          {pending ? "먹을 가는 중…" : "프로필 저장"}
        </button>
      </div>
    </form>
  );
}
