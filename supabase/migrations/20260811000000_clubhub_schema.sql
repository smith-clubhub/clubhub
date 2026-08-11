-- ClubHub core schema: multi-tenant clubs, members, events, payments, comms, RBAC, audit.
-- Tenant scoping strategy: shared schema + club_id column on every tenant table,
-- enforced via Postgres RLS (Section 6.3 of the ClubHub spec) as the defense-in-depth
-- layer on top of the app-level tenant guard in lib/tenant.ts.

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES (auth identity extension)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. CLUBS & MEMBERSHIP PLANS
-- ============================================================================

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_image_url text,
  category text not null default 'other'
    check (category in ('sports','social','alumni','professional','other')),
  contact_email text,
  contact_phone text,
  address text,
  timezone text not null default 'Africa/Johannesburg',
  currency text not null default 'ZAR',
  status text not null default 'onboarding'
    check (status in ('active','suspended','onboarding')),
  primary_color text not null default '#F97316',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  currency text not null default 'ZAR',
  billing_interval text not null default 'annual'
    check (billing_interval in ('monthly','annual','one_time')),
  grace_period_days integer not null default 0,
  is_active boolean not null default true,
  max_members integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.membership_plans (club_id);

-- ============================================================================
-- 3. RBAC: permissions / roles / role_permissions / user_role_assignments
-- ============================================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade, -- null = platform-level role
  name text not null,
  description text,
  is_system boolean not null default false,
  unique (club_id, name)
);
create index on public.roles (club_id);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade, -- null = platform-level
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, club_id, role_id)
);
create index on public.user_role_assignments (user_id);
create index on public.user_role_assignments (club_id);

-- ============================================================================
-- 4. MEMBERS (a User's membership record within a specific Club)
-- ============================================================================

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  membership_plan_id uuid references public.membership_plans(id),
  member_number text,
  status text not null default 'pending'
    check (status in ('pending','active','expired','suspended','cancelled')),
  joined_at timestamptz,
  expires_at timestamptz,
  renewed_at timestamptz,
  emergency_contact jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, club_id)
);
create index on public.members (club_id, status);
create index on public.members (user_id);

-- ============================================================================
-- 5. EVENTS & REGISTRATIONS
-- ============================================================================

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  category text,
  location text,
  is_virtual boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone text not null default 'Africa/Johannesburg',
  capacity integer,
  registration_deadline timestamptz,
  price_cents integer not null default 0,
  currency text not null default 'ZAR',
  status text not null default 'draft'
    check (status in ('draft','published','cancelled','completed')),
  cover_image_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.events (club_id, start_at);

-- ============================================================================
-- 6. PAYMENTS (created before event_registrations, which references it)
-- ============================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  type text not null check (type in ('membership_fee','event_ticket','other')),
  amount_cents integer not null,
  currency text not null default 'ZAR',
  provider text not null default 'mock',
  provider_reference text,
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','refunded')),
  invoice_number text,
  paid_at timestamptz,
  receipt_url text,
  event_id uuid references public.events(id),
  membership_plan_id uuid references public.membership_plans(id),
  created_at timestamptz not null default now()
);
create index on public.payments (club_id, status);
create index on public.payments (member_id);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered','waitlisted','cancelled','attended','no_show')),
  registered_at timestamptz not null default now(),
  checked_in_at timestamptz,
  payment_id uuid references public.payments(id),
  unique (event_id, member_id)
);
create index on public.event_registrations (event_id, status);
create index on public.event_registrations (member_id);

-- ============================================================================
-- 7. ANNOUNCEMENTS & NOTIFICATIONS
-- ============================================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'all'
    check (audience in ('all','plan_specific','role_specific')),
  audience_plan_id uuid references public.membership_plans(id),
  audience_role_id uuid references public.roles(id),
  channels text[] not null default array['in_app'],
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.announcements (club_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  type text not null default 'announcement',
  channel text not null default 'in_app',
  title text,
  body text,
  status text not null default 'sent'
    check (status in ('queued','sent','delivered','failed')),
  read_at timestamptz,
  sent_at timestamptz default now(),
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read_at);

-- ============================================================================
-- 8. AUDIT LOG
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (club_id, created_at desc);

-- ============================================================================
-- 9. RBAC HELPER FUNCTIONS (security definer to avoid RLS recursion;
--    this is the tenant-scoping guard referenced throughout the spec)
-- ============================================================================

