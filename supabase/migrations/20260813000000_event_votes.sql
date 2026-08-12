-- Event upvotes/downvotes (net score, Reddit-style) + a public events feed view
-- that surfaces that score alongside club location, for the "nearest clubs
-- first, most-upvoted events within them" discovery landing page.

create table public.event_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index on public.event_votes (event_id);

alter table public.event_votes enable row level security;
create policy event_votes_select on public.event_votes for select using (true);
create policy event_votes_insert on public.event_votes for insert with check (user_id = auth.uid());
create policy event_votes_update on public.event_votes for update using (user_id = auth.uid());
create policy event_votes_delete on public.event_votes for delete using (user_id = auth.uid());

-- Public, column-safe events feed: only published events at active, located
-- clubs, with the net vote score pre-aggregated. Time filtering (upcoming
-- only) is left to the app query, matching how clubs_public only encodes
-- column-safety rather than business rules.
create view public.events_public as
select
  e.id,
  e.club_id,
  c.slug as club_slug,
  c.name as club_name,
  c.logo_url as club_logo_url,
  c.primary_color as club_primary_color,
  c.latitude,
  c.longitude,
  e.title,
  e.description,
  e.category,
  e.cover_image_url,
  e.start_at,
  e.end_at,
  e.price_cents,
  e.currency,
  coalesce(v.score, 0) as score
from public.events e
join public.clubs c on c.id = e.club_id
left join (
  select event_id, sum(value)::integer as score from public.event_votes group by event_id
) v on v.event_id = e.id
where e.status = 'published' and c.status = 'active' and c.latitude is not null and c.longitude is not null;

grant select on public.events_public to anon, authenticated;
