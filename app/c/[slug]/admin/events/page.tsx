import Link from "next/link";
import { getClubContext, can } from "@/lib/club-context";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/membership";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "./event-form";

export default async function AdminEventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (!can(ctx, "events.create")) {
    return <p className="text-sm text-muted-foreground">You don&apos;t have access to events.</p>;
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, status, start_at, capacity, price_cents, currency, event_registrations(count)")
    .eq("club_id", ctx.club.id)
    .order("start_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm">Create, publish and manage club events.</p>
        </div>
      </div>
      <EventForm clubId={ctx.club.id} slug={slug} />

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2 font-medium">Title</th>
              <th className="p-2 font-medium">Starts</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Registrations</th>
              <th className="p-2 font-medium">Price</th>
              <th className="p-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => {
              const regCount = (e.event_registrations as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <tr key={e.id} className="border-t">
                  <td className="p-2">
                    <Link href={`/c/${slug}/admin/events/${e.id}`} className="hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="p-2">{new Date(e.start_at).toLocaleString()}</td>
                  <td className="p-2">
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                  </td>
                  <td className="p-2">
                    {regCount}
                    {e.capacity ? ` / ${e.capacity}` : ""}
                  </td>
                  <td className="p-2">{e.price_cents === 0 ? "Free" : formatMoney(e.price_cents, e.currency)}</td>
                  <td className="p-2 text-right">
                    <Link href={`/c/${slug}/admin/events/${e.id}`} className="text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
