"use client";

import { useState } from "react";
import Image from "next/image";
import { imageUrl } from "@/lib/posts";

// 판매글 사진 보기: 큰 사진 한 장 + 아래 작은 사진들을 누르면 큰 사진이 바뀐다
// (누른 사진을 기억해야 하므로 useState를 쓰는 클라이언트 컴포넌트)
export default function PhotoGallery({ paths, title }: { paths: string[]; title: string }) {
  const [current, setCurrent] = useState(0);
  if (paths.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="relative aspect-[4/3] border border-line bg-paper-deep/40">
        <Image
          src={imageUrl(paths[current])}
          alt={`${title} 사진 ${current + 1}`}
          fill
          sizes="(max-width: 672px) 100vw, 560px"
          className="object-contain"
          // 첫 화면에 바로 보이는 큰 사진이므로 미리 불러온다 (Next.js 16: priority → preload)
          preload={current === 0}
        />
        {paths.length > 1 && (
          <span className="absolute right-2 bottom-2 bg-ink/70 text-page text-xs px-2 py-0.5">
            {current + 1} / {paths.length}
          </span>
        )}
      </div>

      {paths.length > 1 && (
        <ul className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {paths.map((p, i) => (
            <li key={p} className="shrink-0">
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`사진 ${i + 1} 보기`}
                className={`relative block w-16 h-16 border ${
                  i === current ? "border-goguma border-2" : "border-line opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={imageUrl(p)} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
