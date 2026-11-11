-- 1:1 채팅 (판매자↔구매자, 접속 중인 이웃과)
-- Supabase에 이미 적용됨 (migration: goguma_chat)

/* ── 1) 채팅방 ── */
-- 두 사람을 항상 (작은 uuid, 큰 uuid) 순서로 저장해서, 같은 두 사람이 방을 두 번 만들지 않게 한다.
-- post_id: 판매글에서 시작한 대화면 그 글, 접속 목록에서 시작한 대화면 null
create table public.goguma_chat_rooms (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.goguma_profiles(id) on delete cascade,
  user_b uuid not null references public.goguma_profiles(id) on delete cascade,
  post_id bigint references public.goguma_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (user_a < user_b)
);
-- NULLS NOT DISTINCT: post_id가 null인 방도 "두 사람당 하나"로 취급 (PostgreSQL 15+)
create unique index goguma_chat_rooms_pair_post_key
  on public.goguma_chat_rooms (user_a, user_b, post_id) nulls not distinct;
create index goguma_chat_rooms_user_b_idx on public.goguma_chat_rooms (user_b);
create index goguma_chat_rooms_post_id_idx on public.goguma_chat_rooms (post_id);

alter table public.goguma_chat_rooms enable row level security;

-- 방은 두 사람만 볼 수 있다
create policy "chat members can view room"
  on public.goguma_chat_rooms for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- 내가 들어가는 방만 만들 수 있다 (남의 둘만의 방을 만들 수 없음)
create policy "users can create own room"
  on public.goguma_chat_rooms for insert to authenticated
  with check ((select auth.uid()) in (user_a, user_b));

/* ── 2) 메시지 ── */
create table public.goguma_chat_messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.goguma_chat_rooms(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index goguma_chat_messages_room_idx on public.goguma_chat_messages (room_id, created_at);
create index goguma_chat_messages_sender_idx on public.goguma_chat_messages (sender_id);

alter table public.goguma_chat_messages enable row level security;

create policy "chat members can read messages"
  on public.goguma_chat_messages for select to authenticated
  using (exists (
    select 1 from public.goguma_chat_rooms r
    where r.id = room_id and (select auth.uid()) in (r.user_a, r.user_b)
  ));

create policy "chat members can send as themselves"
  on public.goguma_chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.goguma_chat_rooms r
      where r.id = room_id and (select auth.uid()) in (r.user_a, r.user_b)
    )
  );

-- 읽음 표시: 상대가 보낸 메시지의 read_at만 바꿀 수 있다
create policy "chat members can mark received messages read"
  on public.goguma_chat_messages for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.goguma_chat_rooms r
      where r.id = room_id and (select auth.uid()) in (r.user_a, r.user_b)
    )
  )
  with check (sender_id <> (select auth.uid()));

-- 열(column) 권한: update는 read_at 칸만 (내용·보낸 사람을 고치지 못하게)
revoke update on public.goguma_chat_messages from anon, authenticated;
grant update (read_at) on public.goguma_chat_messages to authenticated;

/* ── 3) 새 메시지가 오면 방의 last_message_at 갱신 (목록 정렬용) ── */
-- 방에는 update 정책이 없으므로, 이 함수만 정의자 권한(security definer)으로 갱신한다
create or replace function public.goguma_touch_chat_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.goguma_chat_rooms set last_message_at = new.created_at where id = new.room_id;
  return new;
end;
$$;
revoke execute on function public.goguma_touch_chat_room() from public, anon, authenticated;

create trigger goguma_chat_messages_touch_room
  after insert on public.goguma_chat_messages
  for each row execute function public.goguma_touch_chat_room();

/* ── 4) 실시간: 메시지 테이블만 Realtime 발행에 추가 ── */
-- 구독자는 위 select 정책(방 참여자)을 통과한 메시지만 받는다
alter publication supabase_realtime add table public.goguma_chat_messages;
