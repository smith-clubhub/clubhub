import { createClient } from "@/lib/supabase/server";
import type { PostFeedItem } from "@/lib/types";
import type { PostViewerState } from "@/components/ig/post-card";

export const FEED_PAGE_SIZE = 12;

export type FeedMode = "following" | "discover";

export interface FeedPage {
  posts: PostFeedItem[];
  viewerState: Record<string, PostViewerState>;
  nextCursor: string | null;
}

/** Liked/saved flags for the viewer across a set of posts. */
export async function getPostViewerState(userId: string | null, postIds: string[]) {
  const state: Record<string, PostViewerState> = {};
  for (const id of postIds) state[id] = { liked: false, saved: false };
  if (!userId || postIds.length === 0) return state;

  const supabase = await createClient();
  const [{ data: likes }, { data: saves }] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
    supabase.from("post_saves").select("post_id").eq("user_id", userId).in("post_id", postIds),
  ]);
  for (const l of likes ?? []) state[l.post_id]!.liked = true;
  for (const s of saves ?? []) state[s.post_id]!.saved = true;
  return state;
}

export async function getFollowedClubIds(userId: string | null) {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("club_id").eq("user_id", userId);
  return (data ?? []).map((f) => f.club_id as string);
}

/**
 * One page of the home feed, newest first. "following" = clubs the viewer
 * follows; "discover" = every club (used when the viewer follows nobody yet).
 * Cursor is the created_at of the last post on the previous page.
 */
export async function getFeedPage(userId: string | null, mode: FeedMode, cursor: string | null): Promise<FeedPage> {
  const supabase = await createClient();
  let query = supabase.from("posts_feed").select("*").order("created_at", { ascending: false }).limit(FEED_PAGE_SIZE);

  if (mode === "following") {
    const clubIds = await getFollowedClubIds(userId);
    if (clubIds.length === 0) return { posts: [], viewerState: {}, nextCursor: null };
    query = query.in("club_id", clubIds);
  }
  if (cursor) query = query.lt("created_at", cursor);

  const { data } = await query;
  const posts = (data ?? []) as PostFeedItem[];
  const viewerState = await getPostViewerState(userId, posts.map((p) => p.id));
  const nextCursor = posts.length === FEED_PAGE_SIZE ? posts[posts.length - 1]!.created_at : null;
  return { posts, viewerState, nextCursor };
}
