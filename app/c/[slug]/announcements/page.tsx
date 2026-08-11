import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { ClubTabs } from "@/components/club-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markReadAction } from "./actions";

export default async function MemberAnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("club_id", ctx.club.id)
    .eq("user_id", ctx.userId ?? "")
    .eq("channel", "in_app")
    .order("created_at", { ascending: false });

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
      <h1 className="text-2xl font-bold">Announcements &amp; notifications</h1>

      <div className="flex flex-col gap-3 max-w-2xl">
        {(notifications ?? []).map((n) => (
          <Card key={n.id} className={n.read_at ? "opacity-70" : undefined}>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{n.title}</span>
                {!n.read_at && <Badge>new</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3 flex flex-col gap-2">
              <p className="text-sm">{n.body}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                </span>
                {!n.read_at && (
                  <form action={markReadAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="notificationId" value={n.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Mark read
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(notifications ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
