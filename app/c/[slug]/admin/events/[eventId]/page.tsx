import { notFound } from "next/navigation";
import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setEventStatusAction, checkInAction } from "../actions";

type ProfileRef = { first_name: string | null; last_name: string | null; email: string | null } | null;

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "events.create")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to this event.</p>;
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .eq("club_id", ctx.club.id)
    .maybeSingle();

  if (!event) notFound();

  const { data: registrations } = await supabase
    .from("event_registrations")
    .select("id, status, registered_at, checked_in_at, members(member_number, profiles(first_name, last_name, email))")
    .eq("event_id", eventId)
    .order("registered_at");

  const registered = (registrations ?? []).filter((r) => r.status === "registered" || r.status === "attended");
  const waitlisted = (registrations ?? []).filter((r) => r.status === "waitlisted");
  const other = (registrations ?? []).filter((r) => r.status === "cancelled" || r.status === "no_show");

  function nameOf(row: (typeof registered)[number]) {
    const member = row.members as unknown as { member_number: string | null; profiles: ProfileRef } | null;
    const p = member?.profiles;
    return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "Member";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">
            {new Date(event.start_at).toLocaleString()} &middot; {event.location ?? (event.is_virtual ? "Virtual" : "TBC")}
          </p>
          <div className="flex gap-2 mt-2">
            <Badge variant={event.status === "published" ? "default" : "secondary"}>{event.status}</Badge>
            <Badge variant="outline">{event.price_cents === 0 ? "Free" : formatMoney(event.price_cents, event.currency)}</Badge>
            {event.capacity && <Badge variant="outline">Capacity {event.capacity}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {event.status === "draft" && (
            <StatusButton clubId={ctx.club.id} slug={slug} eventId={eventId} status="published" label="Publish" />
          )}
          {event.status === "published" && (
            <>
              <StatusButton clubId={ctx.club.id} slug={slug} eventId={eventId} status="completed" label="Mark completed" />
              <StatusButton clubId={ctx.club.id} slug={slug} eventId={eventId} status="cancelled" label="Cancel event" variant="destructive" />
            </>
          )}
        </div>
      </div>

      {event.description && <p className="max-w-2xl text-sm">{event.description}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Registered ({registered.length}
            {event.capacity ? ` / ${event.capacity}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {registered.length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
          {registered.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span>{nameOf(r)}</span>
              <div className="flex items-center gap-2">
                {r.status === "attended" ? (
                  <Badge>checked in</Badge>
                ) : (
                  <form action={checkInAction}>
                    <input type="hidden" name="clubId" value={ctx.club.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="registrationId" value={r.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Check in
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {waitlisted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waitlist ({waitlisted.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {waitlisted.map((r) => (
              <div key={r.id} className="text-sm">
                {nameOf(r)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {other.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancelled / no-show</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {other.map((r) => (
              <div key={r.id} className="text-sm text-muted-foreground flex justify-between">
                <span>{nameOf(r)}</span>
                <span>{r.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusButton({
  clubId,
  slug,
  eventId,
  status,
  label,
  variant,
}: {
  clubId: string;
  slug: string;
  eventId: string;
  status: string;
  label: string;
  variant?: "default" | "destructive" | "outline";
}) {
  return (
    <form action={setEventStatusAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
