"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
  // 실패 시 입력값을 다시 채워주기 위함 (비밀번호는 제외)
  values?: Record<string, string>;
};

// Supabase 영문 에러 → 한국어 안내
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed")) return "이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인해 주세요.";
  if (m.includes("user already registered")) return "이미 가입된 이메일입니다.";
  if (m.includes("password should be")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("rate limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (m.includes("invalid") && m.includes("email")) return "올바른 이메일 형식이 아닙니다.";
  if (m.includes("database error")) return "회원 정보를 저장하지 못했습니다. 닉네임이 이미 쓰이고 있을 수 있어요.";
  return message;
}

// 로그인 후 돌아갈 경로: 내부 경로만 허용 (오픈 리다이렉트 방지)
function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const values = { email, nickname, region };

  if (!email || !password || !nickname) {
    return { error: "이메일, 비밀번호, 닉네임은 꼭 적어 주세요.", values };
  }
  if (nickname.length < 2 || nickname.length > 12) {
    return { error: "닉네임은 2~12자로 정해 주세요.", values };
  }
  if (region.length > 30) {
    return { error: "동네 이름은 30자 이내로 적어 주세요.", values };
  }
  if (password.length < 6) {
    return { error: "비밀번호는 6자 이상이어야 합니다.", values };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호 확인이 일치하지 않습니다.", values };
  }

  const supabase = await createClient();

  // 닉네임 중복 확인 (프로필은 공개 조회 가능)
  const { data: taken } = await supabase
    .from("goguma_profiles")
    .select("id")
    .eq("nickname", nickname)
    .maybeSingle();
  if (taken) {
    return { error: "이미 누군가 쓰고 있는 닉네임입니다.", values };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // app: 'goguma' → DB 트리거가 goguma_profiles 행을 만들어 줌
      data: { app: "goguma", nickname, region },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: translateError(error.message), values };
  }

  // 이메일 인증이 꺼져 있으면 바로 세션이 생김 → 홈으로
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  // 이메일 인증이 켜져 있으면 메일 확인 안내
  return {
    message: `${email} 으로 인증 메일을 보냈습니다. 메일의 링크를 누르면 가입이 완료됩니다.`,
  };
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 적어 주세요.", values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateError(error.message), values: { email } };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  // scope: "local" → 지금 이 브라우저만 로그아웃 (기본값 "global"은 다른 기기 세션까지 끊음)
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}
