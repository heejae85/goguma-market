"use client";

import { useActionState } from "react";
import type { BumpState } from "@/app/posts/actions";

// 끌어올리기 버튼: 결과(성공/몇 시간 뒤 가능)를 버튼 아래에 바로 보여준다
export default function BumpButton({ action }: { action: (prev: BumpState) => Promise<BumpState> }) {
  const [state, formAction, pending] = useActionState<BumpState>(action, {});
  return (
    <form action={formAction} className="text-center">
      <button type="submit" disabled={pending} className="ghost-btn px-5 py-2 text-sm">
        {pending ? "끌어올리는 중…" : "⇡ 끌어올리기"}
      </button>
      {state.ok && <p className="text-xs text-sepia mt-1">목록 맨 위로 올렸어요!</p>}
      {state.error && <p className="text-xs text-goguma mt-1">{state.error}</p>}
      {!state.ok && !state.error && (
        <p className="text-[11px] text-ink-soft mt-1">하루에 한 번, 내 글을 장터 목록 맨 위로 올려요.</p>
      )}
    </form>
  );
}
