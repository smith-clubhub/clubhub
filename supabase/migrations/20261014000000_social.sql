-- Instagram-style social layer: clubs post (photos/videos/events), users follow,
-- like, comment, save, view stories and DM. Same idioms as earlier migrations:
-- security-definer helpers, one RLS policy per statement, owner-rights views
-- that expose only public-safe columns.

-- ============================================================================
-- 1. PERMISSIONS: posts.create, messages.reply
-- ============================================================================

insert into public.permissions (key, description) values
  ('posts.create', 'Publish posts and stories for the club'),
  ('messages.reply', 'Read and reply to the club''s direct messages')
on conflict (key) do nothing;

-- Existing clubs: Owner/Admin get both, Events Coordinator gets posts.create.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in ('posts.create', 'messages.reply')
where r.club_id is not null and r.name in ('Owner', 'Admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'posts.create'
where r.club_id is not null and r.name = 'Events Coordinator'
on conflict do nothing;

create or replace function public.create_club_with_owner(
  p_name text,
  p_slug text,
  p_description text default null,
  p_category text default 'other',
  p_currency text default 'ZAR',
  p_timezone text default 'Africa/Johannesburg'
)
returns public.clubs as $$
declare
  v_club public.clubs;
  v_role_owner uuid;
  v_role_admin uuid;
  v_role_events uuid;
  v_role_treasurer uuid;
  v_role_member uuid;
  v_starter_tier uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  select id into v_starter_tier from public.club_package_tiers where key = 'starter';

  insert into public.clubs (name, slug, description, category, currency, timezone, created_by, status, package_tier_id)
  values (p_name, p_slug, p_description, p_category, p_currency, p_timezone, auth.uid(), 'active', v_starter_tier)
  returning * into v_club;

  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Owner', true) returning id into v_role_owner;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Admin', true) returning id into v_role_admin;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Events Coordinator', true) returning id into v_role_events;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Treasurer', true) returning id into v_role_treasurer;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Member', true) returning id into v_role_member;

  insert into public.role_permissions (role_id, permission_id)
  select v_role_owner, id from public.permissions;

  insert into public.role_permissions (role_id, permission_id)
  select v_role_admin, id from public.permissions where key in
    ('members.view','members.edit','members.export','events.create','events.register',
     'payments.view','payments.refund','announcements.send','club.settings','audit.view',
     'posts.create','messages.reply');

  insert into public.role_permissions (role_id, permission_id)
  select v_role_events, id from public.permissions where key in
    ('members.view','events.create','events.register','announcements.send','posts.create');

  insert into public.role_permissions (role_id, permission_id)
  select v_role_treasurer, id from public.permissions where key in
    ('members.view','events.register','payments.view','payments.refund');

  insert into public.role_permissions (role_id, permission_id)
  select v_role_member, id from public.permissions where key in ('events.register');

  insert into public.user_role_assignments (user_id, club_id, role_id)
  values (auth.uid(), v_club.id, v_role_owner);

  return v_club;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- 2. PROFILES: username + bio, public-safe view
-- ============================================================================

alter table public.profiles add column username text;
alter table public.profiles add column bio text check (char_length(bio) <= 150);
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z0-9._]{3,30}$');
create unique index profiles_username_key on public.profiles (username);

-- Picks a free username derived from the email prefix (e.g. thabo.m, thabo.m4821).
create or replace function public.generate_username(p_email text)
returns text as $$
declare
  v_base text;
  v_candidate text;
begin
  v_base := left(regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9._]', '', 'g'), 24);
  if char_length(v_base) < 3 then
    v_base := 'raver' || v_base;
  end if;
  v_candidate := v_base;
  while exists (select 1 from public.profiles where username = v_candidate) loop
    v_candidate := v_base || (floor(random() * 9000) + 1000)::int::text;
  end loop;
  return v_candidate;
end;
$$ language plpgsql volatile security definer set search_path = public;

do $$
declare r record;
begin
  for r in select id, email from public.profiles where username is null order by created_at loop
    update public.profiles set username = public.generate_username(r.email) where id = r.id;
  end loop;
end $$;

