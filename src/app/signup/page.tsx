import Link from "next/link";
import BookCard from "@/components/BookCard";
import SignupForm from "./SignupForm";

export const metadata = { title: "회원가입 · 고구마마켓" };

export default function SignupPage() {
  return (
    <BookCard chapter="序 章" title="장터 명부" subtitle="고구마마켓에 오신 것을 환영합니다">
      <SignupForm />
      <p className="text-center text-sm text-ink-soft mt-8">
        이미 회원이신가요?{" "}
        <Link href="/login" className="text-goguma font-bold underline underline-offset-4">
          로그인
        </Link>
      </p>
    </BookCard>
  );
}
