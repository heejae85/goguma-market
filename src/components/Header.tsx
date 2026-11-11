import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import Avatar from "@/components/Avatar";
import PresenceTracker from "@/components/PresenceTracker";

// 헤더 자체(로고)는 정적으로 미리 그려두고,
// 로그인 상태에 따라 바뀌는 메뉴만 요청 시점에 스트리밍한다 (Cache Components 방식)
export default function Header() {
  return (
    <header className="border-b-4 border-double border-line bg-page/70">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-title text-2xl sm:text-3xl font-extrabold text-goguma tracking-wider">
            고구마마켓
          </span>
          <span className="hidden sm:inline text-xs text-ink-soft italic">
            Goguma Market · est. 2026
          </span>
        </Link>

        <Suspense fallback={<span className="text-sm text-ink-soft italic">…</span>}>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}

async function UserNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <nav className="flex items-center gap-2 sm:gap-3 text-sm">
        <Link href="/posts" className="text-ink hover:text-goguma">
          장터 구경
        </Link>
        <Link href="/login" className="ghost-btn px-3 py-1.5">
          로그인
        </Link>
        <Link href="/signup" className="stamp-btn px-3 py-1.5">
          회원가입
        </Link>
      </nav>
    );
  }

  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase.from("goguma_profiles").select("nickname, avatar_path").eq("id", user.id).maybeSingle(),
    // 안 읽은 편지 수 (RLS: 내 방의 메시지만 보이므로, 상대가 보냈고 안 읽은 것만 세면 된다)
    supabase
      .from("goguma_chat_messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", user.id),
  ]);
  const nickname = profile?.nickname ?? user.email;

  return (
    <nav className="flex items-center gap-2 sm:gap-3 text-sm">
      {/* 고구마마켓 회원이면 "지금 접속 중"을 알린다 (화면에는 아무것도 그리지 않음) */}
      {profile && (
        <PresenceTracker me={{ id: user.id, nickname: profile.nickname, avatar_path: profile.avatar_path }} />
      )}
      <Link href="/posts" className="text-ink hover:text-goguma">
        장터 구경
      </Link>
      <Link href="/chats" className="relative text-ink hover:text-goguma">
        편지함
        {!!unread && (
          <span className="absolute -top-2 -right-3 min-w-4 h-4 px-1 rounded-full bg-goguma text-page text-[10px] leading-4 text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <Link href="/posts/new" className="stamp-btn px-3 py-1.5">
        글쓰기
      </Link>
      <Link href="/mypage" className="flex items-center gap-1.5 text-ink hover:text-goguma">
        <Avatar path={profile?.avatar_path} nickname={nickname ?? "?"} size={28} />
        <span className="hidden sm:inline">
          <span className="font-bold">{nickname}</span> 님
        </span>
      </Link>
      <LogoutButton className="px-3 py-1.5" />
    </nav>
  );
}
