// 브라우저에서 사진을 올리기 전에 크기를 줄인다 (휴대폰 사진은 한 장에 몇 MB라서)
// - 긴 쪽을 최대 1600px로 줄이고 WebP로 바꿔 용량을 크게 줄인다
// - GIF는 움직이는 그림이 깨지지 않도록 그대로 둔다
const MAX_SIDE = 1600;

export async function resizeImage(file: File): Promise<{ blob: Blob; ext: string }> {
  if (file.type === "image/gif") return { blob: file, ext: "gif" };

  // createImageBitmap: 사진 파일을 그림 데이터로 읽는다 (휴대폰 사진의 회전 정보도 반영)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  // 아주 오래된 브라우저가 WebP 변환을 못 하면 원본을 그대로 올린다
  if (!blob) return { blob: file, ext: file.type === "image/png" ? "png" : "jpg" };
  return { blob, ext: "webp" };
}
