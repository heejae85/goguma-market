"use client";

import { useFormStatus } from "react-dom";
import { logout } from "@/app/auth/actions";

// 로그아웃 버튼: 누른 뒤 처리 중임을 보여주고, 중복 클릭을 막는다
export default function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <form action={logout}>
      <SubmitButton className={className} />
    </form>
  );
}

function SubmitButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`ghost-btn ${className}`}>
      {pending ? "나가는 중…" : "로그아웃"}
    </button>
  );
}
