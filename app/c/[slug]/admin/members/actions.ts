"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export async function updateMemberStatusAction(
  _prevState: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const memberId = String(formData.get("memberId"));
  const newStatus = String(formData.get("status"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { error: "A reason is required for status changes." };
  }

  const user = await requireClubPermission(clubId, "members.edit");
  const supabase = await createClient();

  const { data: before } = await supabase.from("members").select("*").eq("id", memberId).single();

  const { error } = await supabase.from("members").update({ status: newStatus }).eq("id", memberId);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "member.status_changed",
    targetType: "member",
    targetId: memberId,
    reason,
    before: { status: before?.status },
    after: { status: newStatus },
  });

  revalidatePath(`/c/${slug}/admin/members`);
  revalidatePath(`/c/${slug}/admin/members/${memberId}`);
  return { ok: true };
}

export async function addMemberByEmailAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const planId = String(formData.get("planId") || "") || null;
  const status = String(formData.get("status") || "active");

  if (!email) return { error: "Email is required." };

  const user = await requireClubPermission(clubId, "members.edit");
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();

  if (!profile) {
    return {
      error:
        "No ClubHub account found for that email yet. Ask them to sign up first, then add them here.",
    };
  }

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      user_id: profile.id,
      club_id: clubId,
      membership_plan_id: planId,
      status,
      joined_at: status === "active" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    clubId,
    actorId: user.id,
    action: "member.added",
    targetType: "member",
    targetId: member.id,
    after: { email, status },
  });

  revalidatePath(`/c/${slug}/admin/members`);
  return { ok: true };
}
