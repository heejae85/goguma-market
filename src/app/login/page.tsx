import { Suspense } from "react";
import Link from "next/link";
import BookCard from "@/components/BookCard";
import LoginForm from "./LoginForm";

export const metadata = { title: "로그인 · 고구마마켓" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <BookCard chapter="第 二 章" title="다시 오셨군요" subtitle="장터에 들어가려면 로그인해 주세요">
      {/* searchParams는 요청 시점 데이터라 Suspense 안에서 읽는다 */}
      <Suspense fallback={<LoginForm next="/" />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
      <p className="text-center text-sm text-ink-soft mt-8">
        아직 명부에 이름이 없으신가요?{" "}
        <Link href="/signup" className="text-goguma font-bold underline underline-offset-4">
          회원가입
        </Link>
      </p>
    </BookCard>
  );
}

async function LoginFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const notice =
    params.error === "confirm"
      ? "인증 링크가 만료되었거나 올바르지 않습니다. 다시 시도해 주세요."
      : params.next
        ? "로그인이 필요한 페이지입니다."
        : undefined;

  return <LoginForm next={next} notice={notice} />;
}
