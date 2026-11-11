"use client";

import { useActionState } from "react";
import { Field, Notice } from "@/components/BookCard";
import { RATINGS, REVIEW_MAX } from "@/lib/trust";
import type { FormState } from "@/app/trust/actions";

// 거래 후기 쓰기: 세 가지 중 하나 + 한마디(선택)
export default function ReviewForm({
  action,
  partnerName,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  partnerName: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <fieldset>
        <legend className="text-sm font-bold text-ink-soft tracking-wider mb-2">
          {partnerName} 님과의 거래, 어땠나요?
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {RATINGS.map(([value, label, icon]) => (
            <label
              key={value}
              className="flex flex-col items-center gap-1 border border-line py-3 cursor-pointer has-[:checked]:border-goguma has-[:checked]:bg-goguma/5"
            >
              <input type="radio" name="rating" value={value} required className="sr-only" />
              <span className="text-xl">{icon}</span>
              <span className="text-sm font-bold">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="한마디 (선택)" hint={`${REVIEW_MAX}자 이내 · 이웃 프로필에 공개돼요`}>
        <textarea
          name="body"
          maxLength={REVIEW_MAX}
          className="ink-input min-h-24 resize-y leading-relaxed"
          placeholder="약속 시간을 잘 지켜 주셨어요. 물건도 설명 그대로였어요."
        />
      </Field>
      <button type="submit" disabled={pending} className="stamp-btn w-full py-3">
        {pending ? "붓을 놀리는 중…" : "후기 남기기"}
      </button>
    </form>
  );
}
