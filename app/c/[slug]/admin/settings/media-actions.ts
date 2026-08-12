"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { bucketForKind } from "@/lib/media-paths";
import type { MediaKind } from "@/lib/types";

export async function recordMediaAssetAction(params: {
  clubId: string;
  slug: string;
  kind: MediaKind;
  storagePath: string;
  sizeBytes: number;
}) {
  const { clubId, slug, kind, storagePath, sizeBytes } = params;
  const user = await requireClubPermission(clubId, "club.settings");
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucketForKind(kind)).getPublicUrl(storagePath);

  if (kind === "logo" || kind === "cover") {
    const column = kind === "logo" ? "logo_url" : "cover_image_url";
    const { error } = await supabase.from("clubs").update({ [column]: publicUrl }).eq("id", clubId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("club_media_assets").insert({
      club_id: clubId,
      kind,
      storage_path: storagePath,
      url: publicUrl,
      uploaded_by: user.id,
      size_bytes: sizeBytes,
    });
    if (error) return { error: error.message };
  }

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "media.uploaded",
    targetType: "club_media_asset",
    after: { kind, storagePath },
  });

  revalidatePath(`/c/${slug}/admin/settings`);
  return { ok: true };
}

export async function deleteMediaAssetAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const assetId = String(formData.get("assetId"));

  const user = await requireClubPermission(clubId, "club.settings");
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("club_media_assets")
    .select("id, kind, storage_path")
    .eq("id", assetId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (!asset) return;

  await supabase.storage.from(bucketForKind(asset.kind)).remove([asset.storage_path]);
  await supabase.from("club_media_assets").delete().eq("id", assetId);

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "media.deleted",
    targetType: "club_media_asset",
    targetId: assetId,
  });

  revalidatePath(`/c/${slug}/admin/settings`);
}
