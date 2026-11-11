"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DESCRIPTION_MAX,
  IMAGE_BUCKET,
  IMAGE_MAX_COUNT,
  POST_STATUSES,
  PRICE_MAX,
  TITLE_MAX,
  TITLE_MIN,
  BUMP_INTERVAL_MS,
  isCategory,
  isOwnImagePath,
  type Category,
  type PostStatus,
} from "@/lib/posts";

export type PostFormState = {
  error?: string;
  // 실패했을 때 입력한 내용을 다시 채워주기 위함 (image_paths는 줄바꿈으로 이어 붙임)
  values?: Record<string, string>;
};

type PostData = {
  title: string;
  price: number;
  description: string;
  status: PostStatus;
  image_paths: string[];
  category: Category;
};

type ParsedPost = { ok: true; data: PostData } | { ok: false; error: string };

// 실패 시 폼에 다시 채워줄 입력값 (문자열 값만)
function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of ["title", "price", "description", "status", "category"]) {
    values[key] = String(formData.get(key) ?? "");
  }
  values.image_paths = formData.getAll("image_paths").map(String).join("\n");
  return values;
}

// 폼 값 검증: 브라우저 검증(required, maxLength)은 우회할 수 있으므로 서버에서 다시 확인한다
function parsePostForm(formData: FormData, userId: string): ParsedPost {
  const title = String(formData.get("title") ?? "").trim();
  // "12,000"처럼 쉼표를 넣어도 받아준다
  const priceRaw = String(formData.get("price") ?? "").replace(/[,\s]/g, "");
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "selling");
  const categoryRaw = String(formData.get("category") ?? "");
  // 같은 이름(image_paths)의 hidden input이 여러 개 → getAll로 순서대로 받는다
  const imagePaths = formData.getAll("image_paths").map(String);

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, error: `제목은 ${TITLE_MIN}~${TITLE_MAX}자로 적어 주세요.` };
  }
  if (!/^\d+$/.test(priceRaw)) {
    return { ok: false, error: "가격은 숫자로 적어 주세요. 나눔이라면 0을 적어 주세요." };
  }
  const price = Number(priceRaw);
  if (price > PRICE_MAX) {
    return { ok: false, error: "가격은 1억 원 이하로 적어 주세요." };
  }
  if (!description || description.length > DESCRIPTION_MAX) {
    return { ok: false, error: `물건 설명은 1~${DESCRIPTION_MAX}자로 적어 주세요.` };
  }
  if (!POST_STATUSES.includes(statusRaw as PostStatus)) {
    return { ok: false, error: "거래 상태가 올바르지 않습니다." };
  }
  if (!isCategory(categoryRaw)) {
    return { ok: false, error: "물건 종류(카테고리)를 골라 주세요." };
  }
  if (imagePaths.length > IMAGE_MAX_COUNT) {
    return { ok: false, error: `사진은 최대 ${IMAGE_MAX_COUNT}장까지 올릴 수 있어요.` };
  }
  // 남의 사진 경로를 끼워 넣지 못하게: 모두 "내 폴더" 안의 경로여야 한다 (DB 정책도 한 번 더 막음)
  if (imagePaths.some((p) => !isOwnImagePath(p, userId)) || new Set(imagePaths).size !== imagePaths.length) {
    return { ok: false, error: "사진 정보가 올바르지 않습니다. 사진을 다시 올려 주세요." };
  }

  return {
    ok: true,
    data: {
      title,
      price,
      description,
      status: statusRaw as PostStatus,
      image_paths: imagePaths,
      category: categoryRaw,
    },
  };
}

// 서버 액션은 누구나 직접 호출할 수 있는 공개 엔드포인트라서,
// 페이지에서 막았더라도 액션 안에서 로그인 여부를 꼭 다시 확인한다
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// 더 이상 어느 글에도 안 쓰이는 사진 파일을 Storage에서 지운다
// (실패해도 글 저장 자체는 이미 끝났으므로 사용자에게 에러를 내지 않는다)
async function removeImages(supabase: Supabase, paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage.from(IMAGE_BUCKET).remove(paths);
}

