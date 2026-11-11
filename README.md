# 고구마마켓 🍠

옛 책을 넘기는 듯한 베이지 톤의 동네 중고거래 사이트 (Next.js 16 + Supabase 학습용)

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속

## 1단계: 회원 기능 (완료)

| 기능 | 파일 |
| --- | --- |
| 회원가입 / 로그인 / 로그아웃 (서버 액션) | `src/app/auth/actions.ts` |
| 회원가입 화면 | `src/app/signup/` |
| 로그인 화면 | `src/app/login/` |
| 인증 메일 링크 처리 | `src/app/auth/callback/route.ts` |
| 내 정보(로그인 필요) | `src/app/mypage/page.tsx` |
| 세션 갱신 + 접근 제어 (Next 16의 proxy = 예전 middleware) | `src/proxy.ts`, `src/lib/supabase/proxy.ts` |
| 서버용 Supabase 클라이언트 | `src/lib/supabase/server.ts` |
| 테마(색·폰트·종이 질감) | `src/app/globals.css`, `src/app/layout.tsx` |

## DB

가계부와 **같은 Supabase 프로젝트**를 사용합니다. 테이블이 섞이지 않도록 고구마마켓 테이블은 `goguma_` 접두사를 붙입니다.

- `goguma_profiles` — 닉네임, 동네 (회원가입 시 트리거가 자동 생성)
- SQL: `supabase/migrations/001_goguma_profiles.sql`

## 배포 메모 (나중에)

- 가계부와 별도의 Vercel 프로젝트로 배포
- 환경변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 등록
- Supabase → Authentication → URL Configuration 의 Redirect URLs 에 배포 주소 `/auth/callback` 추가
