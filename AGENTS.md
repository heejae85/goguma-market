<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


# 고구마마켓 프로젝트 가이드

옛 책 느낌(베이지 톤)의 동네 중고거래 사이트. **Next.js 16 + Supabase 개발 공부용** 프로젝트입니다.

## 작업 방식 (학습용)

- **한 번에 한 단계씩** 진행한다. 요청받은 단계만 만들고, 다음 단계 기능을 미리 만들지 않는다.
- 새로 쓰는 코드에는 "왜 이렇게 하는지"를 **한국어 주석**으로 짧게 남긴다. (예: Next.js 16에서 바뀐 점, 보안상 이유)
- 단계가 끝나면 무엇을 만들었고 어떤 개념을 썼는지 간단히 설명한다.
- 큰 구조 변경, 새 라이브러리 추가, DB 스키마 변경은 먼저 사용자에게 알린다.

### 진행 현황

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 1 | 회원가입 / 로그인 / 로그아웃, 내 정보(`/mypage`) | 완료 |
| 2 | 판매글 CRUD (`/posts`, `/posts/new`, `/posts/[id]`, `/posts/[id]/edit`) — 사진 없음 | 완료 |
| 3 | 판매글 사진 여러 장 (최대 10장, Storage `goguma-post-images`) | 완료 |
| 4~ | (예정) | - |

## ⚠️ Supabase: 가계부 프로젝트와 DB를 같이 씀

- Supabase 프로젝트: **가계부** (`ljfgbhptxymixjkqlero`, 도쿄 리전). 별도 개발용 DB가 없으므로 **이 DB가 곧 운영 DB**다.
- **가계부(EVAN_MONEYBOOK) 것은 절대 수정·삭제하지 않는다.**
  - 테이블: `ledgers`, `entries`
  - 함수: `mb_*` (`mb_get`, `mb_add_entry` 등)
  - Supabase advisor가 `mb_*` 함수에 "SECURITY DEFINER를 anon이 실행 가능" 경고를 띄우지만, 가계부의 **의도된 설계**(가계부 코드 방식)이므로 고치지 않는다.
- 고구마마켓 DB 객체는 **모두 `goguma_` 접두사**를 붙인다. (테이블, 함수, 트리거, 정책 이름)
- `auth.users`(회원)는 두 앱이 **공유**한다.
  - 가입 트리거 `goguma_handle_new_user`는 `raw_user_meta_data.app = 'goguma'`인 사용자에게만 프로필을 만든다. 회원가입 시 `options.data.app = "goguma"`를 꼭 넣는다.
  - `auth.users`에 트리거를 추가할 때는 가계부 쪽에 영향이 없는지 확인한다.
- Supabase **Auth 설정**(이메일 인증, Site URL, Redirect URLs)은 프로젝트 전체에 적용된다. 바꾸기 전에 사용자에게 확인한다.
  - 현재 이메일 인증은 **꺼져 있음** → 가입 즉시 로그인됨.
  - 이메일 인증을 켜면 Redirect URLs에 `https://goguma-market-khaki.vercel.app/auth/callback`과 `http://localhost:3000/auth/callback`을 추가해야 한다.
- 모든 새 테이블은 **RLS를 켜고 정책을 만든다.** 변경 후 `get_advisors`(security)로 확인한다.
- 스키마 변경은 MCP `apply_migration`으로 적용하고, **같은 SQL을 `supabase/migrations/NNN_이름.sql`에 번호순으로 저장**한다.
- `DROP`, `DELETE`, `TRUNCATE` 등 되돌릴 수 없는 SQL은 실행 전에 사용자에게 확인한다.
- 테스트 계정은 `goguma-devtest*@example.com` 형식으로 만들고, **테스트가 끝나면 삭제**한다. 실제 사람 메일 주소(gmail 등)는 쓰지 않는다.
- 샘플 데이터: `goguma-sample1~6@example.com` 계정(닉네임 군고구마할매·책방주인 등)과 그 판매글 42개는 화면 확인용으로 **일부러 남겨 둔 것**이다. 내용은 `supabase/seed/sample_posts.sql`, 지우는 SQL은 그 파일 맨 아래에 있다(지우기 전 사용자 확인).
- publishable 키는 브라우저 공개용이라 노출돼도 되지만, `.env.local`은 커밋하지 않는다. (`.env.example` 참고)

## ⚠️ Next.js 16에서 주의할 점 (예전 버전과 다름)

- `middleware.ts` → **`src/proxy.ts`** 로 이름이 바뀌었다. 함수 이름도 `proxy`.
- **Cache Components가 켜져 있다** (`next.config.ts`의 `cacheComponents: true`).
  - `cookies()`, `searchParams`, Supabase 로그인 확인처럼 **요청 시점 데이터를 읽는 컴포넌트는 `<Suspense>` 안에** 둔다. 안 그러면 빌드 에러.
  - 정적인 부분(제목, 설명 글)은 Suspense 밖에 두면 미리 렌더링되어 빠르다.
