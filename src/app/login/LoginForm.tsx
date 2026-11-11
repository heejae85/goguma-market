"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/auth/actions";
import { Field, Notice } from "@/components/BookCard";

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      {notice && !state.error && <Notice kind="info">{notice}</Notice>}
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field label="이메일">
        <input
          className="ink-input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="goguma@example.com"
          defaultValue={state.values?.email}
          required
        />
      </Field>

      <Field label="비밀번호">
        <input
          className="ink-input"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••"
          required
        />
      </Field>

      <button type="submit" disabled={pending} className="stamp-btn w-full py-3 text-lg">
        {pending ? "책장을 넘기는 중…" : "로그인"}
      </button>
    </form>
  );
}
