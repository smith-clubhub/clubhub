-- DEV/DEMO SEED -- not a migration. Run manually in the Supabase SQL editor to
-- give the Instagram-style UI something to show: 10 fictional clubs around
-- Johannesburg, Pretoria, Durban and Cape Town with posts, stories and events.
-- Everything it creates has a slug starting with 'demo-' -- see the teardown
-- at the bottom to remove it all again. Images are placeholder photos from
-- picsum.photos.

do $$
declare
  v_tier uuid := (select id from public.club_package_tiers where key = 'growth');
  v_club uuid;
  v_post uuid;
  v_event uuid;
  r record;
  i int;
  captions text[] := array[
    'Friday energy was unmatched 🔥 Thank you to everyone who pulled through!',
    'New sound system installed. Come feel it this weekend.',
    'Amapiano Sundays are back. Doors open 2pm.',
    'Rooftop sunsets hit different 🌇',
    'Shout out to the crew behind the decks last night 🙌',
    'Booth bookings open for the long weekend. DM us.',
    'Throwback to a packed dance floor.',
    'Golden hour on the terrace ✨'
  ];
begin
  for r in
    select * from (values
      ('demo-neon-yard',       'Neon Yard',         'Braamfontein''s late-night warehouse. Techno, house & amapiano till late.', -26.1929, 28.0347, '73 Juta St, Braamfontein, Johannesburg'),
      ('demo-maboneng-vault',  'Maboneng Vault',    'Underground sounds in the heart of Maboneng.',                             -26.2044, 28.0590, 'Fox St, Maboneng, Johannesburg'),
      ('demo-rosebank-roof',   'Rosebank Roof',     'Rooftop lounge, sunset sets, cocktails. Dress code: smart casual.',         -26.1467, 28.0410, 'Cradock Ave, Rosebank, Johannesburg'),
      ('demo-sandton-pulse',   'Pulse Sandton',     'Premium nightlife. Bottle service & international DJs.',                    -26.1076, 28.0567, 'Rivonia Rd, Sandton'),
      ('demo-melville-social', 'Melville Social',   'Your local on 7th Street. Live music Thursdays.',                           -26.1760, 28.0090, '7th St, Melville, Johannesburg'),
      ('demo-hatfield-hub',    'Hatfield Hub',      'Student nights every Wednesday. Pretoria''s favourite dance floor.',        -25.7487, 28.2380, 'Burnett St, Hatfield, Pretoria'),
      ('demo-florida-road',    'Florida Road Lounge','Durban vibes, gqom & house. Open till sunrise on Saturdays.',              -29.8329, 31.0218, 'Florida Rd, Morningside, Durban'),
      ('demo-long-street',     'Long Street Live',  'Cape Town''s party street, our dance floor.',                               -33.9245, 18.4170, 'Long St, Cape Town'),
      ('demo-bree-basement',   'Bree Basement',     'Deep house in an old Bree Street cellar.',                                  -33.9198, 18.4195, 'Bree St, Cape Town'),
      ('demo-woodstock-works', 'Woodstock Works',   'Day parties, food trucks & local DJs every weekend.',                       -33.9270, 18.4460, 'Albert Rd, Woodstock, Cape Town')
    ) as t(slug, name, description, lat, lng, address)
  loop
    insert into public.clubs (name, slug, description, category, status, address, latitude, longitude, geocode_status, package_tier_id, logo_url, cover_image_url)
    values (r.name, r.slug, r.description, 'social', 'active', r.address, r.lat, r.lng, 'ok', v_tier,
            'https://picsum.photos/seed/' || r.slug || '-logo/300',
            'https://picsum.photos/seed/' || r.slug || '-cover/1200/600')
    on conflict (slug) do nothing
    returning id into v_club;

    continue when v_club is null; -- already seeded

    -- 3-5 photo/carousel posts spread over the past 2 weeks
    for i in 1 .. 3 + (abs(hashtext(r.slug)) % 3) loop
      insert into public.posts (club_id, caption, kind, created_at)
      values (v_club, captions[1 + (abs(hashtext(r.slug || i)) % array_length(captions, 1))],
              case when i % 3 = 0 then 'carousel' else 'photo' end,
              now() - make_interval(hours => i * 31 + (abs(hashtext(r.slug)) % 20)))
      returning id into v_post;

      insert into public.club_media_assets (club_id, kind, storage_path, url, post_id, position)
      select v_club, 'post_photo', 'demo/' || v_post || '/' || n,
             'https://picsum.photos/seed/' || v_post || '-' || n || '/1080', v_post, n
      from generate_series(0, case when i % 3 = 0 then 2 else 0 end) n;
    end loop;

    -- An event tonight and one later this week (publishing creates the event post)
    insert into public.events (club_id, title, description, location, start_at, end_at, price_cents, status, cover_image_url, capacity)
    values (v_club, r.name || ' Tonight: Resident DJs', 'Doors 21:00. Early arrival recommended.', r.address,
            date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg' + interval '21 hours',
            date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg' + interval '28 hours',
            (abs(hashtext(r.slug)) % 4) * 5000, 'published',
            'https://picsum.photos/seed/' || r.slug || '-ev1/1080', 300);

    insert into public.events (club_id, title, description, location, start_at, end_at, price_cents, status, cover_image_url, capacity)
    values (v_club, 'Saturday Sessions @ ' || r.name, 'Headline set from 23:00.', r.address,
            date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg' + interval '4 days 22 hours',
            date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg' + interval '5 days 4 hours',
            15000, 'published', null, 500);

    -- Stories for every other club
    if abs(hashtext(r.slug)) % 2 = 0 then
      insert into public.stories (club_id, storage_path, media_url, kind, created_at, expires_at)
      select v_club, 'demo/story/' || r.slug || n, 'https://picsum.photos/seed/' || r.slug || '-story' || n || '/1080/1920',
             'photo', now() - make_interval(hours => n), now() - make_interval(hours => n) + interval '24 hours'
      from generate_series(1, 3) n;
    end if;
  end loop;
end $$;

-- ============================================================================
-- TEARDOWN (run to remove all demo data; posts/media/stories/events cascade):
-- delete from public.clubs where slug like 'demo-%';
-- ============================================================================
