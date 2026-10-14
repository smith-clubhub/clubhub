"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasClubPermission } from "@/lib/rbac";
import { getClubMediaUsage } from "@/lib/media";

const BUCKET = "club-gallery";
const MAX_POST_MEDIA = 10;

export interface UploadedMedia {
  storagePath: string;
  kind: "post_photo" | "post_video";
  sizeBytes: number;
}

function ownsPath(clubId: string, path: string) {
  return path.startsWith(`${clubId}/posts/`) || path.startsWith(`${clubId}/stories/`);
}

/** Checked before the browser uploads anything, so a full quota never leaves orphaned files. */
export async function preflightPostAction(clubId: string, photos: number, videos: number) {
  if (!(await hasClubPermission(clubId, "posts.create"))) {
    return { error: "You don't have permission to post for this club." };
  }
  if (photos + videos === 0) return { error: "Add at least one photo or video." };
  if (photos + videos > MAX_POST_MEDIA) return { error: `A post can have at most ${MAX_POST_MEDIA} photos/videos.` };

  const usage = await getClubMediaUsage(clubId);
  if (usage.photoCount + photos > usage.photoQuota) {
    return {
      error: `Your ${usage.tierName} package allows ${usage.photoQuota} photos and you've used ${usage.photoCount}. Upgrade your package to post more.`,
    };
  }
  if (usage.videoCount + videos > usage.videoQuota) {
    return {
      error:
        usage.videoQuota === 0
          ? `Videos aren't included in the ${usage.tierName} package. Upgrade to post videos.`
          : `Your ${usage.tierName} package allows ${usage.videoQuota} videos and you've used ${usage.videoCount}.`,
    };
  }
  return { ok: true as const };
}

/** Removes uploaded files when a later step fails (best effort). */
export async function discardUploadsAction(clubId: string, paths: string[]) {
  if (!(await hasClubPermission(clubId, "posts.create"))) return;
  const safe = paths.filter((p) => ownsPath(clubId, p));
  if (safe.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove(safe);
}

export async function createPostAction(input: { clubId: string; caption: string; media: UploadedMedia[] }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Please log in again." };

  const media = input.media.filter((m) => ownsPath(input.clubId, m.storagePath)).slice(0, MAX_POST_MEDIA);
  if (media.length === 0) return { error: "Add at least one photo or video." };

  const kind = media.length > 1 ? "carousel" : media[0]!.kind === "post_video" ? "video" : "photo";
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      club_id: input.clubId,
      author_id: userData.user.id,
      caption: input.caption.trim().slice(0, 2200) || null,
      kind,
    })
    .select("id")
    .single();

  if (postError || !post) {
    await discardUploadsAction(input.clubId, media.map((m) => m.storagePath));
    return { error: "Couldn't create the post." };
  }

  const { error: mediaError } = await supabase.from("club_media_assets").insert(
    media.map((m, i) => ({
      club_id: input.clubId,
      kind: m.kind,
      storage_path: m.storagePath,
      url: supabase.storage.from(BUCKET).getPublicUrl(m.storagePath).data.publicUrl,
      uploaded_by: userData.user!.id,
      size_bytes: m.sizeBytes,
      post_id: post.id,
      position: i,
    })),
  );

  if (mediaError) {
    // Roll back: the post (cascades media rows) and the files in storage.
    await supabase.from("posts").delete().eq("id", post.id);
    await discardUploadsAction(input.clubId, media.map((m) => m.storagePath));
    return {
      error: mediaError.message.includes("quota")
        ? "Media quota exceeded for this club's package tier."
        : "Couldn't save the post's media.",
    };
  }

  revalidatePath("/");
  return { postId: post.id as string };
}

export async function createStoryAction(input: { clubId: string; storagePath: string; kind: "photo" | "video" }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Please log in again." };
  if (!ownsPath(input.clubId, input.storagePath)) return { error: "Invalid upload." };

  const { error } = await supabase.from("stories").insert({
    club_id: input.clubId,
    author_id: userData.user.id,
    storage_path: input.storagePath,
    media_url: supabase.storage.from(BUCKET).getPublicUrl(input.storagePath).data.publicUrl,
    kind: input.kind,
  });

  if (error) {
    await discardUploadsAction(input.clubId, [input.storagePath]);
    return { error: error.message.includes("30 stories") ? error.message : "Couldn't post the story." };
  }

  revalidatePath("/");
  return { ok: true as const };
}
