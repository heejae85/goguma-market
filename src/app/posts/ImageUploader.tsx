"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resizeImage";
import { IMAGE_BUCKET, IMAGE_MAX_BYTES, IMAGE_MAX_COUNT, imageUrl } from "@/lib/posts";

// 사진 여러 장 올리기
// 1) 사진을 고르면 → 브라우저에서 크기를 줄여 → Storage "내 폴더"에 바로 올린다
// 2) 올라간 사진의 경로만 hidden input(name="image_paths")에 담아 폼과 함께 서버 액션으로 보낸다
export default function ImageUploader({
  userId,
  initialPaths,
  savedPaths,
  onBusyChange,
}: {
  userId: string;
  // 폼에 처음 보여줄 사진들 (고치기: 기존 사진 / 저장 실패 후: 방금 고른 사진)
  initialPaths: string[];
  // DB에 이미 저장된 사진들 → 이것들은 "저장" 전까지 Storage에서 지우지 않는다
  savedPaths: string[];
  onBusyChange: (busy: boolean) => void;
}) {
  const [paths, setPaths] = useState<string[]>(initialPaths);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = IMAGE_MAX_COUNT - paths.length;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(undefined);

    const files = Array.from(fileList);
    if (files.length > remaining) {
      setError(`사진은 최대 ${IMAGE_MAX_COUNT}장까지 올릴 수 있어요. 앞의 ${remaining}장만 올릴게요.`);
    }
    const picked = files.slice(0, Math.max(0, remaining));

    setUploading(picked.length);
    onBusyChange(true);
    const supabase = createClient();

    // 여러 장을 동시에 올린다 (Promise.all)
    const results = await Promise.all(
      picked.map(async (file) => {
        if (!file.type.startsWith("image/")) return { error: `${file.name}: 사진 파일이 아니에요.` };
        try {
          const { blob, ext } = await resizeImage(file);
          if (blob.size > IMAGE_MAX_BYTES) return { error: `${file.name}: 5MB가 넘어요.` };

          // 경로 첫 폴더 = 내 아이디 → Storage 정책이 "내 폴더에만 올리기"를 확인한다
          const path = `${userId}/${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
            contentType: blob.type || `image/${ext}`,
            cacheControl: "31536000", // 같은 경로의 사진은 바뀌지 않으므로 오래 캐시
          });
          if (error) return { error: `${file.name}: 올리지 못했어요.` };
          return { path };
        } catch {
          return { error: `${file.name}: 사진을 읽지 못했어요.` };
        }
      }),
    );

    const uploaded = results.flatMap((r) => ("path" in r && r.path ? [r.path] : []));
    const errors = results.flatMap((r) => ("error" in r && r.error ? [r.error] : []));
    setPaths((prev) => [...prev, ...uploaded]);
    if (errors.length) setError(errors.join(" "));
    setUploading(0);
    onBusyChange(false);
    // 같은 파일을 다시 고를 수 있도록 입력칸 비우기
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(path: string) {
    setPaths((prev) => prev.filter((p) => p !== path));
    // 이번에 새로 올린 사진은 아직 어느 글에도 안 쓰이므로 바로 지운다.
    // 이미 저장된 사진은 "저장"을 눌러야 서버에서 지운다 (그만두기 하면 그대로 남도록)
    if (!savedPaths.includes(path)) {
      await createClient().storage.from(IMAGE_BUCKET).remove([path]);
    }
  }

  function makeCover(path: string) {
    setPaths((prev) => [path, ...prev.filter((p) => p !== path)]);
  }

  return (
    <div>
      <span className="text-sm font-bold text-ink-soft tracking-wider">
        사진 ({paths.length}/{IMAGE_MAX_COUNT})
      </span>

      {/* 서버 액션으로 보낼 사진 경로들 (순서 = 보여줄 순서) */}
      {paths.map((p) => (
        <input key={p} type="hidden" name="image_paths" value={p} />
      ))}

      <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
        {paths.map((p, i) => (
          <li key={p} className="relative aspect-square border border-line bg-paper-deep/40">
            <Image src={imageUrl(p)} alt={`사진 ${i + 1}`} fill sizes="120px" className="object-cover" />
            {i === 0 && (
              <span className="absolute left-0 top-0 bg-goguma text-page text-[10px] px-1.5 py-0.5 tracking-widest">
                대표
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex text-[11px]">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => makeCover(p)}
                  className="flex-1 bg-page/90 text-sepia py-0.5 hover:bg-page"
                >
                  대표로
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(p)}
                className="flex-1 bg-page/90 text-goguma py-0.5 hover:bg-page"
              >
                빼기
              </button>
            </div>
          </li>
        ))}

        {uploading > 0 &&
          Array.from({ length: uploading }).map((_, i) => (
            <li
              key={`up-${i}`}
              className="aspect-square border border-dashed border-line flex items-center justify-center text-xs text-ink-soft italic"
            >
              올리는 중…
            </li>
          ))}

        {remaining > 0 && uploading === 0 && (
          <li className="aspect-square">
            <label className="h-full border border-dashed border-sepia text-sepia flex flex-col items-center justify-center cursor-pointer hover:bg-paper-deep/40">
              <span className="text-2xl leading-none">＋</span>
              <span className="text-xs mt-1">사진 더하기</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </li>
        )}
      </ul>

      <span className="block text-xs text-ink-soft/80 mt-1">
        여러 장을 한꺼번에 고를 수 있어요. 첫 번째 사진이 목록에 보이는 대표 사진이 돼요.
      </span>
      {error && <p className="text-xs text-goguma mt-1">{error}</p>}
    </div>
  );
}
