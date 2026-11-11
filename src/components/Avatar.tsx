import Image from "next/image";
import { avatarUrl } from "@/lib/posts";

// 동그란 프로필 사진. 사진이 없으면 닉네임 첫 글자를 도장처럼 보여준다
export default function Avatar({
  path,
  nickname,
  size = 40,
}: {
  path: string | null | undefined;
  nickname: string;
  size?: number;
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-paper-deep text-goguma font-title font-bold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {path ? (
        <Image src={avatarUrl(path)} alt={`${nickname} 프로필 사진`} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        nickname.slice(0, 1)
      )}
    </span>
  );
}
