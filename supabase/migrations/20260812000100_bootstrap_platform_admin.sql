-- Grants the platform owner the seeded 'Platform Super Admin' role
-- (roles.club_id is null). Idempotent -- safe to re-run.
--
-- IMPORTANT: this only takes effect once a profiles row exists for the
-- address below, i.e. the platform owner must sign up through the normal
-- /auth/sign-up flow first, then this statement can be re-run from the
-- Supabase SQL editor to grant the role.

insert into public.user_role_assignments (user_id, club_id, role_id)
select p.id, null, r.id
from public.profiles p, public.roles r
where p.email = 'ntuthukosmith10@gmail.com'
  and r.club_id is null
  and r.name = 'Platform Super Admin'
on conflict (user_id, club_id, role_id) do nothing;
