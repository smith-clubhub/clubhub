"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { geocodeAddress } from "@/lib/geocoding";

export async function updateClubAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));

  const user = await requireClubPermission(clubId, "club.settings");
  const supabase = await createClient();

  const address = String(formData.get("address") ?? "").trim() || null;

  const payload: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "other"),
    contact_email: String(formData.get("contactEmail") ?? "").trim() || null,
    contact_phone: String(formData.get("contactPhone") ?? "").trim() || null,
    address,
    currency: String(formData.get("currency") ?? "ZAR").trim(),
    primary_color: String(formData.get("primaryColor") ?? "#F97316").trim(),
  };

  if (!payload.name) return { error: "Club name is required." };

  const { data: existing } = await supabase.from("clubs").select("address").eq("id", clubId).maybeSingle();
  if (address && address !== existing?.address) {
    const result = await geocodeAddress(address);
    payload.latitude = result?.lat ?? null;
    payload.longitude = result?.lng ?? null;
    payload.geocode_status = result ? "ok" : "failed";
  }

  const { error } = await supabase.from("clubs").update(payload).eq("id", clubId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "club.settings_updated",
    targetType: "club",
    targetId: clubId,
    after: payload,
  });

  revalidatePath(`/c/${slug}/admin/settings`);
  return { ok: true };
}

export async function assignRoleAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleId = String(formData.get("roleId"));

  const user = await requireClubPermission(clubId, "roles.manage");
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) {
    return { error: "No ClubHub account found for that email yet. Ask them to sign up first." };
  }

  const { error } = await supabase.from("user_role_assignments").insert({
    user_id: profile.id,
    club_id: clubId,
    role_id: roleId,
  });

  if (error) {
    return { error: error.code === "23505" ? "That person already has this role." : error.message };
  }

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "role.assigned",
    targetType: "user_role_assignment",
    after: { email, roleId },
  });

  revalidatePath(`/c/${slug}/admin/settings`);
  return { ok: true };
}

export async function removeRoleAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const assignmentId = String(formData.get("assignmentId"));

  const user = await requireClubPermission(clubId, "roles.manage");
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("user_role_assignments")
    .select("id, roles(name)")
    .eq("id", assignmentId)
    .single();
  const roleName = (assignment?.roles as unknown as { name: string } | null)?.name;

  if (roleName === "Owner") {
    const { count } = await supabase
      .from("user_role_assignments")
      .select("id, roles!inner(name)", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("roles.name", "Owner");
    if ((count ?? 0) <= 1) return;
  }

  await supabase.from("user_role_assignments").delete().eq("id", assignmentId);

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "role.removed",
    targetType: "user_role_assignment",
    targetId: assignmentId,
  });

  revalidatePath(`/c/${slug}/admin/settings`);
}