alter table public.profiles alter column username set not null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    public.generate_username(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- profiles RLS only exposes people who share a club with you; commenters and
-- DM partners need a name + avatar, never email.
create view public.profiles_public as
  select id, username, first_name, last_name, avatar_url, bio from public.profiles;
grant select on public.profiles_public to anon, authenticated;

-- clubs_public gains the description for profile headers / map cards.
create or replace view public.clubs_public as
  select id, name, slug, category, logo_url, cover_image_url, primary_color, latitude, longitude, description
  from public.clubs
  where status = 'active' and latitude is not null and longitude is not null;

-- ============================================================================
-- 3. FOLLOWS (users follow clubs; only clubs post)
-- ============================================================================

create table public.follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, club_id)
);
create index on public.follows (club_id);

alter table public.follows enable row level security;
create policy follows_select on public.follows for select using (true);
create policy follows_insert on public.follows for insert with check (user_id = auth.uid());
create policy follows_delete on public.follows for delete using (user_id = auth.uid());

-- ============================================================================
-- 4. POSTS (+ media via club_media_assets)
-- ============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  caption text check (char_length(caption) <= 2200),
  kind text not null default 'photo' check (kind in ('photo','video','carousel','event')),
  event_id uuid unique references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.posts (club_id, created_at desc);
create index on public.posts (created_at desc);

alter table public.posts enable row level security;
create policy posts_select on public.posts for select using (
  exists (select 1 from public.clubs c where c.id = club_id and c.status = 'active')
  or public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy posts_insert on public.posts for insert with check (
  public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy posts_update on public.posts for update using (
  public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy posts_delete on public.posts for delete using (
  public.has_club_permission(auth.uid(), club_id, 'posts.create')
);

alter table public.club_media_assets add column post_id uuid references public.posts(id) on delete cascade;
alter table public.club_media_assets add column position smallint not null default 0;
alter table public.club_media_assets drop constraint club_media_assets_kind_check;
alter table public.club_media_assets add constraint club_media_assets_kind_check
  check (kind in ('logo','cover','gallery_photo','gallery_video','event_cover','post_photo','post_video'));
create index on public.club_media_assets (post_id, position);

create policy media_insert_posts on public.club_media_assets for insert with check (
  kind in ('post_photo','post_video')
  and public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy media_delete_posts on public.club_media_assets for delete using (
  kind in ('post_photo','post_video')
  and public.has_club_permission(auth.uid(), club_id, 'posts.create')
);

-- Post photos/videos share the tier quota with gallery uploads.
create or replace function public.enforce_media_quota()
returns trigger as $$
declare
  v_photo_quota integer;
  v_video_quota integer;
  v_count integer;
  v_is_photo boolean;
begin
  if new.kind not in ('gallery_photo', 'gallery_video', 'post_photo', 'post_video') then
    return new;
  end if;
  v_is_photo := new.kind in ('gallery_photo', 'post_photo');

  select t.photo_quota, t.video_quota into v_photo_quota, v_video_quota
    from public.club_package_tiers t
    join public.clubs c on c.package_tier_id = t.id
    where c.id = new.club_id;

  select count(*) into v_count from public.club_media_assets
    where club_id = new.club_id
      and kind = any (case when v_is_photo then array['gallery_photo','post_photo']
                           else array['gallery_video','post_video'] end);

  if (v_is_photo and v_count >= v_photo_quota)
     or (not v_is_photo and v_count >= v_video_quota) then
    raise exception 'Media quota exceeded for this club''s package tier.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Storage: posts.create staff may write under {club_id}/posts/ and {club_id}/stories/
-- (club.settings already covers the whole club folder).
create policy club_gallery_insert_social on storage.objects for insert with check (
  bucket_id = 'club-gallery'
  and (storage.foldername(name))[2] in ('posts', 'stories')
  and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'posts.create')
);
create policy club_gallery_delete_social on storage.objects for delete using (
  bucket_id = 'club-gallery'
  and (storage.foldername(name))[2] in ('posts', 'stories')
  and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'posts.create')
);

-- Publishing an event drops it into the feed as an event post (once per event).
create or replace function public.event_to_post()
returns trigger as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published')
     and not exists (select 1 from public.posts where event_id = new.id) then
    insert into public.posts (club_id, author_id, caption, kind, event_id, created_at)
    values (new.club_id, new.created_by, new.title, 'event', new.id, now());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_event_to_post
  after insert or update of status on public.events
  for each row execute function public.event_to_post();

-- Backfill: already-published upcoming events become posts.
insert into public.posts (club_id, author_id, caption, kind, event_id, created_at)
select e.club_id, e.created_by, e.title, 'event', e.id, e.created_at
from public.events e
where e.status = 'published' and e.start_at >= now()
on conflict (event_id) do nothing;

-- ============================================================================
-- 5. LIKES, SAVES, COMMENTS
-- ============================================================================

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on public.post_likes (user_id);

alter table public.post_likes enable row level security;
create policy post_likes_select on public.post_likes for select using (true);
create policy post_likes_insert on public.post_likes for insert with check (user_id = auth.uid());
create policy post_likes_delete on public.post_likes for delete using (user_id = auth.uid());

create table public.post_saves (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index on public.post_saves (user_id, created_at desc);

alter table public.post_saves enable row level security;
create policy post_saves_select on public.post_saves for select using (user_id = auth.uid());
create policy post_saves_insert on public.post_saves for insert with check (user_id = auth.uid());
create policy post_saves_delete on public.post_saves for delete using (user_id = auth.uid());

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2200),
  created_at timestamptz not null default now()
);
create index on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;
create policy post_comments_select on public.post_comments for select using (true);
create policy post_comments_insert on public.post_comments for insert with check (user_id = auth.uid());
create policy post_comments_delete on public.post_comments for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.posts p
    where p.id = post_id and public.has_club_permission(auth.uid(), p.club_id, 'posts.create')
  )
);

