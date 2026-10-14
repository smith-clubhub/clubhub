import Link from "next/link";
import { CalendarDays, Grid3x3, IdCard, Navigation, Send, Settings } from "lucide-react";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { computeEffectiveStatus } from "@/lib/membership";
import { getStoryClubs } from "@/lib/stories";
import { eventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ClubAvatar } from "@/components/ig/avatars";
import { FollowButton } from "@/components/ig/follow-button";
import { PostGrid } from "@/components/ig/post-grid";
import { MessageClubButton } from "@/components/ig/message-club-button";
import { ShareButton } from "@/components/ig/share-button";
import { DistancePill } from "@/components/ig/distance-pill";
import type { ClubStats, PostFeedItem } from "@/lib/types";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-secondary py-2.5">
      <span className="text-lg font-bold leading-none">{value.toLocaleString("en-ZA")}</span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default async function ClubProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "posts" } = await searchParams;
  const ctx = await getClubContext(slug);
  const { club, userId, membership, staffRoles } = ctx;
  const supabase = await createClient();

  const [{ data: stats }, { data: follow }, { data: posts }, { data: events }, storyClubs] = await Promise.all([
    supabase.from("club_stats").select("*").eq("club_id", club.id).maybeSingle(),
    userId
      ? supabase.from("follows").select("club_id").eq("club_id", club.id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("posts_feed").select("*").eq("club_id", club.id).order("created_at", { ascending: false }).limit(60),
    supabase
      .from("events")
      .select("id, title, start_at, cover_image_url, price_cents, currency")
      .eq("club_id", club.id)
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(30),
    getStoryClubs(userId, []),
  ]);

  const s = (stats ?? { follower_count: 0, post_count: 0, upcoming_event_count: 0 }) as ClubStats;
  const story = storyClubs.find((c) => c.clubId === club.id);
  const isStaff = staffRoles.length > 0;
  const directions =
    club.latitude != null && club.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}`
      : club.address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(club.address)}`
        : null;

  const tabs = [
    { key: "posts", label: "Posts", icon: Grid3x3 },
    { key: "events", label: "Events", icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col">
      {/* Cover + avatar */}
      <div className="relative">
        <div className="h-36 overflow-hidden rounded-3xl md:h-56">
          {club.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.cover_image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="brand-tile h-full w-full" />
          )}
        </div>
        <Link
          href={story ? `/stories/${club.slug}` : `/c/${club.slug}`}
          className="absolute -bottom-12 left-4 rounded-[34%] bg-background p-1 md:left-8"
        >
          <ClubAvatar url={club.logo_url} name={club.name} size={104} ring={story ? (story.allSeen ? "seen" : "unseen") : "none"} />
        </Link>
      </div>

      {/* Identity */}
      <section className="px-1 pt-14 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{club.name}</h1>
          <DistancePill lat={club.latitude} lng={club.longitude} />
        </div>
        <p className="text-sm text-muted-foreground">
          @{club.slug} · <span className="capitalize">{club.category}</span>
        </p>
        {club.description && <p className="mt-2 whitespace-pre-line text-[15px]">{club.description}</p>}

        <div className="mt-4 grid grid-cols-3 gap-2 md:max-w-md">
          <Stat value={s.post_count} label="posts" />
          <Stat value={s.follower_count} label="followers" />
          <Stat value={s.upcoming_event_count} label="upcoming" />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <FollowButton
            clubId={club.id}
            initialFollowing={!!follow}
            isAuthenticated={!!userId}
            className="flex-1 rounded-full py-2 md:flex-none md:min-w-[130px]"
          />
          <MessageClubButton clubId={club.id} isAuthenticated={!!userId} />
          {directions && (
            <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 px-3 sm:px-4" aria-label="Directions">
              <Navigation className="size-4" />
              <span className="hidden sm:inline">Directions</span>
            </a>
          )}
          <ShareButton kind="club" id={club.id} slug={club.slug} isAuthenticated={!!userId} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 px-3">
            <Send className="size-4" />
          </ShareButton>
          {isStaff && (
            <Link href={`/c/${club.slug}/admin`} aria-label="Manage club" className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 px-3">
              <Settings className="size-4" />
            </Link>
          )}
        </div>

        {/* Membership */}
        {(membership || userId) && (
          <Link
            href={membership ? `/c/${club.slug}/card` : `/c/${club.slug}/join`}
            className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-accent/40 px-4 py-3 text-sm hover:bg-accent"
          >
            <IdCard className="size-5 text-primary" />
            <span className="flex-1">
              {membership ? (
                <>
                  Member{membership.member_number ? ` #${membership.member_number}` : ""} ·{" "}
                  <span className="capitalize">{computeEffectiveStatus(membership)}</span>
                </>
              ) : (
                "Become a member for perks and member-only events"
              )}
            </span>
            <span className="font-semibold text-primary">{membership ? "View card" : "Join"}</span>
          </Link>
        )}
      </section>

      {/* Tabs: segmented control */}
      <div className="mx-auto mt-6 mb-4 inline-flex rounded-full bg-secondary p-1 md:mx-8 md:self-start">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/c/${club.slug}${t.key === "posts" ? "" : `?tab=${t.key}`}`}
            scroll={false}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-background text-primary shadow-sm" : "text-muted-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "events" ? (
        (events ?? []).length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">No upcoming events.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            {(events ?? []).map((e) => (
              <Link key={e.id} href={`/c/${club.slug}/events/${e.id}`} className="group overflow-hidden rounded-lg border">
                <div className="aspect-[4/5] bg-muted relative">
                  {e.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="brand-tile h-full w-full" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                    <p className="text-xs opacity-90">{eventWhen(e.start_at)}</p>
                    <p className="font-semibold leading-tight line-clamp-2">{e.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (posts ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-2xl font-extrabold">No posts yet</p>
          {isStaff && (
            <Link href="/create" className="mt-2 inline-block text-sm font-semibold text-primary">
              Share your first post
            </Link>
          )}
        </div>
      ) : (
        <PostGrid posts={(posts ?? []) as PostFeedItem[]} />
      )}
    </div>
  );
}
