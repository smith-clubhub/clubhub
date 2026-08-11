import Link from "next/link";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProfileRef = { first_name: string | null; last_name: string | null; email: string | null } | null;

function displayName(p: ProfileRef) {
  if (!p) return "Unknown";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.email || "Unknown";
}

export default async function AdminDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);
  const clubId = ctx.club.id;
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [
    { count: activeMembers },
    { data: revenueRows },
    { data: upcomingEvents },
    { data: recentSignups },
    { data: expiringMembers },
  ] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
    supabase
      .from("payments")
      .select("amount_cents, currency")
      .eq("club_id", clubId)
      .eq("status", "succeeded")
      .gte("paid_at", monthStart.toISOString()),
    supabase
      .from("events")
      .select("id, title, start_at, capacity")
      .eq("club_id", clubId)
      .eq("status", "published")
      .gte("start_at", now)
      .order("start_at")
      .limit(5),
    supabase
      .from("members")
      .select("id, status, created_at, profiles(first_name, last_name, email)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("members")
      .select("id, expires_at, profiles(first_name, last_name, email)")
      .eq("club_id", clubId)
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lte("expires_at", in30Days)
      .order("expires_at")
      .limit(10),
  ]);

  const revenueCents = (revenueRows ?? []).reduce((sum, r) => sum + r.amount_cents, 0);
  const currency = ctx.club.currency;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={String(activeMembers ?? 0)} />
        <StatCard label="Revenue this month" value={formatMoney(revenueCents, currency)} />
        <StatCard label="Upcoming events" value={String(upcomingEvents?.length ?? 0)} />
        <StatCard label="Expiring in 30 days" value={String(expiringMembers?.length ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(recentSignups ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No signups yet.</p>
            )}
            {(recentSignups ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{displayName(m.profiles as unknown as ProfileRef)}</span>
                <Badge variant="secondary">{m.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming events</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(upcomingEvents ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No published events coming up.</p>
            )}
            {(upcomingEvents ?? []).map((e) => (
              <Link
                key={e.id}
                href={`/c/${slug}/admin/events/${e.id}`}
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span>{e.title}</span>
                <span className="text-muted-foreground">{new Date(e.start_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Expiring memberships (next 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(expiringMembers ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing expiring soon.</p>
            )}
            {(expiringMembers ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{displayName(m.profiles as unknown as ProfileRef)}</span>
                <span className="text-muted-foreground">
                  {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
