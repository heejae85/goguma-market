-- 고구마마켓 판매글 (사진 기능은 다음 단계에서 추가)
-- Supabase에 이미 적용됨 (migration: goguma_posts)
create table public.goguma_posts (
  id bigint generated always as identity primary key,
  -- 작성자: goguma_profiles를 참조 → 고구마마켓 회원만 글을 쓸 수 있고,
  -- 목록에서 닉네임/동네를 함께(join) 불러올 수 있다
  seller_id uuid not null default auth.uid()
    references public.goguma_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 40),
  -- 0원 = 나눔
  price integer not null check (price between 0 and 100000000),
  description text not null check (char_length(description) between 1 and 2000),
  status text not null default 'selling'
    check (status in ('selling', 'reserved', 'sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 최신순 목록, 내 글 목록 조회용 인덱스
create index goguma_posts_created_at_idx on public.goguma_posts (created_at desc);
create index goguma_posts_seller_id_idx on public.goguma_posts (seller_id);

alter table public.goguma_posts enable row level security;

-- 판매글은 장터에 공개되므로 누구나 조회 가능
create policy "goguma_posts are viewable by everyone"
  on public.goguma_posts for select
  to anon, authenticated
  using (true);

-- 글쓰기: 로그인한 본인 이름으로만
create policy "users can insert own goguma_posts"
  on public.goguma_posts for insert
  to authenticated
  with check ((select auth.uid()) = seller_id);

-- 수정: 본인 글만, 작성자를 다른 사람으로 바꿀 수 없음
create policy "users can update own goguma_posts"
  on public.goguma_posts for update
  to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

-- 삭제: 본인 글만
create policy "users can delete own goguma_posts"
  on public.goguma_posts for delete
  to authenticated
  using ((select auth.uid()) = seller_id);

-- 수정할 때마다 updated_at 자동 갱신
create or replace function public.goguma_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.goguma_set_updated_at() from public, anon, authenticated;

create trigger goguma_posts_set_updated_at
  before update on public.goguma_posts
  for each row execute function public.goguma_set_updated_at();