-- ============================================================================
-- 6. FEED VIEW + CLUB STATS
-- ============================================================================

create view public.posts_feed as
select
  p.id,
  p.club_id,
  c.slug as club_slug,
  c.name as club_name,
  c.logo_url as club_logo_url,
  c.latitude,
  c.longitude,
  p.caption,
  p.kind,
  p.created_at,
  p.event_id,
  e.title as event_title,
  e.start_at as event_start_at,
  e.price_cents as event_price_cents,
  e.currency as event_currency,
  e.location as event_location,
  coalesce(
    (select jsonb_agg(jsonb_build_object('url', m.url, 'kind', m.kind) order by m.position)
       from public.club_media_assets m where m.post_id = p.id),
    case when e.cover_image_url is not null
      then jsonb_build_array(jsonb_build_object('url', e.cover_image_url, 'kind', 'post_photo'))
      else '[]'::jsonb end
  ) as media,
  (select count(*) from public.post_likes l where l.post_id = p.id)::int as like_count,
  (select count(*) from public.post_comments pc where pc.post_id = p.id)::int as comment_count
from public.posts p
join public.clubs c on c.id = p.club_id
left join public.events e on e.id = p.event_id
where c.status = 'active' and (e.id is null or e.status = 'published');

grant select on public.posts_feed to anon, authenticated;

create view public.club_stats as
select
  c.id as club_id,
  (select count(*) from public.follows f where f.club_id = c.id)::int as follower_count,
  (select count(*) from public.posts p where p.club_id = c.id)::int as post_count,
  (select count(*) from public.events e where e.club_id = c.id and e.status = 'published' and e.start_at >= now())::int as upcoming_event_count
from public.clubs c
where c.status = 'active';

grant select on public.club_stats to anon, authenticated;

