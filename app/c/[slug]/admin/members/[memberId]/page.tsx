import { notFound } from "next/navigation";
import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusForm } from "./status-form";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ slug: string; memberId: string }>;
}) {
  const { slug, memberId } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "members.view")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to member details.</p>;
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("*, profiles(first_name, last_name, email), membership_plans(name, price_cents, currency)")
    .eq("id", memberId)
    .eq("club_id", ctx.club.id)
    .maybeSingle();

  if (!member) notFound();

  const profile = member.profiles as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
  const plan = member.membership_plans as unknown as { name: string; price_cents: number; currency: string } | null;
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email || "Member";

  const canEdit = can(ctx, "members.edit");
  const canViewAudit = can(ctx, "audit.view");
  const canViewPayments = can(ctx, "payments.view");

  const [{ data: auditRows }, { data: paymentRows }] = await Promise.all([
    canViewAudit
      ? supabase
          .from("audit_log")
          .select("id, action, reason, before, after, created_at, profiles(first_name, last_name, email)")
          .eq("target_type", "member")
          .eq("target_id", memberId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    canViewPayments
      ? supabase.from("payments").select("*").eq("member_id", memberId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="text-muted-foreground">{profile?.email}</p>
        <div className="flex gap-2 mt-2">
          <Badge>{member.status}</Badge>
          {plan && <Badge variant="secondary">{plan.name}</Badge>}
        </div>
      </div>

      {member.custom_fields && Object.keys(member.custom_fields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(member.custom_fields, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusForm clubId={ctx.club.id} slug={slug} memberId={memberId} currentStatus={member.status} />
          </CardContent>
        </Card>
      )}

      {canViewPayments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(paymentRows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
            {(paymentRows ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {p.type} &mdash; {formatMoney(p.amount_cents, p.currency)}
                </span>
                <Badge variant={p.status === "succeeded" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit trail</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(auditRows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No actions logged yet.</p>}
            {(auditRows ?? []).map((a) => {
              const actor = a.profiles as unknown as { first_name: string | null; last_name: string | null; email: string | null } | null;
              const actorName = [actor?.first_name, actor?.last_name].filter(Boolean).join(" ") || actor?.email || "System";
              return (
                <div key={a.id} className="text-sm border-l-2 border-muted pl-3">
                  <p className="font-medium">{a.action}</p>
                  <p className="text-muted-foreground">
                    {actorName} &middot; {new Date(a.created_at).toLocaleString()}
                  </p>
                  {a.reason && <p className="text-muted-foreground">&ldquo;{a.reason}&rdquo;</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
