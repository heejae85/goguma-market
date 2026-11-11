"use client";

import { useFormStatus } from "react-dom";

// 내 댓글 지우기 (되돌릴 수 없으므로 한 번 더 묻는다)
export default function DeleteCommentButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("이 댓글을 지울까요?")) e.preventDefault();
      }}
    >
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-ink-soft hover:text-goguma underline underline-offset-2">
      {pending ? "지우는 중…" : "지우기"}
    </button>
  );
}
