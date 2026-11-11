import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // next/image로 외부 사진을 쓰려면 허용 주소를 적어야 한다 (아무 사이트 사진이나 최적화하는 것 방지)
    // → 우리 Supabase Storage의 판매글 사진 버킷만 허용
    remotePatterns: [
      new URL(
        "https://ljfgbhptxymixjkqlero.supabase.co/storage/v1/object/public/goguma-post-images/**",
      ),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
