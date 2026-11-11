"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { setLike } from "./interactions";

// 좋아요 버튼
// useOptimistic: 서버 응답을 기다리지 않고 화면부터 바로 바꾼다 (실패하면 원래 값으로 돌아감)
export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
  loggedIn,
}: {
  postId: number;
  initialLiked: boolean;
  initialCount: number;
  loggedIn: boolean;
}) {
  const [state, setState] = useState({ liked: initialLiked, count: initialCount });
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (!loggedIn) {
    return (
      <Link
        href={`/login?next=/posts/${postId}`}
        className="ghost-btn inline-flex items-center gap-2 px-4 py-2"
        title="로그인하면 좋아요를 누를 수 있어요"
      >
        ♡ <span>{initialCount}</span>
      </Link>
    );
  }

  function toggle() {
    const next = { liked: !optimistic.liked, count: optimistic.count + (optimistic.liked ? -1 : 1) };
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const res = await setLike(postId, next.liked);
      if (res.error) setError(res.error);
      else setState(next);
    });
  }

  return (
    <div className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optimistic.liked}
        className={`inline-flex items-center gap-2 px-4 py-2 border transition-colors ${
          optimistic.liked
            ? "bg-goguma text-page border-goguma-deep"
            : "border-goguma text-goguma hover:bg-goguma/10"
        }`}
      >
        <span className="text-lg leading-none">{optimistic.liked ? "♥" : "♡"}</span>
        <span>좋아요 {optimistic.count}</span>
      </button>
      {error && <span className="text-xs text-goguma mt-1">{error}</span>}
    </div>
  );
}
