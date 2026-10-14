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

const CURRENCY_SYMBOLS: Record<string, string> = { ZAR: "R", USD: "$", EUR: "€", GBP: "£" };

/**
 * "R150", "R1 250.50". Hand-rolled rather than Intl: Node's and browsers' ICU
 * data disagree for en-ZA (decimal comma vs point, NBSP variants), which breaks
 * hydration when client components render prices.
 */
export function formatMoney(cents: number, currency: string) {
  const code = (currency || "ZAR").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const fraction = abs % 100;
  return `${sign}${symbol}${whole}${fraction ? `.${fraction.toString().padStart(2, "0")}` : ""}`;
}

export function billingIntervalLabel(interval: MembershipPlan["billing_interval"]) {
  return interval === "monthly" ? "/month" : interval === "annual" ? "/year" : "one-time";
}

export function daysUntil(dateStr: string | null) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
