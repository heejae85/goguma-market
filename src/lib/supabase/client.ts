import { createBrowserClient } from "@supabase/ssr";

// 브라우저(클라이언트 컴포넌트)에서 쓰는 Supabase 클라이언트
// 사진은 서버 액션을 거치지 않고 브라우저에서 Storage로 바로 올린다.
// (서버 액션은 요청 본문이 기본 1MB로 제한되어 사진 여러 장을 보내기 어렵다)
// 로그인 쿠키를 그대로 읽어서, Storage 정책(내 폴더만)이 로그인한 사람 기준으로 적용된다.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
