"use server";

import { createClient } from "@/lib/supabase/server";
import { getFeedPage, type FeedMode } from "@/lib/feed";

export async function loadFeedPageAction(mode: FeedMode, cursor: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return getFeedPage(data.user?.id ?? null, mode, cursor);
}
