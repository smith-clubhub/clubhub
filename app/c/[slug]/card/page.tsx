import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getClubContext } from "@/lib/club-context";
import { computeEffectiveStatus } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { ClubTabs } from "@/components/club-tabs";
import { Badge } from "@/components/ui/badge";

export default async function MembershipCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (!ctx.membership) redirect(`/c/${slug}/join`);

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("first_name, last_name").eq("id", ctx.userId!).maybeSingle();
  const { data: plan } = ctx.membership.membership_plan_id
    ? await supabase.from("membership_plans").select("name, grace_period_days").eq("id", ctx.membership.membership_plan_id).maybeSingle()
    : { data: null };

  const effectiveStatus = computeEffectiveStatus(ctx.membership, plan);
  const payload = JSON.stringify({
    clubId: ctx.club.id,
    memberId: ctx.membership.id,
    memberNumber: ctx.membership.member_number,
  });
  const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240 });

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Member";

  return (
    <div className="flex flex-col gap-6">
      <ClubTabs
        tabs={[
          { key: "home", label: "Overview", href: `/c/${slug}` },
          { key: "events", label: "Events", href: `/c/${slug}/events` },
          { key: "card", label: "Membership Card", href: `/c/${slug}/card` },
          { key: "announcements", label: "Announcements", href: `/c/${slug}/announcements` },
        ]}
      />

      <div className="max-w-sm">
        <div
          className="rounded-2xl p-6 text-white shadow-lg flex flex-col gap-4"
          style={{ background: `linear-gradient(135deg, ${ctx.club.primary_color}, #7c2d12)` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">{ctx.club.name}</span>
            <Badge className="bg-white/20 text-white border-white/30">{effectiveStatus}</Badge>
          </div>
          <div className="bg-white rounded-xl p-4 self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Membership QR code" width={200} height={200} />
          </div>
          <div>
            <p className="text-xl font-bold">{name}</p>
            <p className="text-white/80 text-sm">
              {plan?.name ?? "No plan"} {ctx.membership.member_number ? `· #${ctx.membership.member_number}` : ""}
            </p>
            {ctx.membership.expires_at && (
              <p className="text-white/80 text-sm">
                Valid until {new Date(ctx.membership.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Show this QR code at check-in. Screenshot it for the rare case you&apos;re offline —
          full offline caching isn&apos;t built yet.
        </p>
      </div>
    </div>
  );
}
