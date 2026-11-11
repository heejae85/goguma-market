"use client";

import { useActionState } from "react";
import { signup, type AuthState } from "@/app/auth/actions";
import { Field, Notice } from "@/components/BookCard";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, {});

  // 인증 메일 발송 완료 화면
  if (state.message) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">✉</p>
        <Notice kind="info">{state.message}</Notice>
        <p className="text-sm text-ink-soft">메일이 보이지 않으면 스팸함도 살펴봐 주세요.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
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

      <Field label="닉네임" hint="2~12자, 거래할 때 이웃에게 보이는 이름이에요.">
        <input
          className="ink-input"
          type="text"
          name="nickname"
          minLength={2}
          maxLength={12}
          placeholder="군고구마장수"
          defaultValue={state.values?.nickname}
          required
        />
      </Field>

      <Field label="우리 동네" hint="선택 사항 · 예) 역삼동">
        <input
          className="ink-input"
          type="text"
          name="region"
          maxLength={30}
          placeholder="역삼동"
          defaultValue={state.values?.region}
        />
      </Field>

      <Field label="비밀번호" hint="6자 이상">
        <input
          className="ink-input"
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={6}
          placeholder="••••••"
          required
        />
      </Field>

      <Field label="비밀번호 확인">
        <input
          className="ink-input"
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          minLength={6}
          placeholder="••••••"
          required
        />
      </Field>

      <button type="submit" disabled={pending} className="stamp-btn w-full py-3 text-lg">
        {pending ? "명부에 적는 중…" : "가입하기"}
      </button>
    </form>
  );
}
