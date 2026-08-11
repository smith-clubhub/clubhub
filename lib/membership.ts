import type { Member, MembershipPlan } from "@/lib/types";

type StatusInput = Pick<Member, "status" | "expires_at">;
type GraceInput = Pick<MembershipPlan, "grace_period_days"> | null | undefined;

/**
 * Grace-period display logic (spec 5.1 edge case): a member whose expires_at
 * has passed stays "active" for plan.grace_period_days before reading as
 * "expired". This is computed at read time rather than written back by a
 * cron job, since the stored `status` column stays the source of truth for
 * explicit admin actions (suspend/cancel) and payment-driven transitions.
 */
export function computeEffectiveStatus(member: StatusInput, plan?: GraceInput): Member["status"] {
  if (member.status !== "active" || !member.expires_at) return member.status;

  const expiresAt = new Date(member.expires_at).getTime();
  const graceDays = plan?.grace_period_days ?? 0;
  const graceCutoff = expiresAt + graceDays * 24 * 60 * 60 * 1000;

  return Date.now() > graceCutoff ? "expired" : "active";
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: currency || "ZAR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function billingIntervalLabel(interval: MembershipPlan["billing_interval"]) {
  return interval === "monthly" ? "/month" : interval === "annual" ? "/year" : "one-time";
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
