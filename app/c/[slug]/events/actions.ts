"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/mock-provider";

export async function registerForEventAction(formData: FormData) {
  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const eventId = String(formData.get("eventId"));

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!member) redirect(`/c/${slug}/join`);

  const { data: event } = await supabase
    .from("events")
    .select("id, status, capacity, price_cents, currency, registration_deadline")
    .eq("id", eventId)
    .single();

  if (!event || event.status !== "published") {
    redirect(`/c/${slug}/events/${eventId}?error=closed`);
  }
  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    redirect(`/c/${slug}/events/${eventId}?error=deadline`);
  }

  let status = "registered";
  if (event.capacity) {
    const { count } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "registered");
    if ((count ?? 0) >= event.capacity) status = "waitlisted";
  }

  const { data: registration, error } = await supabase
    .from("event_registrations")
    .insert({ event_id: eventId, member_id: member.id, status })
    .select("id")
    .single();

  if (error || !registration) {
    redirect(`/c/${slug}/events/${eventId}?error=already`);
  }

  if (status === "registered" && event.price_cents > 0) {
    const provider = getPaymentProvider();
    const { checkoutUrl } = await provider.createPaymentIntent({
      clubId,
      memberId: member.id,
      amountCents: event.price_cents,
      currency: event.currency,
      type: "event_ticket",
      eventId,
    });
    redirect(checkoutUrl);
  }

  revalidatePath(`/c/${slug}/events/${eventId}`);
  redirect(`/c/${slug}/events/${eventId}`);
}

export async function cancelRegistrationAction(formData: FormData) {
  const slug = String(formData.get("slug"));
  const eventId = String(formData.get("eventId"));
  const registrationId = String(formData.get("registrationId"));

  const supabase = await createClient();
  await supabase.from("event_registrations").update({ status: "cancelled" }).eq("id", registrationId);

  revalidatePath(`/c/${slug}/events/${eventId}`);
}
