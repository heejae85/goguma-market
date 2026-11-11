"use client";

import { useFormStatus } from "react-dom";

// "채팅하기" 버튼: 미리 묶은 startChat 서버 액션을 폼으로 실행한다
export default function ChatButton({
  action,
  label = "채팅하기",
  className = "stamp-btn px-4 py-2",
}: {
  action: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  return (
    <form action={action} className="contents">
      <Submit label={label} className={className} />
    </form>
  );
}

function Submit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "방을 여는 중…" : `✉ ${label}`}
    </button>
  );
}
