import { notFound } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { registerForEventAction, cancelRegistrationAction } from "../actions";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug, eventId } = await params;
  const { error } = await searchParams;
  const ctx = await getClubContext(slug);
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) notFound();

  const { count: registeredCount } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "registered");

  let myRegistration: { id: string; status: string } | null = null;
  if (ctx.membership) {
    const { data } = await supabase
      .from("event_registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("member_id", ctx.membership.id)
      .maybeSingle();
    myRegistration = data ?? null;
  }

  const full = event.capacity ? (registeredCount ?? 0) >= event.capacity : false;

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">
          {new Date(event.start_at).toLocaleString()} &middot; {event.location ?? (event.is_virtual ? "Virtual" : "TBC")}
        </p>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">{event.price_cents === 0 ? "Free" : formatMoney(event.price_cents, event.currency)}</Badge>
          {event.capacity && (
            <Badge variant="outline">
              {registeredCount ?? 0} / {event.capacity} registered
            </Badge>
          )}
        </div>
      </div>

      {event.description && <p className="text-sm">{event.description}</p>}

      {error && (
        <p className="text-sm text-red-500">
          {error === "deadline"
            ? "Registration for this event has closed."
            : error === "closed"
              ? "This event isn't open for registration."
              : "You're already registered for this event."}
        </p>
      )}

      {!ctx.membership ? (
        <p className="text-sm text-muted-foreground">You need to be a member of this club to register.</p>
      ) : myRegistration ? (
        <div className="flex items-center gap-3">
          <Badge>{myRegistration.status}</Badge>
          {(myRegistration.status === "registered" || myRegistration.status === "waitlisted") && (
            <form action={cancelRegistrationAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="registrationId" value={myRegistration.id} />
              <Button type="submit" variant="outline" size="sm">
                Cancel registration
              </Button>
            </form>
          )}
          {myRegistration.status === "registered" && (
            <a href={`/c/${slug}/events/${eventId}/ics`} className="text-sm text-brand-600 hover:underline">
              Add to calendar
            </a>
          )}
        </div>
      ) : (
        <form action={registerForEventAction}>
          <input type="hidden" name="clubId" value={ctx.club.id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit">{full ? "Join waitlist" : "Register"}</Button>
        </form>
      )}
    </div>
  );
}