create or replace function public.is_platform_admin(uid uuid)
returns boolean as $$
  select exists (
    select 1 from public.user_role_assignments ura
    join public.roles r on r.id = ura.role_id
    where ura.user_id = uid and ura.club_id is null and r.name = 'Platform Super Admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.has_club_permission(uid uuid, cid uuid, perm_key text)
returns boolean as $$
  select
    exists (
      select 1
      from public.user_role_assignments ura
      join public.role_permissions rp on rp.role_id = ura.role_id
      join public.permissions p on p.id = rp.permission_id
      where ura.user_id = uid and ura.club_id = cid and p.key = perm_key
    )
    or public.is_platform_admin(uid);
$$ language sql stable security definer set search_path = public;

create or replace function public.is_club_member(uid uuid, cid uuid)
returns boolean as $$
  select exists (
    select 1 from public.members m where m.user_id = uid and m.club_id = cid
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================================
-- 10. RPC: create_club_with_owner
--     Provisions a club + its 5 default roles + Section 8's permission matrix
--     + assigns the creator as Owner, atomically. Security definer because the
--     creator has no role_permissions row yet (chicken/egg) when the club is
--     first created.
-- ============================================================================

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
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  insert into public.clubs (name, slug, description, category, currency, timezone, created_by, status)
  values (p_name, p_slug, p_description, p_category, p_currency, p_timezone, auth.uid(), 'active')
  returning * into v_club;

  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Owner', true) returning id into v_role_owner;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Admin', true) returning id into v_role_admin;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Events Coordinator', true) returning id into v_role_events;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Treasurer', true) returning id into v_role_treasurer;
  insert into public.roles (club_id, name, is_system) values (v_club.id, 'Member', true) returning id into v_role_member;

  -- Section 8 permission matrix
  insert into public.role_permissions (role_id, permission_id)
  select v_role_owner, id from public.permissions; -- Owner: everything

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
-- 11. RPC: confirm_mock_payment
--     Dev/MVP stand-in for a PaymentProvider webhook. A real Stripe/PayFast
--     webhook handler (POST /payments/webhook/:provider) would call the
--     equivalent transition after verifying the provider's signature; this
--     lets the mock provider (lib/payments/mock-provider.ts) flip a payment
--     from pending -> succeeded without granting members raw UPDATE rights
--     on the payments table.
-- ============================================================================

create or replace function public.confirm_mock_payment(p_payment_id uuid)
returns public.payments as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if v_payment is null then
    raise exception 'payment not found';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = v_payment.member_id and m.user_id = auth.uid()
  ) and not public.has_club_permission(auth.uid(), v_payment.club_id, 'payments.refund') then
    raise exception 'not authorized';
  end if;

  update public.payments
    set status = 'succeeded', paid_at = now(), provider_reference = coalesce(provider_reference, 'MOCK-' || substr(id::text, 1, 8))
    where id = p_payment_id
    returning * into v_payment;

  if v_payment.type = 'membership_fee' then
    update public.members
      set status = 'active',
          joined_at = coalesce(joined_at, now()),
          renewed_at = now(),
          expires_at = case
            when membership_plan_id is not null then
              now() + (select case billing_interval when 'monthly' then interval '1 month' when 'annual' then interval '1 year' else interval '100 year' end from public.membership_plans where id = v_payment.membership_plan_id)
            else now() + interval '1 year'
          end
      where id = v_payment.member_id;
  elsif v_payment.type = 'event_ticket' then
    update public.event_registrations
      set payment_id = v_payment.id
      where event_id = v_payment.event_id and member_id = v_payment.member_id;
  end if;

  return v_payment;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- 12. Waitlist auto-promotion trigger (US-11 edge case)
-- ============================================================================

create or replace function public.promote_waitlist()
returns trigger as $$
declare
  v_capacity integer;
  v_registered_count integer;
  v_next_waitlisted uuid;
begin
  if (old.status = 'registered' and new.status in ('cancelled','no_show')) then
    select capacity into v_capacity from public.events where id = new.event_id;
    if v_capacity is not null then
      select count(*) into v_registered_count from public.event_registrations
        where event_id = new.event_id and status = 'registered';
      if v_registered_count < v_capacity then
        select id into v_next_waitlisted from public.event_registrations
          where event_id = new.event_id and status = 'waitlisted'
          order by registered_at asc limit 1;
        if v_next_waitlisted is not null then
          update public.event_registrations set status = 'registered' where id = v_next_waitlisted;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_promote_waitlist
  after update on public.event_registrations
  for each row execute function public.promote_waitlist();

