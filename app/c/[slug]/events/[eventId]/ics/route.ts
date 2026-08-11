import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toIcsDate(iso: string) {
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { eventId } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event) notFound();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClubHub//Event//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@clubhub`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.start_at)}`,
    event.end_at ? `DTEND:${toIcsDate(event.end_at)}` : "",
    `SUMMARY:${event.title}`,
    event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
    event.location ? `LOCATION:${event.location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-z0-9]+/gi, "-")}.ics"`,
    },
  });
}