-- ============================================================================
-- 7. STORIES (24h)
-- ============================================================================

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  storage_path text not null,
  media_url text not null,
  kind text not null default 'photo' check (kind in ('photo','video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index on public.stories (club_id, expires_at);

alter table public.stories enable row level security;
create policy stories_select on public.stories for select using (
  (expires_at > now() and exists (select 1 from public.clubs c where c.id = club_id and c.status = 'active'))
  or public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy stories_insert on public.stories for insert with check (
  public.has_club_permission(auth.uid(), club_id, 'posts.create')
);
create policy stories_delete on public.stories for delete using (
  public.has_club_permission(auth.uid(), club_id, 'posts.create')
);

-- Stories don't count toward the tier quota, but are capped per 24h.
create or replace function public.enforce_story_cap()
returns trigger as $$
begin
  if (select count(*) from public.stories
      where club_id = new.club_id and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'A club can post at most 30 stories per 24 hours.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_enforce_story_cap
  before insert on public.stories
  for each row execute function public.enforce_story_cap();

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.story_views enable row level security;
create policy story_views_select on public.story_views for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.stories s
    where s.id = story_id and public.has_club_permission(auth.uid(), s.club_id, 'posts.create')
  )
);
create policy story_views_insert on public.story_views for insert with check (user_id = auth.uid());

-- ============================================================================
-- 8. DIRECT MESSAGES
--    club_id null  -> user<->user thread (both are conversation_members)
--    club_id set   -> user<->club thread, answered by staff with messages.reply
-- ============================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index on public.conversations (club_id, last_message_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  as_club boolean not null default false,
  body text check (char_length(body) <= 2000),
  shared_post_id uuid references public.posts(id) on delete set null,
  shared_event_id uuid references public.events(id) on delete set null,
  shared_club_id uuid references public.clubs(id) on delete set null,
  created_at timestamptz not null default now(),
  check (body is not null or shared_post_id is not null or shared_event_id is not null or shared_club_id is not null)
);
create index on public.messages (conversation_id, created_at);

create or replace function public.can_access_conversation(uid uuid, conv uuid)
returns boolean as $$
  select exists (select 1 from public.conversation_members m where m.conversation_id = conv and m.user_id = uid)
    or exists (
      select 1 from public.conversations c
      where c.id = conv and c.club_id is not null
        and public.has_club_permission(uid, c.club_id, 'messages.reply')
    );
$$ language sql stable security definer set search_path = public;

alter table public.conversations enable row level security;
create policy conversations_select on public.conversations for select using (
  public.can_access_conversation(auth.uid(), id)
);

alter table public.conversation_members enable row level security;
create policy conv_members_select on public.conversation_members for select using (
  public.can_access_conversation(auth.uid(), conversation_id)
);
create policy conv_members_update on public.conversation_members for update using (user_id = auth.uid());

alter table public.messages enable row level security;
create policy messages_select on public.messages for select using (
  public.can_access_conversation(auth.uid(), conversation_id)
);
create policy messages_insert on public.messages for insert with check (
  sender_id = auth.uid()
  and public.can_access_conversation(auth.uid(), conversation_id)
  and (
    not as_club
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.has_club_permission(auth.uid(), c.club_id, 'messages.reply')
    )
  )
);

create or replace function public.touch_conversation()
returns trigger as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- Get-or-create a thread with another user (p_user_id) or with a club (p_club_id).
create or replace function public.start_conversation(p_user_id uuid default null, p_club_id uuid default null)
returns uuid as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'must be authenticated';
  end if;
  if (p_user_id is null) = (p_club_id is null) then
    raise exception 'pass exactly one of p_user_id or p_club_id';
  end if;

  if p_club_id is not null then
    select c.id into v_conv
      from public.conversations c
      join public.conversation_members m on m.conversation_id = c.id and m.user_id = v_me
      where c.club_id = p_club_id
      limit 1;
    if v_conv is null then
      insert into public.conversations (club_id) values (p_club_id) returning id into v_conv;
      insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_me);
    end if;
    return v_conv;
  end if;

  if p_user_id = v_me then
    raise exception 'cannot message yourself';
  end if;

  select c.id into v_conv
    from public.conversations c
    join public.conversation_members a on a.conversation_id = c.id and a.user_id = v_me
    join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_user_id
    where c.club_id is null
    limit 1;
  if v_conv is null then
    insert into public.conversations (club_id) values (null) returning id into v_conv;
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_me), (v_conv, p_user_id);
  end if;
  return v_conv;
end;
$$ language plpgsql security definer set search_path = public;

alter publication supabase_realtime add table public.messages;

-- ============================================================================
-- 9. NOTIFICATIONS: followers hear about new posts from clubs they follow
-- ============================================================================

create or replace function public.notify_followers_of_post()
returns trigger as $$
begin
  insert into public.notifications (user_id, club_id, type, title, body)
  select f.user_id, new.club_id, 'new_post',
         (select name from public.clubs where id = new.club_id),
         case when new.kind = 'event' then 'announced an event: ' || coalesce(new.caption, '')
              else 'shared a new post' end
  from public.follows f
  where f.club_id = new.club_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_notify_followers_of_post
  after insert on public.posts
  for each row execute function public.notify_followers_of_post();

-- ============================================================================
-- 10. AVATARS BUCKET (user profile photos, path {user_id}/...)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy avatars_select on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