- `src/lib/supabase/server.ts`의 `createClient()`는 맨 앞에서 `await connection()`을 호출한다. Supabase가 내부에서 `Date.now()`를 써서, 이게 없으면 "unstable value Date.now()" 에러가 난다. 지우지 않는다.
- `src/lib/supabase/proxy.ts`는 **`getUser()`** 로 로그인을 확인한다. `getClaims()`로 바꾸지 않는다.
  - `getClaims()`는 토큰 서명만 봐서, 서버에서 끝난 세션도 "로그인됨"으로 판단 → 페이지(`getUser()`)와 판단이 어긋나 로그인/로그아웃이 꼬였던 버그가 있었다.
  - 세션이 무효면 남은 `sb-` 쿠키를 지우고, 리다이렉트할 때도 쿠키를 함께 넘긴다(`redirectWithCookies`).
- 로그아웃은 `signOut({ scope: "local" })` (현재 브라우저만). 기본값(global)은 다른 기기까지 끊어서 꼬임을 만든다.
- 폼은 **서버 액션 + `useActionState`** 패턴을 쓴다 (`src/app/auth/actions.ts`). 버튼 처리 중 표시는 `useFormStatus`.
- 로그인 후 이동 경로(`next`)는 `/`로 시작하는 내부 경로만 허용한다 (오픈 리다이렉트 방지, `safeNext`).
- 코드를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 확인한다.

## 인증 관련 파일

| 역할 | 파일 |
| --- | --- |
| 가입/로그인/로그아웃 서버 액션 | `src/app/auth/actions.ts` |
| 인증 메일 링크 처리 | `src/app/auth/callback/route.ts` |
| 세션 갱신 + 접근 제어 | `src/proxy.ts`, `src/lib/supabase/proxy.ts` |
| 서버용 Supabase 클라이언트 | `src/lib/supabase/server.ts` |
| 로그인 필요한 경로 목록 | `PROTECTED_PATHS`, `PROTECTED_PATTERNS`(정규식, 예: `/posts/[id]/edit`) (`src/lib/supabase/proxy.ts`) |
| 판매글 서버 액션 / 공통 도우미 | `src/app/posts/actions.ts`, `src/lib/posts.ts` |
| 사진 올리기 (브라우저 → Storage 직접) | `src/app/posts/ImageUploader.tsx`, `src/lib/supabase/client.ts`, `src/lib/resizeImage.ts` |

사진은 서버 액션(본문 1MB 제한)을 거치지 않고 브라우저에서 Storage의 `<내 uuid>/` 폴더로 바로 올린다. 서버에는 경로만 보내고 `isOwnImagePath`로 확인한다. 글을 고치면서 뺀 사진과 내린 글의 사진은 서버 액션이 Storage에서 지운다.

새로 로그인이 필요한 페이지를 만들면 `PROTECTED_PATHS`에 추가하고, 페이지 안에서도 `getUser()`로 한 번 더 확인한다.

## 디자인 규칙 (옛 책 테마)

- 색은 `src/app/globals.css`의 토큰을 쓴다: `paper`, `page`, `ink`, `ink-soft`, `sepia`, `goguma`(자주색 강조), `line`(괘선). 임의의 색을 새로 만들지 않는다.
- 폰트: 본문 고운바탕(`--font-gowun`), 제목 나눔명조(`font-title`). 고딕체를 쓰지 않는다.
- 공통 클래스: `book-page`(책 속지 카드), `ornament`(❦ 구분선), `ink-input`(밑줄 입력칸), `stamp-btn`(주 버튼), `ghost-btn`(보조 버튼), `drop-cap`(첫 글자 장식).
- 공통 컴포넌트: `BookCard`, `Field`, `Notice` (`src/components/BookCard.tsx`), `LogoutButton`.
- 페이지 머리에 "第 一 章" 같은 장 표기를 붙이고, 문구는 옛 장터·책 느낌의 부드러운 말투로 쓴다.

## 배포

- GitHub: `heejae85/goguma-market` (public). **`main`에 push하면 Vercel이 자동 배포**한다.
- Vercel: 팀 `evan-1e9f`, 프로젝트 `goguma-market`, 서버 지역 `hnd1`(도쿄, Supabase와 같은 지역).
  - 주소: https://goguma-market-khaki.vercel.app
  - 가계부 Vercel 프로젝트(`moneybook`)는 건드리지 않는다.
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Vercel에 등록됨). 새 환경변수가 생기면 `.env.example`과 Vercel 둘 다 추가한다.
- 커밋·push는 사용자가 요청할 때만 한다. 커밋 메시지는 한국어로, 단계별로 나눈다.
- push 전에 `npm run lint`와 `npm run build`가 통과하는지 확인한다.

## 개발 환경 (Windows)

- Node.js는 winget으로 설치됨(사용자 PATH). PowerShell에서는 `npm.cmd`, `npx.cmd`로 실행한다(`npm.ps1`은 실행 정책에 막힐 수 있음).
- 개발 서버: `npm run dev` → http://localhost:3000
