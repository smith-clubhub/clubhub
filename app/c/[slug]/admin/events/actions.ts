"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireClubPermission } from "@/lib/rbac";

export async function createEventAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const isVirtual = formData.get("isVirtual") === "on";
  const startAt = String(formData.get("startAt") ?? "");
  const endAt = String(formData.get("endAt") ?? "") || null;
  const capacity = formData.get("capacity") ? Number(formData.get("capacity")) : null;
  const registrationDeadline = String(formData.get("registrationDeadline") ?? "") || null;
  const price = Number(formData.get("price") ?? 0);

  if (!title) return { error: "Title is required." };
  if (!startAt) return { error: "Start date/time is required." };

  const user = await requireClubPermission(clubId, "events.create");
  const supabase = await createClient();

  const { data: club } = await supabase.from("clubs").select("currency, timezone").eq("id", clubId).single();

  const { error } = await supabase.from("events").insert({
    club_id: clubId,
    title,
    description,
    location,
    is_virtual: isVirtual,
    start_at: new Date(startAt).toISOString(),
    end_at: endAt ? new Date(endAt).toISOString() : null,
    timezone: club?.timezone ?? "Africa/Johannesburg",
    capacity,
    registration_deadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : null,
    price_cents: Math.round((price || 0) * 100),
    currency: club?.currency ?? "ZAR",
    status: "draft",
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/c/${slug}/admin/events`);
  return { ok: true };
}

export async function setEventStatusAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const eventId = String(formData.get("eventId"));
  const status = String(formData.get("status"));

  await requireClubPermission(clubId, "events.create");
  const supabase = await createClient();
  await supabase.from("events").update({ status }).eq("id", eventId);

  if (status === "cancelled") {
    await supabase
      .from("event_registrations")
      .update({ status: "cancelled" })
      .eq("event_id", eventId)
      .in("status", ["registered", "waitlisted"]);
  }

  revalidatePath(`/c/${slug}/admin/events`);
  revalidatePath(`/c/${slug}/admin/events/${eventId}`);
}

export async function checkInAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const eventId = String(formData.get("eventId"));
  const registrationId = String(formData.get("registrationId"));

  await requireClubPermission(clubId, "events.create");
  const supabase = await createClient();
  await supabase
    .from("event_registrations")
    .update({ status: "attended", checked_in_at: new Date().toISOString() })
    .eq("id", registrationId);

  revalidatePath(`/c/${slug}/admin/events/${eventId}`);
}
