import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "내 서재 · 고구마마켓" };

export default function MyPage() {
  return (
    <BookCard chapter="附 錄" title="내 서재" subtitle="나의 장터 기록">
      <Suspense fallback={<p className="text-center text-ink-soft italic">기록을 펼치는 중…</p>}>
        <ProfileDetails />
      </Suspense>
    </BookCard>
  );
}

async function ProfileDetails() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // proxy.ts에서도 막지만, 페이지에서 한 번 더 확인 (권장 패턴)
  if (!user) redirect("/login?next=/mypage");

  const { data: profile } = await supabase
    .from("goguma_profiles")
    .select("nickname, region, created_at, bio, avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const joined = new Date(profile?.created_at ?? user.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const rows: [string, string][] = [
    ["닉네임", profile?.nickname ?? "—"],
    ["이메일", user.email ?? "—"],
    ["우리 동네", profile?.region || "아직 정하지 않음"],
    ["가입일", joined],
  ];

  return (
    <>
      <div className="flex flex-col items-center gap-2 mb-6">
        <Avatar path={profile?.avatar_path} nickname={profile?.nickname ?? "?"} size={88} />
        {profile?.bio && <p className="text-sm text-ink-soft italic text-center">“{profile.bio}”</p>}
      </div>

      <dl className="divide-y divide-line/70 text-ink">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3">
            <dt className="text-ink-soft tracking-wider">{k}</dt>
            <dd className="font-bold text-right break-all">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="ornament my-6">✦</div>

      <div className="flex gap-3 mb-3">
        <Link href={`/users/${user.id}`} className="stamp-btn flex-1 py-3 text-center">
          내 장터 프로필
        </Link>
        <Link href="/mypage/profile" className="ghost-btn flex-1 py-3 text-center">
          프로필 고치기
        </Link>
      </div>
      <LogoutButton className="w-full py-3" />
    </>
  );
}
