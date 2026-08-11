import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { PlansClient } from "./plans-client";

export default async function PlansPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "club.settings")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to membership plans.</p>;
  }

  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("club_id", ctx.club.id)
    .order("sort_order");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Membership plans</h1>
        <p className="text-muted-foreground text-sm">Members choose one of these when they join.</p>
      </div>
      <PlansClient clubId={ctx.club.id} slug={slug} plans={plans ?? []} />
    </div>
  );
}
