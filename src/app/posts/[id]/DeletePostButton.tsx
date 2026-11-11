"use client";

import { useFormStatus } from "react-dom";

// 판매글 내리기 버튼: 되돌릴 수 없으므로 한 번 더 물어본다
export default function DeletePostButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      className="flex-1"
      onSubmit={(e) => {
        if (!confirm("이 판매글을 장터에서 내릴까요? 내린 글은 되살릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="ghost-btn w-full py-3">
      {pending ? "내리는 중…" : "글 내리기"}
    </button>
  );
}
