import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComposeForm } from "./compose-form";

export default async function AnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "announcements.send")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to announcements.</p>;
  }

  const supabase = await createClient();
  const [{ data: plans }, { data: roles }, { data: announcements }] = await Promise.all([
    supabase.from("membership_plans").select("id, name").eq("club_id", ctx.club.id),
    supabase.from("roles").select("id, name").eq("club_id", ctx.club.id),
    supabase
      .from("announcements")
      .select("id, title, body, audience, channels, sent_at, created_at, notifications(status)")
      .eq("club_id", ctx.club.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">Announcements</h1>
        <p className="text-muted-foreground text-sm">Compose and send updates to your members.</p>
      </div>

      <ComposeForm clubId={ctx.club.id} slug={slug} plans={plans ?? []} roles={roles ?? []} />

      <div className="flex flex-col gap-3">
        {(announcements ?? []).map((a) => {
          const statuses = (a.notifications as unknown as { status: string }[]) ?? [];
          const counts = statuses.reduce<Record<string, number>>((acc, n) => {
            acc[n.status] = (acc[n.status] ?? 0) + 1;
            return acc;
          }, {});
          return (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{a.title}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {a.sent_at ? new Date(a.sent_at).toLocaleString() : "not sent"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm">{a.body}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="outline" className="capitalize">
                    {a.audience.replace("_", " ")}
                  </Badge>
                  {Object.entries(counts).map(([status, n]) => (
                    <Badge key={status} variant={status === "sent" ? "default" : "secondary"}>
                      {n} {status}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(announcements ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No announcements sent yet.</p>
        )}
      </div>
    </div>
  );
}
