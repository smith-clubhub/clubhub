-- Phase 1 discovery pivot: club package tiers (gates media quotas), geo columns
-- for the nearby-clubs map, and Supabase Storage buckets/tracking table for
-- club media uploads. Same idioms as 20260811000000_clubhub_schema.sql:
-- security-definer functions, one RLS policy per statement, insert-on-conflict seeds.

-- ============================================================================
-- 1. CLUB PACKAGE TIERS (platform catalog -- what a *club* subscribes to,
--    distinct from membership_plans which is what a club's *members* buy)
-- ============================================================================

create table public.club_package_tiers (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'ZAR',
  photo_quota integer not null default 0,
  video_quota integer not null default 0,
  streaming_enabled boolean not null default false, -- reserved for a later phase, unused for now
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.club_package_tiers enable row level security;
create policy tiers_select on public.club_package_tiers for select using (true);
create policy tiers_write on public.club_package_tiers for all
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

insert into public.club_package_tiers (key, name, description, price_cents, photo_quota, video_quota, streaming_enabled, sort_order) values
  ('starter', 'Starter', 'Get listed and add photos.', 0, 20, 0, false, 1),
  ('growth', 'Growth', 'More photos plus a limited video reel.', 49900, 100, 10, false, 2),
  ('premium', 'Premium', 'High-volume photo/video, with reserved live-streaming access.', 149900, 500, 100, true, 3)
on conflict (key) do nothing;

-- ============================================================================
-- 2. CLUBS: package tier + geo columns
-- ============================================================================

alter table public.clubs add column package_tier_id uuid references public.club_package_tiers(id);
alter table public.clubs add column latitude numeric(9,6);
alter table public.clubs add column longitude numeric(9,6);
alter table public.clubs add column geocode_status text not null default 'pending'
  check (geocode_status in ('pending', 'ok', 'failed'));

update public.clubs set package_tier_id = (select id from public.club_package_tiers where key = 'starter')
  where package_tier_id is null;
alter table public.clubs alter column package_tier_id set not null;

-- Only a platform admin may move a club between package tiers in Phase 1
-- (no self-serve billing yet -- that lands with PayFast in a later phase).
create or replace function public.enforce_package_tier_immutable()
returns trigger as $$
begin
  if new.package_tier_id is distinct from old.package_tier_id
     and not public.is_platform_admin(auth.uid()) then
    raise exception 'Only a platform admin can change a club''s package tier.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_enforce_package_tier_immutable
  before update on public.clubs
  for each row execute function public.enforce_package_tier_immutable();

-- New clubs start on Starter (create_club_with_owner is re-created rather than
-- altered in place, matching how the original migration defines it once).
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
     'payments.view','payments.refund','announcements.send','club.settings','audit.view');

  insert into public.role_permissions (role_id, permission_id)
  select v_role_events, id from public.permissions where key in
    ('members.view','events.create','events.register','announcements.send');

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
-- 3. Public, column-safe view for the discovery map (anon-readable).
--    clubs_select RLS already permits anon SELECT of status='active' rows,
--    but this keeps "what's safe to expose publicly" in one place instead of
--    trusting every caller to hand-pick columns (avoids leaking address/contact_*).
-- ============================================================================

create view public.clubs_public as
  select id, name, slug, category, logo_url, cover_image_url, primary_color, latitude, longitude
  from public.clubs
  where status = 'active' and latitude is not null and longitude is not null;

grant select on public.clubs_public to anon, authenticated;

-- ============================================================================
-- 4. Storage buckets + club_media_assets tracking table
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('club-branding', 'club-branding', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('club-gallery', 'club-gallery', true, 104857600, array['image/png','image/jpeg','image/webp','video/mp4','video/quicktime'])
on conflict (id) do nothing;

-- Path convention: {bucket}/{club_id}/... -- storage.foldername(name)[1] is the club_id.
create policy club_branding_select on storage.objects for select using (bucket_id = 'club-branding');
create policy club_branding_insert on storage.objects for insert with check (
  bucket_id = 'club-branding' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);
create policy club_branding_update on storage.objects for update using (
  bucket_id = 'club-branding' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);
create policy club_branding_delete on storage.objects for delete using (
  bucket_id = 'club-branding' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);

create policy club_gallery_select on storage.objects for select using (bucket_id = 'club-gallery');
create policy club_gallery_insert on storage.objects for insert with check (
  bucket_id = 'club-gallery' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);
create policy club_gallery_update on storage.objects for update using (
  bucket_id = 'club-gallery' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);
create policy club_gallery_delete on storage.objects for delete using (
  bucket_id = 'club-gallery' and public.has_club_permission(auth.uid(), (storage.foldername(name))[1]::uuid, 'club.settings')
);

create table public.club_media_assets (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  kind text not null check (kind in ('logo','cover','gallery_photo','gallery_video','event_cover')),
  storage_path text not null,
  url text not null,
  event_id uuid references public.events(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index on public.club_media_assets (club_id, kind);

alter table public.club_media_assets enable row level security;
create policy media_select on public.club_media_assets for select using (
  exists (select 1 from public.clubs c where c.id = club_id and c.status = 'active')
  or public.is_club_member(auth.uid(), club_id)
  or public.has_club_permission(auth.uid(), club_id, 'club.settings')
);
create policy media_insert on public.club_media_assets for insert with check (
  public.has_club_permission(auth.uid(), club_id, 'club.settings')
);
create policy media_delete on public.club_media_assets for delete using (
  public.has_club_permission(auth.uid(), club_id, 'club.settings')
);

-- Quota enforcement (defense-in-depth backstop; app also pre-checks for UX).
-- Only gallery_photo/gallery_video count against a tier's quota -- logo/cover/
-- event_cover are core functionality, not the tiered upsell.
create or replace function public.enforce_media_quota()
returns trigger as $$
declare
  v_photo_quota integer;
  v_video_quota integer;
  v_count integer;
begin
  if new.kind not in ('gallery_photo', 'gallery_video') then
    return new;
  end if;

  select t.photo_quota, t.video_quota into v_photo_quota, v_video_quota
    from public.club_package_tiers t
    join public.clubs c on c.package_tier_id = t.id
    where c.id = new.club_id;

  select count(*) into v_count from public.club_media_assets
    where club_id = new.club_id and kind = new.kind;

  if (new.kind = 'gallery_photo' and v_count >= v_photo_quota)
     or (new.kind = 'gallery_video' and v_count >= v_video_quota) then
    raise exception 'Media quota exceeded for this club''s package tier.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_enforce_media_quota
  before insert on public.club_media_assets
  for each row execute function public.enforce_media_quota();
