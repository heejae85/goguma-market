import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인이 필요한 경로
const PROTECTED_PATHS = ["/mypage", "/posts/new", "/chats"];
// 경로 중간에 id가 들어가서 앞부분 비교(startsWith)로는 못 잡는 경로 → 정규식으로 확인
const PROTECTED_PATTERNS = [/^\/posts\/[^/]+\/edit\/?$/];
// 로그인한 사용자는 들어갈 필요 없는 경로
const GUEST_ONLY_PATHS = ["/login", "/signup"];

// 매 요청마다 Supabase 세션(쿠키)을 갱신하고, 로그인 여부에 따라 이동시킨다
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 주의: createServerClient와 getUser 사이에 다른 코드를 넣지 말 것
  // getClaims()는 토큰 서명만 확인해서, 서버에서 이미 끝난 세션(다른 곳에서 로그아웃,
  // 계정 삭제 등)도 "로그인됨"으로 볼 수 있다. 페이지와 판단이 어긋나지 않도록
  // Supabase 서버에 직접 확인하는 getUser()를 사용한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 세션이 무효인데 인증 쿠키가 남아 있으면 지워서 "반쯤 로그인된" 상태를 없앤다
  if (!user) {
    const stale = request.cookies.getAll().filter((c) => c.name.startsWith("sb-"));
    if (stale.length > 0) {
      stale.forEach(({ name }) => request.cookies.delete(name));
      response = NextResponse.next({ request });
      stale.forEach(({ name }) => response.cookies.delete(name));
    }
  }

  const isProtected =
    PROTECTED_PATHS.some((p) => path.startsWith(p)) ||
    PROTECTED_PATTERNS.some((re) => re.test(path));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return redirectWithCookies(url, response);
  }

  if (user && GUEST_ONLY_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// 리다이렉트할 때도 위에서 갱신/삭제한 쿠키가 브라우저에 전달되도록 옮겨 담는다
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
