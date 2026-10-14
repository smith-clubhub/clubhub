import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFeedPage, getFollowedClubIds } from "@/lib/feed";
import { getStoryClubs, storyRingMap } from "@/lib/stories";
import { FeedList } from "@/components/ig/feed-list";
import { StoriesTray } from "@/components/ig/stories-tray";
import { SuggestedClubs } from "@/components/ig/suggested-clubs";
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

      {!userId && (
        <div className="mx-4 my-3 rounded-lg border p-4 text-center">
          <p className="font-semibold">See what&apos;s happening at SA&apos;s clubs tonight</p>
          <p className="text-sm text-muted-foreground mt-1">Log in to follow clubs, like posts and get tickets.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Link href="/auth/login" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              Log in
            </Link>
            <Link href="/auth/sign-up" className="rounded-lg bg-secondary px-4 py-1.5 text-sm font-semibold">
              Sign up
            </Link>
          </div>
        </div>
      )}

      {(mode === "discover" || feed.posts.length < 3) && (
        <SuggestedClubs clubs={(clubs ?? []) as ClubPublic[]} followedIds={followedIds} isAuthenticated={!!userId} />
      )}

      {feed.posts.length === 0 ? (
        <div className="px-8 py-16 text-center">
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
