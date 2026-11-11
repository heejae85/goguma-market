// 판매글에서 여러 화면이 같이 쓰는 타입·상수·도우미 함수

export type PostStatus = "selling" | "reserved" | "sold";

// DB의 check 제약(status in ...)과 같은 값만 허용한다
export const POST_STATUSES: PostStatus[] = ["selling", "reserved", "sold"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  selling: "판매중",
  reserved: "예약중",
  sold: "거래완료",
};

// DB 제약과 같은 한도 (폼 maxLength, 서버 검증에서 함께 사용)
export const TITLE_MIN = 2;
export const TITLE_MAX = 40;
export const DESCRIPTION_MAX = 2000;
export const PRICE_MAX = 100_000_000;

/* ── 사진 ── */
// Storage 버킷 이름과 한도 (DB check 제약·버킷 설정과 같은 값)
export const IMAGE_BUCKET = "goguma-post-images";
export const IMAGE_MAX_COUNT = 10;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Storage 안의 경로 → 누구나 볼 수 있는 공개 URL (공개 버킷)
export function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

// 사진 경로가 "내 폴더/임의이름.확장자" 모양인지 확인 (남의 사진 경로를 끼워 넣는 것 방지)
export function isOwnImagePath(path: string, userId: string): boolean {
  const re = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(webp|jpg|png|gif)$`);
  return re.test(path);
}

export type Post = {
  id: number;
  seller_id: string;
  title: string;
  price: number;
  description: string;
  status: PostStatus;
  // 사진 경로 목록 (첫 장이 대표 사진)
  image_paths: string[];
  created_at: string;
  updated_at: string;
  // goguma_profiles를 외래키로 함께 불러온 값 (작성자 정보)
  seller: { nickname: string; region: string } | null;
};

// 판매글을 불러올 때 쓰는 select 문
// "seller:goguma_profiles(...)" → seller_id 외래키를 따라 작성자 닉네임/동네를 join해서 seller라는 이름으로 받는다
export const POST_SELECT =
  "id, seller_id, title, price, description, status, image_paths, created_at, updated_at, seller:goguma_profiles(nickname, region)";

export function formatPrice(price: number): string {
  return price === 0 ? "나눔 🍠" : `${price.toLocaleString("ko-KR")}원`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// URL의 [id]는 문자열이므로, 숫자 id인지 확인한 뒤 변환한다 (잘못된 값이면 null)
export function parsePostId(raw: string): number | null {
  return /^\d{1,15}$/.test(raw) ? Number(raw) : null;
}
