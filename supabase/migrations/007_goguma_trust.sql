-- 믿을 수 있는 거래: 구매자 지정, 거래 후기(인심 지수), 신고, 차단, 알림
-- Supabase에 이미 적용됨 (migration: goguma_trust)

/* ── 1) 거래완료 시 구매자 ── */
alter table public.goguma_posts
  add column buyer_id uuid references public.goguma_profiles(id) on delete set null,
  add constraint goguma_posts_buyer_not_seller check (buyer_id is null or buyer_id <> seller_id);
create index goguma_posts_buyer_id_idx on public.goguma_posts (buyer_id);

-- 구매자는 "이 글로 나와 채팅한 사람"만 지정할 수 있다
-- (아무나 구매자로 지정해서 거짓 후기를 남기는 것을 DB에서 막는다)
alter policy "users can update own goguma_posts" on public.goguma_posts
  with check (
    (select auth.uid()) = seller_id
    and not exists (
      select 1 from unnest(image_paths) as p
      where p not like (select auth.uid())::text || '/%'
    )
    and (
      buyer_id is null
      or exists (
        select 1 from public.goguma_chat_rooms r
        where r.post_id = goguma_posts.id
          and r.user_a = least(seller_id, buyer_id)
          and r.user_b = greatest(seller_id, buyer_id)
      )
    )
  );

/* ── 2) 차단 ── */
create table public.goguma_blocks (
  blocker_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  blocked_id uuid not null references public.goguma_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index goguma_blocks_blocked_idx on public.goguma_blocks (blocked_id);
alter table public.goguma_blocks enable row level security;

-- 내 차단 목록만 보고, 만들고, 풀 수 있다 (상대는 내가 차단했는지 알 수 없음)
create policy "users manage own blocks select" on public.goguma_blocks
  for select to authenticated using ((select auth.uid()) = blocker_id);
create policy "users manage own blocks insert" on public.goguma_blocks
  for insert to authenticated with check ((select auth.uid()) = blocker_id);
create policy "users manage own blocks delete" on public.goguma_blocks
  for delete to authenticated using ((select auth.uid()) = blocker_id);

-- "나와 이 사람 사이에 (어느 쪽이든) 차단이 있는가"
-- 상대가 나를 차단한 행은 RLS로 안 보이므로 정의자 권한으로 확인한다.
-- 단, 항상 "나(auth.uid())"와의 관계만 물을 수 있게 해서 남들끼리의 차단 여부는 알아낼 수 없게 한다.
create or replace function public.goguma_blocked_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.goguma_blocks
    where (blocker_id = (select auth.uid()) and blocked_id = p_other)
       or (blocker_id = p_other and blocked_id = (select auth.uid()))
  );
$$;
revoke execute on function public.goguma_blocked_with(uuid) from public, anon;
grant execute on function public.goguma_blocked_with(uuid) to authenticated;

-- 채팅: 차단된 사이에는 새 방도, 새 메시지도 안 된다 (기존 정책에 조건 추가)
alter policy "users can create own room" on public.goguma_chat_rooms
  with check (
    (select auth.uid()) in (user_a, user_b)
    and not public.goguma_blocked_with(
      case when user_a = (select auth.uid()) then user_b else user_a end)
  );

alter policy "chat members can send as themselves" on public.goguma_chat_messages
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.goguma_chat_rooms r
      where r.id = room_id
        and (select auth.uid()) in (r.user_a, r.user_b)
        and not public.goguma_blocked_with(
          case when r.user_a = (select auth.uid()) then r.user_b else r.user_a end)
    )
  );

/* ── 3) 거래 후기 ── */
-- rating: 3 최고예요 / 2 좋아요 / 1 아쉬워요  (인심 지수 계산에 씀)
create table public.goguma_reviews (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.goguma_posts(id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  reviewee_id uuid not null references public.goguma_profiles(id) on delete cascade,
  rating smallint not null check (rating in (1, 2, 3)),
  body text not null default '' check (char_length(body) <= 300),
  created_at timestamptz not null default now(),
  unique (post_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);
create index goguma_reviews_reviewee_idx on public.goguma_reviews (reviewee_id, created_at desc);
alter table public.goguma_reviews enable row level security;

create policy "goguma_reviews are viewable by everyone" on public.goguma_reviews
  for select to anon, authenticated using (true);

-- 거래완료된 글의 판매자↔구매자 사이에서만, 상대에게, 내 이름으로
create policy "trade partners can review each other" on public.goguma_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.goguma_posts p
      where p.id = post_id
        and p.status = 'sold'
        and p.buyer_id is not null
        and (
          (p.seller_id = reviewer_id and p.buyer_id = reviewee_id)
          or (p.buyer_id = reviewer_id and p.seller_id = reviewee_id)
        )
    )
  );

