import { Suspense } from "react";
import { redirect } from "next/navigation";
import BookCard from "@/components/BookCard";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

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
    .select("nickname, region, created_at")
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
      <dl className="divide-y divide-line/70 text-ink">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-3">
            <dt className="text-ink-soft tracking-wider">{k}</dt>
            <dd className="font-bold text-right break-all">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="ornament my-6">✦</div>

      <form action={logout}>
        <button type="submit" className="ghost-btn w-full py-3">
          로그아웃
        </button>
      </form>
    </>
  );
}