-- ============================================================================
-- 13. Scheduled reminder generators (US-5, US-13).
--     Written as plain functions; schedule with pg_cron once the extension is
--     enabled in Supabase Dashboard > Database > Extensions (not enabled by
--     this migration since it requires a superuser-level toggle):
--       select cron.schedule('renewal-reminders-daily', '0 6 * * *',
--         $$select public.generate_renewal_reminders();$$);
--       select cron.schedule('event-reminders-hourly', '0 * * * *',
--         $$select public.generate_event_reminders();$$);
-- ============================================================================

create or replace function public.generate_renewal_reminders()
returns void as $$
begin
  insert into public.notifications (user_id, club_id, type, channel, title, body)
  select m.user_id, m.club_id, 'renewal_reminder', 'in_app',
    'Membership renewal reminder',
    'Your membership expires on ' || to_char(m.expires_at, 'YYYY-MM-DD') || '.'
  from public.members m
  where m.status = 'active'
    and m.expires_at is not null
    and date_trunc('day', m.expires_at) - date_trunc('day', now()) in (interval '30 day', interval '14 day', interval '1 day')
    and not exists (
      select 1 from public.notifications n
      where n.user_id = m.user_id and n.club_id = m.club_id and n.type = 'renewal_reminder'
        and n.created_at::date = now()::date
    );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.generate_event_reminders()
returns void as $$
begin
  insert into public.notifications (user_id, club_id, type, channel, title, body)
  select distinct m.user_id, e.club_id, 'event_reminder', 'in_app',
    'Upcoming event: ' || e.title,
    'Starts at ' || to_char(e.start_at, 'YYYY-MM-DD HH24:MI') || '.'
  from public.event_registrations er
  join public.events e on e.id = er.event_id
  join public.members m on m.id = er.member_id
  where er.status = 'registered'
    and (
      e.start_at - now() between interval '23 hour' and interval '24 hour'
      or e.start_at - now() between interval '0 hour' and interval '1 hour'
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = m.user_id and n.type = 'event_reminder'
        and n.body like '%' || e.title || '%'
        and n.created_at > now() - interval '2 hour'
    );
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- 14. RLS
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.membership_plans enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.announcements enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- profiles: self, or a fellow member of any shared club
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.members m1
    join public.members m2 on m1.club_id = m2.club_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  )
);
create policy profiles_upsert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());

-- clubs
create policy clubs_select on public.clubs for select using (
  status = 'active'
  or public.is_club_member(auth.uid(), id)
  or public.has_club_permission(auth.uid(), id, 'club.settings')
);
create policy clubs_insert on public.clubs for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy clubs_update on public.clubs for update using (public.has_club_permission(auth.uid(), id, 'club.settings'));

-- membership_plans
create policy plans_select on public.membership_plans for select using (
  is_active or public.has_club_permission(auth.uid(), club_id, 'club.settings')
);
create policy plans_insert on public.membership_plans for insert with check (public.has_club_permission(auth.uid(), club_id, 'club.settings'));
create policy plans_update on public.membership_plans for update using (public.has_club_permission(auth.uid(), club_id, 'club.settings'));
create policy plans_delete on public.membership_plans for delete using (public.has_club_permission(auth.uid(), club_id, 'club.settings'));