create policy "users can delete own reviews" on public.goguma_reviews
  for delete to authenticated using ((select auth.uid()) = reviewer_id);

/* ── 4) 신고 ── */
create table public.goguma_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  post_id bigint references public.goguma_posts(id) on delete set null,
  user_id uuid references public.goguma_profiles(id) on delete set null,
  reason text not null check (reason in ('scam','prohibited','abuse','spam','etc')),
  detail text not null default '' check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  check (post_id is not null or user_id is not null)
);
create index goguma_reports_reporter_idx on public.goguma_reports (reporter_id);
alter table public.goguma_reports enable row level security;

-- 신고는 내 이름으로만 하고, 내가 한 신고만 볼 수 있다 (처리는 관리자가 대시보드에서)
create policy "users can report as themselves" on public.goguma_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);
create policy "users can view own reports" on public.goguma_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);

/* ── 5) 알림 ── */
create table public.goguma_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.goguma_profiles(id) on delete cascade,   -- 받는 사람
  actor_id uuid references public.goguma_profiles(id) on delete cascade,           -- 한 사람
  type text not null check (type in ('comment','like','review','sold')),
  post_id bigint references public.goguma_posts(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 120),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index goguma_notifications_user_idx on public.goguma_notifications (user_id, created_at desc);
alter table public.goguma_notifications enable row level security;

create policy "users read own notifications" on public.goguma_notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users mark own notifications read" on public.goguma_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own notifications" on public.goguma_notifications
  for delete to authenticated using ((select auth.uid()) = user_id);
-- 알림은 트리거만 만든다 (insert 정책 없음) / 고칠 수 있는 칸은 read_at 하나
revoke update on public.goguma_notifications from anon, authenticated;
grant update (read_at) on public.goguma_notifications to authenticated;

-- 알림 만들기 (차단 사이·자기 자신에게는 보내지 않음)
create or replace function public.goguma_notify(
  p_user uuid, p_actor uuid, p_type text, p_post bigint, p_body text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  -- 받는 사람과 한 사람 사이에 차단이 있으면 알리지 않는다 (정의자 권한이라 차단 표를 직접 본다)
  if exists (
    select 1 from public.goguma_blocks
    where (blocker_id = p_user and blocked_id = p_actor) or (blocker_id = p_actor and blocked_id = p_user)
  ) then
    return;
  end if;
  insert into public.goguma_notifications (user_id, actor_id, type, post_id, body)
  values (p_user, p_actor, p_type, p_post, left(coalesce(p_body, ''), 120));
end;
$$;
revoke execute on function public.goguma_notify(uuid, uuid, text, bigint, text) from public, anon, authenticated;

-- 댓글이 달리면 → 판매자에게
create or replace function public.goguma_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.goguma_notify(
    (select seller_id from public.goguma_posts where id = new.post_id),
    new.author_id, 'comment', new.post_id, new.body);
  return new;
end; $$;
revoke execute on function public.goguma_on_comment() from public, anon, authenticated;
create trigger goguma_comments_notify after insert on public.goguma_comments
  for each row execute function public.goguma_on_comment();

-- 좋아요가 눌리면 → 판매자에게
create or replace function public.goguma_on_like()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.goguma_notify(
    (select seller_id from public.goguma_posts where id = new.post_id),
    new.user_id, 'like', new.post_id, '');
  return new;
end; $$;
revoke execute on function public.goguma_on_like() from public, anon, authenticated;
create trigger goguma_likes_notify after insert on public.goguma_post_likes
  for each row execute function public.goguma_on_like();

-- 후기를 받으면 → 받은 사람에게
create or replace function public.goguma_on_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.goguma_notify(new.reviewee_id, new.reviewer_id, 'review', new.post_id, new.body);
  return new;
end; $$;
revoke execute on function public.goguma_on_review() from public, anon, authenticated;
create trigger goguma_reviews_notify after insert on public.goguma_reviews
  for each row execute function public.goguma_on_review();

-- 구매자로 지정되면 → 구매자에게 ("후기를 남겨 주세요")
create or replace function public.goguma_on_sold()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.buyer_id is not null and new.buyer_id is distinct from old.buyer_id then
    perform public.goguma_notify(new.buyer_id, new.seller_id, 'sold', new.id, new.title);
  end if;
  return new;
end; $$;
revoke execute on function public.goguma_on_sold() from public, anon, authenticated;
create trigger goguma_posts_notify_sold after update of buyer_id on public.goguma_posts
  for each row execute function public.goguma_on_sold();
