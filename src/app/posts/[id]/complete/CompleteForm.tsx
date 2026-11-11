"use client";

import { useActionState } from "react";
import Avatar from "@/components/Avatar";
import { Notice } from "@/components/BookCard";
import type { FormState } from "@/app/trust/actions";

type Partner = { id: string; nickname: string; avatar_path: string | null };

// 거래완료: 이 글로 채팅한 이웃 중에서 구매자를 고른다
export default function CompleteForm({
  action,
  partners,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  partners: Partner[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-ink-soft tracking-wider mb-2">누구에게 팔았나요?</legend>
        {partners.map((p, i) => (
          <label
            key={p.id}
            className="flex items-center gap-3 border border-line px-3 py-2 cursor-pointer has-[:checked]:border-goguma has-[:checked]:bg-goguma/5"
          >
            <input type="radio" name="buyer_id" value={p.id} defaultChecked={i === 0} className="accent-goguma" />
            <Avatar path={p.avatar_path} nickname={p.nickname} size={32} />
            <span className="font-bold">{p.nickname}</span>
          </label>
        ))}
      </fieldset>
      <button type="submit" disabled={pending} className="stamp-btn w-full py-3">
        {pending ? "장부에 적는 중…" : "거래완료로 바꾸기"}
      </button>
    </form>
  );
}
