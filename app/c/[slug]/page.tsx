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
import type { ClubStats, PostFeedItem } from "@/lib/types";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center md:flex-row md:gap-1.5">
      <span className="font-semibold">{value.toLocaleString("en-ZA")}</span>
      <span className="text-muted-foreground md:text-foreground text-sm md:text-base">{label}</span>
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
      {/* Header */}
      <section className="flex items-center gap-6 md:gap-20 md:px-10 md:py-4">
        <Link href={story ? `/stories/${club.slug}` : `/c/${club.slug}`} className="shrink-0">
          {[
            { size: 86, cls: "md:hidden" },
            { size: 150, cls: "hidden md:block" },
          ].map(({ size, cls }) => (
            <span key={size} className={cls}>
              <ClubAvatar
                url={club.logo_url}
                name={club.name}
                size={size}
                ring={story ? (story.allSeen ? "seen" : "unseen") : "none"}
              />
            </span>
          ))}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="hidden md:flex items-center gap-3">
            <h1 className="text-xl">{club.slug}</h1>
          </div>
          <div className="flex justify-around md:justify-start md:gap-10">
            <Stat value={s.post_count} label="posts" />
            <Stat value={s.follower_count} label="followers" />
            <Stat value={s.upcoming_event_count} label="events" />
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold">{club.name}</p>
            <p className="text-muted-foreground capitalize">{club.category} club</p>
            {club.description && <p className="whitespace-pre-line mt-1">{club.description}</p>}
          </div>
        </div>
      </section>

      {/* Mobile bio */}
      <div className="md:hidden pt-3 text-sm">
        <p className="font-semibold">{club.name}</p>
        <p className="text-muted-foreground capitalize">{club.category} club</p>
        {club.description && <p className="whitespace-pre-line mt-1">{club.description}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 md:px-10">
        <FollowButton
          clubId={club.id}
          initialFollowing={!!follow}
          isAuthenticated={!!userId}
          className="flex-1 md:flex-none md:min-w-[120px]"
        />
        <MessageClubButton clubId={club.id} isAuthenticated={!!userId} />
        {directions && (
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-4 py-1.5 text-sm font-semibold hover:bg-secondary/80"
          >
            <Navigation className="size-4" /> Directions
          </a>
        )}
        <ShareButton
          kind="club"
          id={club.id}
          slug={club.slug}
          isAuthenticated={!!userId}
          className="inline-flex items-center justify-center rounded-lg bg-secondary px-3 py-1.5 hover:bg-secondary/80"
        >
          <Send className="size-4" />
        </ShareButton>
        {isStaff && (
          <Link
            href={`/c/${club.slug}/admin`}
            aria-label="Manage club"
            className="inline-flex items-center justify-center rounded-lg bg-secondary px-3 py-1.5 hover:bg-secondary/80"
          >
            <Settings className="size-4" />
          </Link>
        )}
      </div>

      {/* Membership */}
      <div className="pt-3 md:px-10">
        {membership ? (
          <Link
            href={`/c/${club.slug}/card`}
            className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-accent"
          >
            <IdCard className="size-5" />
            <span className="flex-1">
              Member{membership.member_number ? ` #${membership.member_number}` : ""} ·{" "}
              <span className="capitalize">{computeEffectiveStatus(membership)}</span>
            </span>
            <span className="font-semibold text-primary">View card</span>
          </Link>
        ) : (
          userId && (
            <Link
              href={`/c/${club.slug}/join`}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-accent"
            >
              <IdCard className="size-5" />
              <span className="flex-1">Become a member for perks and member-only events</span>
              <span className="font-semibold text-primary">Join</span>
            </Link>
          )
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex justify-center gap-14 border-t">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/c/${club.slug}${t.key === "posts" ? "" : `?tab=${t.key}`}`}
            scroll={false}
            className={cn(
              "-mt-px flex items-center gap-1.5 border-t py-3 text-xs font-semibold uppercase tracking-widest",
              tab === t.key ? "border-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            <t.icon className="size-4" />
            <span className="hidden sm:inline">{t.label}</span>
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
                    <div className="ig-gradient h-full w-full" />
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
