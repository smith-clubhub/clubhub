"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { MapPin } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { ClubAvatar } from "@/components/ig/avatars";
import { FollowButton } from "@/components/ig/follow-button";
import { formatKm, useGeolocation } from "@/components/ig/geolocation-provider";
import type { ClubPublic } from "@/lib/types";

/** "Suggested for you" — nearest clubs the viewer doesn't follow yet. */
export function SuggestedClubs({
  clubs,
  followedIds,
  isAuthenticated,
}: {
  clubs: ClubPublic[];
  followedIds: string[];
  isAuthenticated: boolean;
}) {
  const { position, located } = useGeolocation();
  const strip = useRef<HTMLDivElement>(null);

  // Re-sorting on the real location would otherwise leave scroll-snap parked on
  // the old first card; show the new nearest club.
  useEffect(() => {
    if (located) strip.current?.scrollTo({ left: 0 });
  }, [located]);
  const nearest = useMemo(
    () =>
      clubs
        .filter((c) => !followedIds.includes(c.id))
        .map((c) => ({ club: c, km: haversineKm(position, { lat: Number(c.latitude), lng: Number(c.longitude) }) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 12),
    [clubs, followedIds, position],
  );

  if (nearest.length === 0) return null;

  return (
    <section className="py-4 border-b md:border-none">
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="font-bold">Clubs near you</h2>
        <Link href="/map" className="text-sm font-semibold text-primary">
          See map
        </Link>
      </div>
      <div ref={strip} className="flex gap-2 overflow-x-auto no-scrollbar px-4 snap-x scroll-px-4">
        {nearest.map(({ club, km }) => (
          <div
            key={club.id}
            className="snap-start shrink-0 w-[150px] rounded-3xl border bg-card flex flex-col items-center gap-1.5 p-3 text-center shadow-sm"
          >
            <Link href={`/c/${club.slug}`} className="flex flex-col items-center gap-1.5 min-w-0 w-full">
              <ClubAvatar url={club.logo_url} name={club.name} size={72} />
              <p className="font-semibold text-sm truncate w-full">{club.name}</p>
              <p className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
                <MapPin className="size-3" />
                {formatKm(km)}
              </p>
            </Link>
            <FollowButton clubId={club.id} initialFollowing={false} isAuthenticated={isAuthenticated} size="sm" className="w-full mt-1" />
          </div>
        ))}
      </div>
    </section>
  );
}
