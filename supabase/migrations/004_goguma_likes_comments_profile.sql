-- 좋아요, 댓글, 프로필(자기소개·프로필 사진)
-- Supabase에 이미 적용됨 (migration: goguma_likes_comments_profile)

/* ── 1) 좋아요: 한 사람이 한 글에 한 번만 (기본키가 (글, 사람)) ── */
create table public.goguma_post_likes (
  post_id bigint not null references public.goguma_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index goguma_post_likes_user_id_idx on public.goguma_post_likes (user_id);

alter table public.goguma_post_likes enable row level security;

create policy "goguma_post_likes are viewable by everyone"
  on public.goguma_post_likes for select to anon, authenticated using (true);

create policy "users can like as themselves"
  on public.goguma_post_likes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can unlike own like"
  on public.goguma_post_likes for delete to authenticated
  using ((select auth.uid()) = user_id);

/* ── 2) 댓글 ── */
create table public.goguma_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.goguma_posts(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.goguma_profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index goguma_comments_post_id_idx on public.goguma_comments (post_id, created_at);
create index goguma_comments_author_id_idx on public.goguma_comments (author_id);

alter table public.goguma_comments enable row level security;

create policy "goguma_comments are viewable by everyone"
  on public.goguma_comments for select to anon, authenticated using (true);

create policy "users can comment as themselves"
  on public.goguma_comments for insert to authenticated
  with check ((select auth.uid()) = author_id);

create policy "users can delete own comments"
  on public.goguma_comments for delete to authenticated
  using ((select auth.uid()) = author_id);

/* ── 3) 프로필: 자기소개, 프로필 사진 ── */
alter table public.goguma_profiles
  add column bio text not null default '' check (char_length(bio) <= 300),
  -- 프로필 사진 경로는 반드시 "내 uuid 폴더" 안이어야 한다
  add column avatar_path text check (avatar_path is null or avatar_path like id::text || '/%');

/* ── 4) 프로필 사진 보관함: 공개, 한 장 2MB, 이미지 형식만 ── */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goguma-avatars', 'goguma-avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "goguma_avatars insert own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'goguma-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "goguma_avatars select own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'goguma-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "goguma_avatars delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'goguma-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
