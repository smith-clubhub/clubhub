import { createClient } from "@/lib/supabase/server";
import { getFollowedClubIds } from "@/lib/feed";
import { ClubMap, type MapEvent } from "@/components/ig/club-map";
import type { ClubPublic } from "@/lib/types";

export const metadata = { title: "Clubs near you · ClubHub" };

export default async function MapPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [{ data: clubs }, { data: events }, followedIds] = await Promise.all([
    supabase.from("clubs_public").select("*").limit(500),
    supabase
      .from("events_public")
      .select("id, club_id, title, start_at, end_at, price_cents, currency, cover_image_url")
      // end_at is optional, so include events that started up to 12h ago (still on tonight).
      .gte("start_at", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte("start_at", weekAhead.toISOString())
      .order("start_at")
      .limit(1000),
    getFollowedClubIds(userId),
  ]);

  return (
    <ClubMap
      clubs={(clubs ?? []) as ClubPublic[]}
      events={(events ?? []) as MapEvent[]}
      followedIds={followedIds}
      isAuthenticated={!!userId}
    />
  );
}
