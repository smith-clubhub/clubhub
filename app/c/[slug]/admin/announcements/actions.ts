"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";
import type { NotificationChannel } from "@/lib/types";

export async function sendAnnouncementAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all") as "all" | "plan_specific" | "role_specific";
  const audiencePlanId = String(formData.get("audiencePlanId") || "") || null;
  const audienceRoleId = String(formData.get("audienceRoleId") || "") || null;
  const channels = formData.getAll("channels") as NotificationChannel[];

  if (!title || !body) return { error: "Title and message are required." };
  if (channels.length === 0) return { error: "Pick at least one channel." };

  const user = await requireClubPermission(clubId, "announcements.send");
  const supabase = await createClient();

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      club_id: clubId,
      title,
      body,
      audience,
      audience_plan_id: audience === "plan_specific" ? audiencePlanId : null,
      audience_role_id: audience === "role_specific" ? audienceRoleId : null,
      channels,
      created_by: user.id,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !announcement) return { error: error?.message ?? "Could not create announcement." };

  let recipientUserIds: string[] = [];

  if (audience === "plan_specific" && audiencePlanId) {
    const { data } = await supabase.from("members").select("user_id").eq("club_id", clubId).eq("membership_plan_id", audiencePlanId);
    recipientUserIds = (data ?? []).map((m) => m.user_id);
  } else if (audience === "role_specific" && audienceRoleId) {
    const { data } = await supabase.from("user_role_assignments").select("user_id").eq("club_id", clubId).eq("role_id", audienceRoleId);
    recipientUserIds = (data ?? []).map((r) => r.user_id);
  } else {
    const { data } = await supabase.from("members").select("user_id").eq("club_id", clubId).neq("status", "cancelled");
    recipientUserIds = (data ?? []).map((m) => m.user_id);
  }

  recipientUserIds = [...new Set(recipientUserIds)];

  const rows = recipientUserIds.flatMap((userId) =>
    channels.map((channel) => ({
      user_id: userId,
      club_id: clubId,
      announcement_id: announcement.id,
      type: "announcement",
      channel,
      title,
      body,
      // Only in_app actually delivers in this MVP; other channels are recorded
      // as queued so the EmailProvider/SmsProvider/PushProvider abstraction
      // (spec 6.5) has somewhere real to plug in without changing this code.
      status: channel === "in_app" ? "sent" : "queued",
    })),
  );

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }

  revalidatePath(`/c/${slug}/admin/announcements`);
  return { ok: true, recipientCount: recipientUserIds.length };
}
