"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getThreads } from "@/lib/direct";

type Target = { userId: string } | { clubId: string };

async function startConversation(target: Target) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "auth_required" as const };
  const { data: conversationId, error } = await supabase.rpc(
    "start_conversation",
    "clubId" in target ? { p_club_id: target.clubId } : { p_user_id: target.userId },
  );
  if (error || !conversationId) return { error: "failed" as const };
  return { conversationId: conversationId as string };
}

/** Opens (or creates) the viewer's thread with a club and navigates to it. */
export async function messageClubAction(clubId: string) {
  const res = await startConversation({ clubId });
  if ("error" in res) return res;
  redirect(`/direct/${res.conversationId}`);
}

export async function messageUserAction(userId: string) {
  const res = await startConversation({ userId });
  if ("error" in res) return res;
  redirect(`/direct/${res.conversationId}`);
}

export interface SendPayload {
  body?: string;
  sharedPostId?: string;
  sharedEventId?: string;
  sharedClubId?: string;
  asClub?: boolean;
}

export async function sendMessageAction(conversationId: string, payload: SendPayload) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "auth_required" as const };

  const body = payload.body?.trim().slice(0, 2000) || null;
  if (!body && !payload.sharedPostId && !payload.sharedEventId && !payload.sharedClubId) {
    return { error: "empty" as const };
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: data.user.id,
      as_club: payload.asClub ?? false,
      body,
      shared_post_id: payload.sharedPostId ?? null,
      shared_event_id: payload.sharedEventId ?? null,
      shared_club_id: payload.sharedClubId ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: "failed" as const };
  revalidatePath("/direct");
  return { message };
}

/** Sends a post/event/club into one or more threads (the Share sheet). */
export async function shareToConversationsAction(
  conversationIds: string[],
  share: { sharedPostId?: string; sharedEventId?: string; sharedClubId?: string },
  note?: string,
) {
  for (const id of conversationIds.slice(0, 20)) {
    const res = await sendMessageAction(id, { ...share, body: note });
    if ("error" in res) return res;
  }
  return { ok: true as const };
}

/** Starts a thread with a user (by id) and shares into it in one go. */
export async function shareToUserAction(
  userId: string,
  share: { sharedPostId?: string; sharedEventId?: string; sharedClubId?: string },
  note?: string,
) {
  const res = await startConversation({ userId });
  if ("error" in res) return res;
  return shareToConversationsAction([res.conversationId], share, note);
}

export async function markConversationReadAction(conversationId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", data.user.id);
}

export interface ShareTarget {
  kind: "thread" | "user";
  id: string;
  title: string;
  avatarUrl: string | null;
  isClub: boolean;
}

/** Recent personal threads + (optionally) users matching a username search, for the share sheet. */
export async function shareTargetsAction(query: string): Promise<ShareTarget[]> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return [];
  const userId = data.user.id;
  const term = query.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");

  if (term) {
    const { data: users } = await supabase
      .from("profiles_public")
      .select("id, username, avatar_url")
      .ilike("username", `%${term}%`)
      .neq("id", userId)
      .limit(20);
    return (users ?? []).map((u) => ({
      kind: "user" as const,
      id: u.id as string,
      title: u.username as string,
      avatarUrl: u.avatar_url as string | null,
      isClub: false,
    }));
  }

  const threads = await getThreads(userId, null);
  return threads.slice(0, 20).map((t) => ({
    kind: "thread" as const,
    id: t.id,
    title: t.title,
    avatarUrl: t.avatarUrl,
    isClub: t.isClub,
  }));
}
