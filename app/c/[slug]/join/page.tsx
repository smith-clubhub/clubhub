import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, billingIntervalLabel } from "@/lib/membership";
import { JoinForm } from "./join-form";

export default async function JoinClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (ctx.membership) redirect(`/c/${slug}`);

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("club_id", ctx.club.id)
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-1">Join {ctx.club.name}</h1>
      <p className="text-muted-foreground mb-6">
        Choose a membership plan to get started.
      </p>
      <JoinForm
        clubId={ctx.club.id}
        slug={slug}
        plans={(plans ?? []).map((p) => ({
          ...p,
          priceLabel: p.price_cents === 0 ? "Free" : `${formatMoney(p.price_cents, p.currency)} ${billingIntervalLabel(p.billing_interval)}`,
        }))}
      />
    </div>
  );
}
