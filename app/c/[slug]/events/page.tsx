import Link from "next/link";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubTabs } from "@/components/club-tabs";

export default async function MemberEventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_at, location, is_virtual, capacity, price_cents, currency, event_registrations(count)")
    .eq("club_id", ctx.club.id)
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at");

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
      <h1 className="text-2xl font-bold">Upcoming events</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {(events ?? []).map((e) => {
          const regCount = (e.event_registrations as unknown as { count: number }[])?.[0]?.count ?? 0;
          const full = e.capacity ? regCount >= e.capacity : false;
          return (
            <Link key={e.id} href={`/c/${slug}/events/${e.id}`}>
              <Card className="hover:border-brand-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-base">{e.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p>{new Date(e.start_at).toLocaleString()}</p>
                  <p className="text-muted-foreground">{e.location ?? (e.is_virtual ? "Virtual" : "")}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{e.price_cents === 0 ? "Free" : formatMoney(e.price_cents, e.currency)}</Badge>
                    {full && <Badge variant="secondary">Waitlist only</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(events ?? []).length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
      </div>
    </div>
  );
}
