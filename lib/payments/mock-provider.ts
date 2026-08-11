import { createClient } from "@/lib/supabase/server";
import type { CreatePaymentIntentInput, CreatePaymentIntentResult, PaymentProvider } from "@/lib/payments/provider";

/**
 * Dev/MVP PaymentProvider. Creates a `pending` payments row and points at an
 * internal mock-checkout page instead of a real hosted checkout session.
 * Swap this for a Stripe/PayFast implementation of the same interface when
 * provider keys are available — nothing else in the app needs to change.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payments")
      .insert({
        club_id: input.clubId,
        member_id: input.memberId,
        type: input.type,
        amount_cents: input.amountCents,
        currency: input.currency,
        provider: this.name,
        status: "pending",
        event_id: input.eventId ?? null,
        membership_plan_id: input.membershipPlanId ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create payment intent");
    }

    return {
      paymentId: data.id,
      checkoutUrl: `/pay/${data.id}`,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}
