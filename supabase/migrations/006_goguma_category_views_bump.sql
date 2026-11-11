-- 카테고리, 조회수, 끌어올리기
-- Supabase에 이미 적용됨 (migration: goguma_category_views_bump)

/* ── 1) 판매글에 칸 추가 ── */
alter table public.goguma_posts
  -- 물건 종류 (화면의 목록과 같은 값만 허용)
  add column category text not null default 'etc'
    check (category in ('digital','furniture','kitchen','fashion','books','hobby','sports','kids','plants','etc')),
  -- 조회수
  add column view_count integer not null default 0 check (view_count >= 0),
  -- 끌어올린 시각: 목록 "최신순"은 이 값으로 정렬한다 (처음엔 올린 시각과 같음)
  add column bumped_at timestamptz not null default now();

create index goguma_posts_bumped_at_idx on public.goguma_posts (bumped_at desc);
create index goguma_posts_category_idx on public.goguma_posts (category, bumped_at desc);

/* ── 2) "(고침)" 표시가 진짜 내용이 바뀔 때만 붙도록 ── */
-- 조회수가 오르거나 끌어올리기만 해도 updated_at이 바뀌어 "(고침)"이 붙던 문제 수정
create or replace function public.goguma_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.title, new.price, new.description, new.status, new.image_paths, new.category)
     is distinct from
     (old.title, old.price, old.description, old.status, old.image_paths, old.category) then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- 기존 글은 "끌어올린 시각 = 올린 시각"으로 맞춘다 (위 트리거 수정 뒤라 "(고침)"이 붙지 않음)
update public.goguma_posts set bumped_at = created_at;

/* ── 3) 조회수 올리기 ── */
-- 남의 글은 update 정책상 고칠 수 없으므로, "조회수 +1"만 하는 함수를 정의자 권한으로 만든다.
-- 로그인 안 한 사람(anon)도 글을 보므로 anon에게도 실행을 허락한다 (의도된 공개 함수).
create or replace function public.goguma_increment_view(p_post_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.goguma_posts set view_count = view_count + 1 where id = p_post_id;
$$;
revoke execute on function public.goguma_increment_view(bigint) from public;
grant execute on function public.goguma_increment_view(bigint) to anon, authenticated;
