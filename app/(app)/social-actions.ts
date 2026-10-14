"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { error: "auth_required" | "failed" };

async function getUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, userId: data.user?.id ?? null };
}

// Like/save/follow take the desired end state (not "toggle") so a double-tap
// racing a button click can never flip it back. The UI is optimistic, so we
// don't revalidate the feed on every tap.

export async function setLikeAction(postId: string, liked: boolean): Promise<Result> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "auth_required" };
  const { error } = liked
    ? await supabase.from("post_likes").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  return error ? { error: "failed" } : { ok: true };
}

export async function setSaveAction(postId: string, saved: boolean): Promise<Result> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "auth_required" };
  const { error } = saved
    ? await supabase.from("post_saves").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", userId);
  return error ? { error: "failed" } : { ok: true };
}

export async function setFollowAction(clubId: string, following: boolean): Promise<Result> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "auth_required" };
  const { error } = following
    ? await supabase.from("follows").upsert({ club_id: clubId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("follows").delete().eq("club_id", clubId).eq("user_id", userId);
  if (error) return { error: "failed" };
  revalidatePath("/");
  return { ok: true };
}

export async function addCommentAction(postId: string, body: string): Promise<Result> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "auth_required" };
  const trimmed = body.trim().slice(0, 2200);
  if (!trimmed) return { error: "failed" };
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: userId, body: trimmed });
  if (error) return { error: "failed" };
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

export async function deleteCommentAction(commentId: string, postId: string): Promise<Result> {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "auth_required" };
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) return { error: "failed" };
  revalidatePath(`/p/${postId}`);
  return { ok: true };
}

export async function markStoryViewedAction(storyId: string) {
  const { supabase, userId } = await getUserId();
  if (!userId) return;
  await supabase.from("story_views").upsert({ story_id: storyId, user_id: userId }, { ignoreDuplicates: true });
}