/* ── C: 판매글 쓰기 ── */
export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/posts/new");

  const parsed = parsePostForm(formData, user.id);
  if (!parsed.ok) return { error: parsed.error, values: formValues(formData) };

  // 새 글은 항상 "판매중"으로 시작한다
  const { title, price, description, image_paths, category } = parsed.data;
  const { data, error } = await supabase
    .from("goguma_posts")
    .insert({ seller_id: user.id, title, price, description, image_paths, category })
    .select("id")
    .single();

  if (error || !data) {
    // 외래키 오류: 가계부 쪽으로 가입해서 고구마마켓 프로필이 없는 계정
    const message =
      error?.code === "23503"
        ? "고구마마켓 회원 정보가 없어 글을 올릴 수 없습니다."
        : "판매글을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return { error: message, values: formValues(formData) };
  }

  // 목록 화면이 새 글을 보여주도록 갱신
  revalidatePath("/posts");
  redirect(`/posts/${data.id}`);
}

/* ── U: 판매글 고치기 ── */
// id는 페이지에서 updatePost.bind(null, id)로 묶어서 넘긴다
export async function updatePost(
  id: number,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/posts/${id}/edit`);

  const parsed = parsePostForm(formData, user.id);
  if (!parsed.ok) return { error: parsed.error, values: formValues(formData) };

  // 고치기 전 사진 목록 (빠진 사진을 Storage에서 지우기 위해)
  const { data: before } = await supabase
    .from("goguma_posts")
    .select("image_paths")
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!before) return { error: "내가 쓴 글만 고칠 수 있습니다." };

  // RLS가 본인 글만 고치게 막아주지만, seller_id 조건을 코드에도 적어 의도를 분명히 한다.
  // 남의 글이면 RLS 때문에 "에러 없이 0행 수정"이 되므로 select로 결과를 확인한다.
  const { data, error } = await supabase
    .from("goguma_posts")
    .update(parsed.data)
    .eq("id", id)
    .eq("seller_id", user.id)
    .select("id");

  if (error) {
    return { error: "판매글을 고치지 못했습니다. 잠시 후 다시 시도해 주세요.", values: formValues(formData) };
  }
  if (!data || data.length === 0) {
    return { error: "내가 쓴 글만 고칠 수 있습니다." };
  }

  // 글이 잘 저장된 뒤에, 빠진 사진 파일을 지운다
  const removed = (before.image_paths as string[]).filter((p) => !parsed.data.image_paths.includes(p));
  await removeImages(supabase, removed);

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

/* ── D: 판매글 내리기 ── */
export async function deletePost(id: number) {
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/posts/${id}`);

  // 지운 글의 사진도 함께 지우기 위해, delete 결과로 사진 목록을 돌려받는다
  const { data } = await supabase
    .from("goguma_posts")
    .delete()
    .eq("id", id)
    .eq("seller_id", user.id)
    .select("image_paths");

  await removeImages(supabase, (data ?? []).flatMap((row) => row.image_paths as string[]));

  revalidatePath("/posts");
  redirect("/posts");
}

/* ── 끌어올리기: 내 글을 목록 맨 위로 (하루에 한 번) ── */
export type BumpState = { error?: string; ok?: boolean };

// useActionState는 "이전 상태"를 두 번째 인자로 넘겨주므로 자리만 받아 둔다(쓰지는 않음)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function bumpPost(id: number, _prev: BumpState): Promise<BumpState> {
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/posts/${id}`);

  const { data: post } = await supabase
    .from("goguma_posts")
    .select("bumped_at, status")
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!post) return { error: "내가 쓴 글만 끌어올릴 수 있어요." };
  if (post.status === "sold") return { error: "거래완료된 물건은 끌어올릴 수 없어요." };

  // 너무 자주 끌어올리면 목록이 한 사람 글로 덮이므로 하루에 한 번만
  const waited = Date.now() - new Date(post.bumped_at).getTime();
  if (waited < BUMP_INTERVAL_MS) {
    const hours = Math.ceil((BUMP_INTERVAL_MS - waited) / (60 * 60 * 1000));
    return { error: `${hours}시간 뒤에 다시 끌어올릴 수 있어요.` };
  }

  // bumped_at만 바뀌므로 트리거가 updated_at을 건드리지 않는다 → "(고침)"이 붙지 않음
  const { error } = await supabase
    .from("goguma_posts")
    .update({ bumped_at: new Date().toISOString() })
    .eq("id", id)
    .eq("seller_id", user.id);
  if (error) return { error: "끌어올리지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  return { ok: true };
}
