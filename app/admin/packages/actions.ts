"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function updatePackageTierAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const tierId = String(formData.get("tierId"));
  const user = await requirePlatformAdmin();
  const supabase = await createClient();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    price_cents: Math.max(0, Math.round(Number(formData.get("priceCents") ?? 0))),
    photo_quota: Math.max(0, Math.round(Number(formData.get("photoQuota") ?? 0))),
    video_quota: Math.max(0, Math.round(Number(formData.get("videoQuota") ?? 0))),
    streaming_enabled: formData.get("streamingEnabled") === "on",
    is_active: formData.get("isActive") === "on",
  };

  if (!payload.name) return { error: "Package name is required." };

  const { error } = await supabase.from("club_package_tiers").update(payload).eq("id", tierId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    clubId: null,
    actorId: user.id,
    action: "package_tier.updated",
    targetType: "club_package_tier",
    targetId: tierId,
    after: payload,
  });

  revalidatePath("/admin/packages");
  return { ok: true };
}
