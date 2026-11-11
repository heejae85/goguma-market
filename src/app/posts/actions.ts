"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DESCRIPTION_MAX,
  POST_STATUSES,
  PRICE_MAX,
  TITLE_MAX,
  TITLE_MIN,
  type PostStatus,
} from "@/lib/posts";

export type PostFormState = {
  error?: string;
  // 실패했을 때 입력한 내용을 다시 채워주기 위함
  values?: Record<string, string>;
};

type ParsedPost =
  | { ok: true; data: { title: string; price: number; description: string; status: PostStatus } }
  | { ok: false; error: string; values: Record<string, string> };

// 실패 시 폼에 다시 채워줄 입력값 (문자열 값만)
function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of ["title", "price", "description", "status"]) {
    values[key] = String(formData.get(key) ?? "");
  }
  return values;
}

// 폼 값 검증: 브라우저 검증(required, maxLength)은 우회할 수 있으므로 서버에서 다시 확인한다
function parsePostForm(formData: FormData): ParsedPost {
  const title = String(formData.get("title") ?? "").trim();
  // "12,000"처럼 쉼표를 넣어도 받아준다
  const priceRaw = String(formData.get("price") ?? "").replace(/[,\s]/g, "");
  const description = String(formData.get("description") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "selling");
  const values = { title, price: priceRaw, description, status: statusRaw };

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, error: `제목은 ${TITLE_MIN}~${TITLE_MAX}자로 적어 주세요.`, values };
  }
  if (!/^\d+$/.test(priceRaw)) {
    return { ok: false, error: "가격은 숫자로 적어 주세요. 나눔이라면 0을 적어 주세요.", values };
  }
  const price = Number(priceRaw);
  if (price > PRICE_MAX) {
    return { ok: false, error: "가격은 1억 원 이하로 적어 주세요.", values };
  }
  if (!description || description.length > DESCRIPTION_MAX) {
    return { ok: false, error: `물건 설명은 1~${DESCRIPTION_MAX}자로 적어 주세요.`, values };
  }
  if (!POST_STATUSES.includes(statusRaw as PostStatus)) {
    return { ok: false, error: "거래 상태가 올바르지 않습니다.", values };
  }

  return { ok: true, data: { title, price, description, status: statusRaw as PostStatus } };
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

/* ── C: 판매글 쓰기 ── */
export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const parsed = parsePostForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };

  const { supabase, user } = await requireUser();
  if (!user) redirect("/login?next=/posts/new");

  // 새 글은 항상 "판매중"으로 시작한다
  const { data, error } = await supabase
    .from("goguma_posts")
    .insert({
      seller_id: user.id,
      title: parsed.data.title,
      price: parsed.data.price,
      description: parsed.data.description,
    })
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
  const parsed = parsePostForm(formData);
  if (!parsed.ok) return { error: parsed.error, values: parsed.values };

  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/posts/${id}/edit`);

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

  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  redirect(`/posts/${id}`);
}

/* ── D: 판매글 내리기 ── */
export async function deletePost(id: number) {
  const { supabase, user } = await requireUser();
  if (!user) redirect(`/login?next=/posts/${id}`);

  await supabase.from("goguma_posts").delete().eq("id", id).eq("seller_id", user.id);

  revalidatePath("/posts");
  redirect("/posts");
}
