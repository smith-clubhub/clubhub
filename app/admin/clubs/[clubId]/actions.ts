"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { geocodeAddress } from "@/lib/geocoding";

export async function setClubStatusAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const status = String(formData.get("status"));

  const user = await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from("clubs").select("status").eq("id", clubId).single();
  const { error } = await supabase.from("clubs").update({ status }).eq("id", clubId);
  if (error) return;

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "club.status_changed",
    targetType: "club",
    targetId: clubId,
    before: { status: before?.status },
    after: { status },
  });

  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/admin/clubs");
}

export async function setClubPackageTierAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const packageTierId = String(formData.get("packageTierId"));

  const user = await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from("clubs").select("package_tier_id").eq("id", clubId).single();
  const { error } = await supabase.from("clubs").update({ package_tier_id: packageTierId }).eq("id", clubId);
  if (error) return;

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "club.package_tier_changed",
    targetType: "club",
    targetId: clubId,
    before: { package_tier_id: before?.package_tier_id },
    after: { package_tier_id: packageTierId },
  });

  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath("/admin/clubs");
}

export async function geocodeClubAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));

  const user = await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: club } = await supabase.from("clubs").select("address").eq("id", clubId).single();
  if (!club?.address) {
    await supabase.from("clubs").update({ geocode_status: "failed" }).eq("id", clubId);
    revalidatePath(`/admin/clubs/${clubId}`);
    return;
  }

  const result = await geocodeAddress(club.address);

  await supabase
    .from("clubs")
    .update(
      result
        ? { latitude: result.lat, longitude: result.lng, geocode_status: "ok" }
        : { geocode_status: "failed" },
    )
    .eq("id", clubId);

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "club.geocoded",
    targetType: "club",
    targetId: clubId,
    after: result ?? { failed: true },
  });

  revalidatePath(`/admin/clubs/${clubId}`);
}
