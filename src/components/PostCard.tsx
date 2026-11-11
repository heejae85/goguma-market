import Image from "next/image";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { countOf, formatDate, formatPrice, imageUrl, type Post } from "@/lib/posts";

// 판매글 카드 한 장 (장터 목록, 프로필의 글 모아보기에서 함께 쓴다)
export default function PostCard({ post, showSeller = true }: { post: Post; showSeller?: boolean }) {
  const likes = countOf(post.likes);
  const comments = countOf(post.comments);

  return (
    <Link
      href={`/posts/${post.id}`}
      className={`book-page block h-full px-7 py-7 hover:-translate-y-0.5 transition-transform ${
        post.status === "sold" ? "opacity-60" : ""
      }`}
    >
      {/* 대표 사진(첫 장). 사진이 없으면 책 장식으로 자리를 채운다 */}
      <div className="relative aspect-[4/3] mb-4 border border-line bg-paper-deep/40 overflow-hidden">
        {post.image_paths.length > 0 ? (
          <>
            <Image
              src={imageUrl(post.image_paths[0])}
              alt={post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
              className="object-cover sepia-[.15]"
            />
            {post.image_paths.length > 1 && (
              <span className="absolute right-1.5 bottom-1.5 bg-ink/70 text-page text-[11px] px-1.5">
                ❐ {post.image_paths.length}
              </span>
            )}
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl text-line">❦</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <StatusBadge status={post.status} />
        <span className="text-ink-soft">{formatDate(post.created_at)}</span>
      </div>
      <h2 className="font-title text-lg font-bold mt-3 line-clamp-2">{post.title}</h2>
      <p className="text-goguma font-bold mt-2">{formatPrice(post.price)}</p>
      <div className="flex items-center justify-between gap-2 text-xs text-ink-soft mt-3 border-t border-line/60 pt-2">
        <span className="truncate">
          {showSeller && (
            <>
              {post.seller?.nickname ?? "이름 모를 이웃"}
              {post.seller?.region && ` · ${post.seller.region}`}
            </>
          )}
        </span>
        <span className="shrink-0 tracking-wider">
          ♥ {likes} · ✎ {comments}
        </span>
      </div>
    </Link>
  );
}
