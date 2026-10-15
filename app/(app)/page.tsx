import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFeedPage, getFollowedClubIds } from "@/lib/feed";
import { getStoryClubs, storyRingMap } from "@/lib/stories";
import { FeedList } from "@/components/ig/feed-list";
import { StoriesTray } from "@/components/ig/stories-tray";
import { SuggestedClubs } from "@/components/ig/suggested-clubs";
import { BrandMark } from "@/components/ig/brand";
import { InstallPrompt } from "@/components/ig/pwa";
import type { ClubPublic } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const followedIds = await getFollowedClubIds(userId);
  const mode = followedIds.length > 0 ? "following" : "discover";

  const [feed, storyClubs, { data: clubs }] = await Promise.all([
    getFeedPage(userId, mode, null),
    getStoryClubs(userId, followedIds),
    supabase.from("clubs_public").select("*").limit(200),
  ]);

  return (
    <main className="mx-auto w-full max-w-[470px] md:pt-6">
      <StoriesTray clubs={storyClubs} />
      <InstallPrompt />

      {!userId && (
        <section className="brand-tile relative mx-3 my-3 overflow-hidden rounded-3xl p-5 text-white">
          <BrandMark size={150} className="absolute -right-8 -top-8 text-white/15" />
          <p className="relative text-2xl font-bold leading-tight">
            Your city&apos;s nightlife,
            <br />
            one tap away.
          </p>
          <p className="relative mt-1.5 text-sm text-white/90">
            Follow SA clubs, see what&apos;s on tonight and find the dance floor nearest you.
          </p>
          <div className="relative mt-4 flex gap-2">
            <Link href="/auth/sign-up" className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#c63d0f]">
              Join ClubHub
            </Link>
            <Link href="/auth/login" className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold backdrop-blur">
              Log in
            </Link>
          </div>
        </section>
      )}

      {(mode === "discover" || feed.posts.length < 3) && (
        <SuggestedClubs clubs={(clubs ?? []) as ClubPublic[]} followedIds={followedIds} isAuthenticated={!!userId} />
      )}

      {feed.posts.length === 0 ? (
        <div className="px-8 py-16 text-center">
          <BrandMark size={56} className="mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "following"
              ? "The clubs you follow haven't posted yet. Find more on the map."
              : "Follow clubs near you and their posts and events will show up here."}
          </p>
          <Link href="/map" className="inline-block mt-4 text-sm font-semibold text-primary">
            Open the map
          </Link>
        </div>
      ) : (
        <FeedList
          mode={mode}
          initialPosts={feed.posts}
          initialViewerState={feed.viewerState}
          initialCursor={feed.nextCursor}
          isAuthenticated={!!userId}
          storyRings={storyRingMap(storyClubs)}
        />
      )}
    </main>
  );
}
