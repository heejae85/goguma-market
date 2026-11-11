import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OldPainting from "@/components/OldPainting";
import PostCard from "@/components/PostCard";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  POST_SELECT,
  SORTS,
  isCategory,
  type Post,
  type SortKey,
} from "@/lib/posts";

export const metadata = { title: "장터 구경 · 고구마마켓" };

const PAGE_SIZE = 24;

/* ── R: 판매글 목록 (검색·카테고리·정렬·필터·쪽 나누기) ── */
// 조건은 모두 주소(?q=...&cat=...)에 담는다 → 새로고침·공유해도 같은 결과, 자바스크립트 없이도 동작
export default function PostsPage({ searchParams }: PageProps<"/posts">) {
  return (
    <section className="space-y-8">
      {/* 제목 부분은 정적이라 Suspense 밖 → 빌드 때 미리 그려진다 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
        <OldPainting name="haengsang" className="w-36 sm:w-44 -rotate-2" sizes="176px" />
        <div className="text-center">
          <p className="text-xs tracking-[0.4em] text-sepia">第 三 章</p>
          <h1 className="font-title text-3xl sm:text-4xl font-extrabold mt-2">장터 구경</h1>
          <p className="text-sm text-ink-soft italic mt-2">
            봇짐 지고 장에 나온 이웃들의 물건을 둘러보세요
          </p>
          <div className="mt-6">
            <Link href="/posts/new" className="stamp-btn inline-block px-6 py-2.5">
              ✎ 판매글 쓰기
            </Link>
          </div>
        </div>
      </div>

      {/* searchParams는 요청 시점 데이터 → Suspense 안에서 읽는다 */}
      <Suspense fallback={<p className="text-center text-ink-soft italic">장터 좌판을 펴는 중…</p>}>
        <Market searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

type Filters = {
  q: string;
  cat: string;
  sort: SortKey;
  onsale: boolean;
  near: boolean;
  page: number;
};

// 주소의 값은 사용자가 마음대로 바꿀 수 있으므로 하나하나 확인해서 받는다
function readFilters(params: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const sort = one("sort");
  const page = Number(one("page"));
  return {
    q: one("q").trim().slice(0, 40),
    cat: isCategory(one("cat")) ? one("cat") : "",
    sort: SORTS.some(([k]) => k === sort) ? (sort as SortKey) : "recent",
    onsale: one("onsale") === "1",
    near: one("near") === "1",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

// 현재 조건에서 일부만 바꾼 주소 만들기 (카테고리 칩, 쪽 번호 링크용)
function hrefWith(f: Filters, change: Partial<Filters>): string {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.cat) sp.set("cat", next.cat);
  if (next.sort !== "recent") sp.set("sort", next.sort);
  if (next.onsale) sp.set("onsale", "1");
  if (next.near) sp.set("near", "1");
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `/posts?${s}` : "/posts";
}

async function Market({ searchParams }: { searchParams: PageProps<"/posts">["searchParams"] }) {
  const f = readFilters(await searchParams);
  const supabase = await createClient();

  // "우리 동네만": 로그인한 사람의 동네를 알아야 한다
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let myRegion = "";
  let blockedIds: string[] = [];
  if (user) {
    const [{ data }, { data: blocks }] = await Promise.all([
      supabase.from("goguma_profiles").select("region").eq("id", user.id).maybeSingle(),
      // 내가 차단한 이웃의 글은 목록에서 뺀다
      supabase.from("goguma_blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    myRegion = data?.region ?? "";
    blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  }
  const nearOn = f.near && !!myRegion;

  // 동네로 거를 때는 판매자 join을 !inner로 바꾼다 → 조건에 맞는 판매자의 글만 남는다
  const select = nearOn
    ? POST_SELECT.replace("goguma_posts_seller_id_fkey(", "goguma_posts_seller_id_fkey!inner(")
    : POST_SELECT;

  let query = supabase.from("goguma_posts").select(select, { count: "exact" });

  if (f.q) {
    // 검색어 안의 , ( ) % * \ 는 필터 문법과 섞이므로 빼고, 제목·설명에서 찾는다
    const safe = f.q.replace(/[,()%*\\]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (f.cat) query = query.eq("category", f.cat);
  if (f.onsale) query = query.neq("status", "sold");
  if (nearOn) query = query.eq("seller.region", myRegion);
  // uuid만 들어 있으므로 목록 문법 (a,b,c)에 그대로 넣어도 안전하다
  if (blockedIds.length) query = query.not("seller_id", "in", `(${blockedIds.join(",")})`);

  query =
    f.sort === "price_asc"
      ? query.order("price", { ascending: true }).order("bumped_at", { ascending: false })
      : f.sort === "price_desc"
        ? query.order("price", { ascending: false }).order("bumped_at", { ascending: false })
        : f.sort === "views"
          ? query.order("view_count", { ascending: false }).order("bumped_at", { ascending: false })
          : query.order("bumped_at", { ascending: false });

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);

  const posts = (data ?? []) as unknown as Post[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      {/* 검색·정렬·필터 (GET 폼: 누르면 주소에 조건이 붙는다) */}
      <form action="/posts" className="book-page px-6 sm:px-10 py-6 space-y-4">
        {f.cat && <input type="hidden" name="cat" value={f.cat} />}
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={f.q}
            maxLength={40}
            placeholder="찾는 물건을 적어 보세요 (예: 타자기)"
            className="ink-input flex-1"
          />
          <button type="submit" className="stamp-btn px-5 shrink-0">
            찾기
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-ink-soft">정렬</span>
            <select name="sort" defaultValue={f.sort} className="ink-input w-auto py-1">
              {SORTS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="onsale" value="1" defaultChecked={f.onsale} className="accent-goguma" />
            거래완료 빼고 보기
          </label>
          {myRegion ? (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" name="near" value="1" defaultChecked={f.near} className="accent-goguma" />
              우리 동네({myRegion})만
            </label>
          ) : user ? (
            <Link href="/mypage/profile" className="text-ink-soft underline underline-offset-2">
              동네를 정하면 우리 동네만 볼 수 있어요
            </Link>
          ) : null}
        </div>
      </form>

      {/* 카테고리 칩 */}
      <nav className="flex flex-wrap justify-center gap-2 text-sm" aria-label="카테고리">
        <Link
          href={hrefWith(f, { cat: "" })}
          className={`px-3 py-1 border ${!f.cat ? "bg-goguma text-page border-goguma-deep" : "border-line text-ink hover:border-goguma"}`}
        >
          전체
        </Link>
        {CATEGORIES.map(([k, label]) => (
          <Link
            key={k}
            href={hrefWith(f, { cat: k })}
            className={`px-3 py-1 border ${f.cat === k ? "bg-goguma text-page border-goguma-deep" : "border-line text-ink hover:border-goguma"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <p className="text-center text-sm text-ink-soft">
        {f.q && <>“{f.q}” </>}
        {f.cat && <>{CATEGORY_LABEL[f.cat as keyof typeof CATEGORY_LABEL]} </>}
        물건 <span className="font-bold text-ink">{total}</span>개
      </p>

      {error ? (
        <p className="text-center text-goguma">장터 목록을 불러오지 못했습니다.</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <p className="text-ink-soft italic">조건에 맞는 물건이 없어요.</p>
          {(f.q || f.cat || f.onsale || f.near) && (
            <Link href="/posts" className="ghost-btn inline-block px-5 py-2 text-sm">
              조건 지우고 전체 보기
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {/* 쪽 번호 */}
      {pages > 1 && (
        <nav className="flex justify-center items-center gap-1 text-sm" aria-label="쪽 넘기기">
          {f.page > 1 && (
            <Link href={hrefWith(f, { page: f.page - 1 })} className="px-3 py-1 text-sepia">
              ← 앞 장
            </Link>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => Math.abs(n - f.page) <= 2 || n === 1 || n === pages)
            .map((n, i, arr) => (
              <span key={n} className="flex items-center">
                {i > 0 && n - arr[i - 1] > 1 && <span className="px-1 text-ink-soft">…</span>}
                <Link
                  href={hrefWith(f, { page: n })}
                  aria-current={n === f.page ? "page" : undefined}
                  className={`min-w-8 px-2 py-1 text-center border ${
                    n === f.page ? "bg-goguma text-page border-goguma-deep" : "border-line hover:border-goguma"
                  }`}
                >
                  {n}
                </Link>
              </span>
            ))}
          {f.page < pages && (
            <Link href={hrefWith(f, { page: f.page + 1 })} className="px-3 py-1 text-sepia">
              뒷 장 →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