-- permissions / roles / role_permissions: readable reference data; mutation
-- restricted to platform admins (Section 8's matrix is fixed seed data for MVP)
create policy permissions_select on public.permissions for select using (true);
create policy roles_select on public.roles for select using (
  club_id is null or public.is_club_member(auth.uid(), club_id) or public.has_club_permission(auth.uid(), club_id, 'roles.manage')
);
create policy role_permissions_select on public.role_permissions for select using (true);

-- user_role_assignments
create policy ura_select on public.user_role_assignments for select using (
  user_id = auth.uid() or public.has_club_permission(auth.uid(), club_id, 'roles.manage')
);
create policy ura_insert on public.user_role_assignments for insert with check (public.has_club_permission(auth.uid(), club_id, 'roles.manage'));
create policy ura_update on public.user_role_assignments for update using (public.has_club_permission(auth.uid(), club_id, 'roles.manage'));
create policy ura_delete on public.user_role_assignments for delete using (public.has_club_permission(auth.uid(), club_id, 'roles.manage'));

-- members
create policy members_select on public.members for select using (
  user_id = auth.uid() or public.has_club_permission(auth.uid(), club_id, 'members.view')
);
create policy members_insert on public.members for insert with check (
  user_id = auth.uid() or public.has_club_permission(auth.uid(), club_id, 'members.edit')
);
create policy members_update on public.members for update using (
  public.has_club_permission(auth.uid(), club_id, 'members.edit')
);

-- events
create policy events_select on public.events for select using (
  status = 'published'
  or public.is_club_member(auth.uid(), club_id)
  or public.has_club_permission(auth.uid(), club_id, 'events.create')
);
create policy events_insert on public.events for insert with check (public.has_club_permission(auth.uid(), club_id, 'events.create'));
create policy events_update on public.events for update using (public.has_club_permission(auth.uid(), club_id, 'events.create'));

-- event_registrations (no club_id column -> join through events)
create policy regs_select on public.event_registrations for select using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or exists (select 1 from public.events e where e.id = event_id and public.has_club_permission(auth.uid(), e.club_id, 'events.create'))
);
create policy regs_insert on public.event_registrations for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or exists (select 1 from public.events e where e.id = event_id and public.has_club_permission(auth.uid(), e.club_id, 'events.create'))
);
create policy regs_update on public.event_registrations for update using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or exists (select 1 from public.events e where e.id = event_id and public.has_club_permission(auth.uid(), e.club_id, 'events.create'))
);

-- announcements
create policy announcements_select on public.announcements for select using (
  public.is_club_member(auth.uid(), club_id) or public.has_club_permission(auth.uid(), club_id, 'announcements.send')
);
create policy announcements_insert on public.announcements for insert with check (public.has_club_permission(auth.uid(), club_id, 'announcements.send'));
create policy announcements_update on public.announcements for update using (public.has_club_permission(auth.uid(), club_id, 'announcements.send'));

-- payments (status transitions go through confirm_mock_payment RPC, not direct UPDATE)
create policy payments_select on public.payments for select using (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or public.has_club_permission(auth.uid(), club_id, 'payments.view')
);
create policy payments_insert on public.payments for insert with check (
  exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  or public.has_club_permission(auth.uid(), club_id, 'payments.view')
);
create policy payments_update on public.payments for update using (public.has_club_permission(auth.uid(), club_id, 'payments.refund'));

-- notifications
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_insert on public.notifications for insert with check (
  club_id is null or public.has_club_permission(auth.uid(), club_id, 'announcements.send') or user_id = auth.uid()
);
create policy notifications_update on public.notifications for update using (user_id = auth.uid());

-- audit_log
create policy audit_select on public.audit_log for select using (public.has_club_permission(auth.uid(), club_id, 'audit.view'));
create policy audit_insert on public.audit_log for insert with check (actor_id = auth.uid());

-- ============================================================================
-- 15. Extra FKs purely so PostgREST can embed profiles (name/avatar) through
--     members/user_role_assignments/audit_log without a manual second query.
--     Safe because profiles.id is 1:1 with auth.users.id via the trigger above.
-- ============================================================================

alter table public.members
  add constraint members_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.user_role_assignments
  add constraint ura_user_id_profiles_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.audit_log
  add constraint audit_log_actor_id_profiles_fkey foreign key (actor_id) references public.profiles(id);

-- ============================================================================
-- 16. SEED DATA: permission catalogue + platform role (Section 8 matrix)
-- ============================================================================

insert into public.permissions (key, description) values
  ('members.view', 'View club member directory'),
  ('members.edit', 'Edit member records and status'),
  ('members.export', 'Export member data to CSV'),
  ('events.create', 'Create, edit and publish events'),
  ('events.register', 'Register for events'),
  ('payments.view', 'View payment history and revenue'),
  ('payments.refund', 'Issue refunds'),
  ('announcements.send', 'Compose and send announcements'),
  ('club.settings', 'Manage club branding, plans and settings'),
  ('roles.manage', 'Invite staff and assign roles'),
  ('audit.view', 'View the admin action audit trail')
on conflict (key) do nothing;

insert into public.roles (club_id, name, is_system) values (null, 'Platform Super Admin', true)
on conflict (club_id, name) do nothing;
