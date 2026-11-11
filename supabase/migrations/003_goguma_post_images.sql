-- 판매글 사진 (여러 장)
-- Supabase에 이미 적용됨 (migration: goguma_post_images)

-- 1) 판매글에 사진 경로 목록 칸 추가 (배열 순서 = 보여줄 순서, 첫 장이 대표 사진)
--    경로 형식: "<작성자 uuid>/<임의 이름>.webp" (Storage 버킷 안의 위치)
alter table public.goguma_posts
  add column image_paths text[] not null default '{}'
  check (cardinality(image_paths) <= 10);

-- 2) 글쓰기/고치기 정책 고치기: 사진 경로가 모두 "내 폴더" 안에 있어야 한다
--    (남의 사진 경로를 내 글에 붙이는 것을 DB에서 막는다)
alter policy "users can insert own goguma_posts"
  on public.goguma_posts
  with check (
    (select auth.uid()) = seller_id
    and not exists (
      select 1 from unnest(image_paths) as p
      where p not like (select auth.uid())::text || '/%'
    )
  );

alter policy "users can update own goguma_posts"
  on public.goguma_posts
  with check (
    (select auth.uid()) = seller_id
    and not exists (
      select 1 from unnest(image_paths) as p
      where p not like (select auth.uid())::text || '/%'
    )
  );

-- 3) 사진 보관함(버킷): 공개(누구나 사진 URL로 볼 수 있음), 한 장 5MB, 이미지 형식만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'goguma-post-images',
  'goguma-post-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 4) Storage 정책: 로그인한 사람은 "자기 uuid 폴더"에만 올리고/보고/지울 수 있다
--    (공개 버킷이라 사진 보기는 정책 없이도 공개 URL로 된다)
create policy "goguma_post_images insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'goguma-post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "goguma_post_images select own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'goguma-post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "goguma_post_images delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'goguma-post-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
