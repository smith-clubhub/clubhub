import type { PaymentType } from "@/lib/types";

/**
 * PaymentProvider interface (spec Section 6.5 / 5.5 AC): swappable so Stripe
 * and a South African rail (PayFast/Yoco) can be added later without
 * touching call sites. No implementation should ever see raw card data —
 * real providers hand back a hosted-checkout URL or client secret; ours is
 * a dev stand-in that simulates that redirect.
 */
export interface CreatePaymentIntentInput {
  clubId: string;
  memberId: string;
  amountCents: number;
  currency: string;
  type: PaymentType;
  eventId?: string;
  membershipPlanId?: string;
}

export interface CreatePaymentIntentResult {
  paymentId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult>;
}
