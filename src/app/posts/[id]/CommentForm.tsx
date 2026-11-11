"use client";

import { useActionState } from "react";
import { Notice } from "@/components/BookCard";
import { COMMENT_MAX } from "@/lib/posts";
import type { CommentState } from "./interactions";

// 댓글 쓰기 폼 (서버 액션 + useActionState 패턴)
export default function CommentForm({
  action,
}: {
  action: (prev: CommentState, formData: FormData) => Promise<CommentState>;
}) {
  const [state, formAction, pending] = useActionState<CommentState, FormData>(action, {});

  return (
    // 성공할 때마다 key가 바뀌어 입력칸이 비워진다
    <form key={state.ok ?? "new"} action={formAction} className="space-y-3">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <textarea
        name="body"
        className="ink-input min-h-20 resize-y leading-relaxed"
        maxLength={COMMENT_MAX}
        placeholder="물건에 대해 궁금한 것을 여쭤보세요…"
        required
      />
      <div className="text-right">
        <button type="submit" disabled={pending} className="stamp-btn px-5 py-2 text-sm">
          {pending ? "붓을 놀리는 중…" : "댓글 남기기"}
        </button>
      </div>
    </form>
  );
}
