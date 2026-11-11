import Image from "next/image";

// 옛 그림 액자: 김홍도 「단원풍속도첩」 (18세기, 퍼블릭 도메인 — Wikimedia Commons)
// public/images/old/ 에 내려받아 둔 그림을 쓴다 (우리 서버에서 바로 나가므로 remotePatterns 불필요)
const PAINTINGS = {
  haengsang: { src: "/images/old/haengsang.jpg", title: "행상(行商)", w: 960, h: 1109 },
  ssireum: { src: "/images/old/ssireum.jpg", title: "씨름", w: 960, h: 1156 },
  seodang: { src: "/images/old/seodang.jpg", title: "서당(書堂)", w: 606, h: 705 },
} as const;

export type PaintingName = keyof typeof PAINTINGS;

export default function OldPainting({
  name,
  className = "",
  sizes = "240px",
}: {
  name: PaintingName;
  className?: string;
  sizes?: string;
}) {
  const p = PAINTINGS[name];
  return (
    <figure className={`old-painting ${className}`}>
      <Image src={p.src} alt={`김홍도 ${p.title}`} width={p.w} height={p.h} sizes={sizes} className="w-full h-auto" />
      <figcaption className="text-center text-[11px] text-ink-soft mt-1.5 tracking-wider">
        〈{p.title}〉 김홍도 · 18세기
      </figcaption>
    </figure>
  );
}
