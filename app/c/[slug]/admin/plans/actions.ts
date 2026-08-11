"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";

export async function savePlanAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const planId = String(formData.get("planId") || "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const billingInterval = String(formData.get("billingInterval") ?? "annual");
  const gracePeriodDays = Number(formData.get("gracePeriodDays") ?? 0);
  const maxMembers = formData.get("maxMembers") ? Number(formData.get("maxMembers")) : null;

  if (!name) return { error: "Plan name is required." };
  if (Number.isNaN(price) || price < 0) return { error: "Price must be a positive number." };

  await requireClubPermission(clubId, "club.settings");
  const supabase = await createClient();

  const payload = {
    club_id: clubId,
    name,
    description,
    price_cents: Math.round(price * 100),
    billing_interval: billingInterval,
    grace_period_days: gracePeriodDays,
    max_members: maxMembers,
  };

  const { error } = planId
    ? await supabase.from("membership_plans").update(payload).eq("id", planId)
    : await supabase.from("membership_plans").insert(payload);

  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}/admin/plans`);
  return { ok: true };
}

export async function togglePlanActiveAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const planId = String(formData.get("planId"));
  const isActive = formData.get("isActive") === "true";

  await requireClubPermission(clubId, "club.settings");
  const supabase = await createClient();
  await supabase.from("membership_plans").update({ is_active: !isActive }).eq("id", planId);

  revalidatePath(`/c/${slug}/admin/plans`);
}
