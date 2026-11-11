"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Notice } from "@/components/BookCard";
import { REPORT_REASONS } from "@/lib/trust";
import { createReport, type ReportState } from "@/app/trust/actions";

// 신고 폼: 까닭 고르기 + 자세한 내용(선택)
export default function ReportForm({
  postId,
  userId,
  backHref,
}: {
  postId: number | null;
  userId: string | null;
  backHref: string;
}) {
  const [state, formAction, pending] = useActionState<ReportState, FormData>(createReport, {});

  if (state.done) {
    return (
      <div className="text-center space-y-4">
        <Notice kind="info">신고가 접수되었어요. 살펴본 뒤 조치할게요. 고맙습니다.</Notice>
        <Link href={backHref} className="ghost-btn inline-block px-5 py-2">
          돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {postId && <input type="hidden" name="post_id" value={postId} />}
      {userId && <input type="hidden" name="user_id" value={userId} />}
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-ink-soft tracking-wider mb-2">어떤 문제가 있나요?</legend>
        {REPORT_REASONS.map(([k, label]) => (
          <label
            key={k}
            className="flex items-center gap-2 border border-line px-3 py-2 cursor-pointer has-[:checked]:border-goguma has-[:checked]:bg-goguma/5"
          >
            <input type="radio" name="reason" value={k} required className="accent-goguma" />
            {label}
          </label>
        ))}
      </fieldset>
      <Field label="자세한 내용 (선택)" hint="500자 이내 · 신고한 사실은 상대에게 알려지지 않아요">
        <textarea name="detail" maxLength={500} className="ink-input min-h-24 resize-y" />
      </Field>
      <div className="flex gap-3">
        <Link href={backHref} className="ghost-btn flex-1 py-3 text-center">
          그만두기
        </Link>
        <button type="submit" disabled={pending} className="stamp-btn flex-[2] py-3">
          {pending ? "접수하는 중…" : "신고하기"}
        </button>
      </div>
    </form>
  );
}
