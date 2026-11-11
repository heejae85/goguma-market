import { Suspense } from "react";
import { redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import OldPainting from "@/components/OldPainting";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "프로필 고치기 · 고구마마켓" };

// /mypage 아래라서 proxy.ts의 PROTECTED_PATHS("/mypage")가 로그인을 확인한다
export default function EditProfilePage() {
  return (
    <div className="space-y-8">
      <OldPainting name="seodang" className="w-40 mx-auto rotate-1" sizes="160px" />
      <BookCard chapter="附 錄" title="프로필 고치기" subtitle="이웃에게 나를 소개해 보세요">
        <Suspense fallback={<p className="text-center text-ink-soft italic">기록을 펼치는 중…</p>}>
          <Form />
        </Suspense>
      </BookCard>
    </div>
  );
}

async function Form() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/profile");

  const { data: profile } = await supabase
    .from("goguma_profiles")
    .select("nickname, region, bio, avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return <p className="text-center text-goguma">고구마마켓 회원 정보가 없어요.</p>;
  }

  return (
    <ProfileForm
      userId={user.id}
      nickname={profile.nickname}
      initial={{ bio: profile.bio, region: profile.region, avatar_path: profile.avatar_path }}
    />
  );
}
