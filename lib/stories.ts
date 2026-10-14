import { createClient } from "@/lib/supabase/server";
import type { Story } from "@/lib/types";

export interface StoryClub {
  clubId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  stories: Story[];
  allSeen: boolean;
  followed: boolean;
}

/**
 * Clubs with live (unexpired) stories, ordered like Instagram's tray:
 * followed clubs with unseen stories first, then other followed, then the rest.
 */
export async function getStoryClubs(userId: string | null, followedIds: string[]): Promise<StoryClub[]> {
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("*, clubs!inner(slug, name, logo_url, status)")
    .gt("expires_at", new Date().toISOString())
    .eq("clubs.status", "active")
    .order("created_at", { ascending: true })
    .limit(500);
  if (!stories || stories.length === 0) return [];

  let seen = new Set<string>();
  if (userId) {
    const { data: views } = await supabase
      .from("story_views")
      .select("story_id")
      .eq("user_id", userId)
      .in("story_id", stories.map((s) => s.id));
    seen = new Set((views ?? []).map((v) => v.story_id as string));
  }

  const byClub = new Map<string, StoryClub>();
  for (const row of stories) {
    const club = row.clubs as unknown as { slug: string; name: string; logo_url: string | null };
    let entry = byClub.get(row.club_id);
    if (!entry) {
      entry = {
        clubId: row.club_id,
        slug: club.slug,
        name: club.name,
        logoUrl: club.logo_url,
        stories: [],
        allSeen: true,
        followed: followedIds.includes(row.club_id),
      };
      byClub.set(row.club_id, entry);
    }
    const { clubs: _club, ...story } = row;
    void _club;
    entry.stories.push(story as Story);
    if (!seen.has(row.id)) entry.allSeen = false;
  }

  const rank = (c: StoryClub) => (c.followed ? 0 : 2) + (c.allSeen ? 1 : 0);
  return [...byClub.values()].sort((a, b) => rank(a) - rank(b));
}

export function storyRingMap(clubs: StoryClub[]): Record<string, "unseen" | "seen"> {
  return Object.fromEntries(clubs.map((c) => [c.clubId, c.allSeen ? "seen" : "unseen"]));
}
