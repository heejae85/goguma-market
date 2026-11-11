-- 고구마마켓 회원 프로필 (가계부와 같은 DB를 쓰므로 goguma_ 접두사 사용)
-- Supabase에 이미 적용됨 (migration: goguma_profiles)
create table public.goguma_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 12),
  region text not null default '' check (char_length(region) <= 30),
  created_at timestamptz not null default now()
);

alter table public.goguma_profiles enable row level security;

-- 닉네임/동네는 거래 화면에 공개되는 정보이므로 누구나 조회 가능
create policy "goguma_profiles are viewable by everyone"
  on public.goguma_profiles for select
  to anon, authenticated
  using (true);

-- 본인 프로필만 수정 가능
create policy "users can update own goguma_profile"
  on public.goguma_profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 회원가입 시 자동으로 프로필 생성 (고구마마켓 가입자만: app = 'goguma')
create or replace function public.goguma_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'app' = 'goguma' then
    insert into public.goguma_profiles (id, nickname, region)
    values (
      new.id,
      new.raw_user_meta_data ->> 'nickname',
      coalesce(new.raw_user_meta_data ->> 'region', '')
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.goguma_handle_new_user() from public, anon, authenticated;

create trigger goguma_on_auth_user_created
  after insert on auth.users
  for each row execute function public.goguma_handle_new_user();
