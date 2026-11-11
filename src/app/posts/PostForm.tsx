"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Notice } from "@/components/BookCard";
import type { PostFormState } from "@/app/posts/actions";
import {
  DESCRIPTION_MAX,
  POST_STATUSES,
  PRICE_MAX,
  STATUS_LABEL,
  TITLE_MAX,
  TITLE_MIN,
} from "@/lib/posts";

type Defaults = { title: string; price: string; description: string; status: string };

// 글쓰기·글고치기가 함께 쓰는 폼
// action은 서버 액션(createPost 또는 updatePost.bind(null, id))을 그대로 받는다
export default function PostForm({
  action,
  defaults,
  showStatus = false,
  submitLabel,
  cancelHref,
}: {
  action: (prev: PostFormState, formData: FormData) => Promise<PostFormState>;
  defaults?: Defaults;
  showStatus?: boolean;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(action, {});
  // 실패 후에는 방금 입력한 값, 처음에는 기존 글 값
  const v = state.values ?? defaults;

  return (
    // key: 실패해서 values가 바뀌면 폼을 새로 그려 defaultValue가 반영되게 한다
    <form key={JSON.stringify(state.values ?? null)} action={formAction} className="space-y-6">
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field label="제목" hint={`${TITLE_MIN}~${TITLE_MAX}자`}>
        <input
          className="ink-input"
          type="text"
          name="title"
          minLength={TITLE_MIN}
          maxLength={TITLE_MAX}
          placeholder="예) 손때 묻은 옛 국어사전"
          defaultValue={v?.title}
          required
        />
      </Field>

      <Field label="가격 (원)" hint="나눔이라면 0을 적어 주세요.">
        <input
          className="ink-input"
          type="number"
          name="price"
          min={0}
          max={PRICE_MAX}
          step={1}
          inputMode="numeric"
          placeholder="5000"
          defaultValue={v?.price}
          required
        />
      </Field>

      {showStatus && (
        <Field label="거래 상태">
          <select className="ink-input" name="status" defaultValue={v?.status ?? "selling"}>
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="물건 이야기" hint={`${DESCRIPTION_MAX}자 이내 · 상태, 거래 장소 등을 적어 주세요.`}>
        <textarea
          className="ink-input min-h-48 leading-relaxed resize-y"
          name="description"
          maxLength={DESCRIPTION_MAX}
          placeholder="언제 샀는지, 얼마나 썼는지, 어디서 만나면 좋을지…"
          defaultValue={v?.description}
          required
        />
      </Field>

      <div className="flex gap-3">
        <Link href={cancelHref} className="ghost-btn flex-1 py-3 text-center">
          그만두기
        </Link>
        <button type="submit" disabled={pending} className="stamp-btn flex-[2] py-3 text-lg">
          {pending ? "먹을 가는 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
