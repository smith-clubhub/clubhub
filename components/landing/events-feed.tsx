"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { haversineKm, JOHANNESBURG_CENTER, type LatLng } from "@/lib/geo";
import { EventCard } from "./event-card";
import type { EventPublic } from "@/lib/types";

export function EventsFeed({
  events,
  isAuthenticated,
  myVotes,
}: {
  events: EventPublic[];
  isAuthenticated: boolean;
  myVotes: Record<string, 1 | -1>;
}) {
  const [viewer, setViewer] = useState<LatLng>(JOHANNESBURG_CENTER);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No events near you yet &mdash; check back soon.
      </p>
    );
  }

  const byClub = new Map<string, EventPublic[]>();
  for (const event of events) {
    const list = byClub.get(event.club_id) ?? [];
    list.push(event);
    byClub.set(event.club_id, list);
  }

  const sections = [...byClub.entries()]
    .map(([clubId, clubEvents]) => {
      const distanceKm = haversineKm(viewer, { lat: clubEvents[0].latitude, lng: clubEvents[0].longitude });
      const sortedEvents = [...clubEvents].sort((a, b) => b.score - a.score);
      return { clubId, distanceKm, events: sortedEvents };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="flex flex-col gap-6">
      {sections.map(({ clubId, distanceKm, events: clubEvents }) => {
        const club = clubEvents[0];
        const clubHref = isAuthenticated ? `/c/${club.club_slug}` : `/auth/login?next=/c/${club.club_slug}`;
        return (
          <section key={clubId} className="flex flex-col gap-2">
            <Link href={clubHref} className="flex items-center gap-2 px-1 group">
              {club.club_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={club.club_logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: club.club_primary_color }} />
              )}
              <span className="font-bold group-hover:underline">{club.club_name}</span>
              <span className="text-xs font-semibold text-fuchsia-600 bg-fuchsia-50 rounded-full px-2 py-0.5">
                {distanceKm.toFixed(1)} km
              </span>
            </Link>
            <div className="flex gap-3 overflow-x-auto pb-2 px-1 -mx-1 snap-x">
              {clubEvents.map((event) => (
                <div key={event.id} className="snap-start">
                  <EventCard
                    event={event}
                    href={isAuthenticated ? `/c/${club.club_slug}/events/${event.id}` : `/auth/login?next=/c/${club.club_slug}/events/${event.id}`}
                    myVote={myVotes[event.id] ?? 0}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
