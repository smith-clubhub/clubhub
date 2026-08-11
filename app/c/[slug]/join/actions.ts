"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments/mock-provider";

export async function joinClubAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const clubId = String(formData.get("clubId"));
  const slug = String(formData.get("slug"));
  const planId = String(formData.get("planId") || "") || null;
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (firstName || lastName) {
    await supabase
      .from("profiles")
      .update({ first_name: firstName || null, last_name: lastName || null })
      .eq("id", userData.user.id);
  }

  let plan: { id: string; price_cents: number; currency: string; billing_interval: string } | null = null;
  if (planId) {
    const { data } = await supabase
      .from("membership_plans")
      .select("id, price_cents, currency, billing_interval")
      .eq("id", planId)
      .single();
    plan = data;
  }

  const isFree = !plan || plan.price_cents === 0;

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      user_id: userData.user.id,
      club_id: clubId,
      membership_plan_id: planId,
      status: isFree ? "active" : "pending",
      joined_at: isFree ? new Date().toISOString() : null,
      expires_at:
        isFree && plan
          ? new Date(
              Date.now() +
                (plan.billing_interval === "monthly"
                  ? 30
                  : plan.billing_interval === "annual"
                    ? 365
                    : 36500) *
                  24 *
                  60 *
                  60 *
                  1000,
            ).toISOString()
          : null,
      custom_fields: notes ? { notes } : {},
    })
    .select("id")
    .single();

  if (error || !member) {
    return { error: error?.message ?? "Could not join this club." };
  }

  if (!isFree && plan) {
    const provider = getPaymentProvider();
    const { checkoutUrl } = await provider.createPaymentIntent({
      clubId,
      memberId: member.id,
      amountCents: plan.price_cents,
      currency: plan.currency,
      type: "membership_fee",
      membershipPlanId: plan.id,
    });
    redirect(checkoutUrl);
  }

  redirect(`/c/${slug}`);
}
