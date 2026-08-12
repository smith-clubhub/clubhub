"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { haversineKm, JOHANNESBURG_CENTER, type LatLng } from "@/lib/geo";
import type { DiscoveryClub } from "./discovery-map";

export function NearbyClubsStrip({
  clubs,
  isAuthenticated,
}: {
  clubs: DiscoveryClub[];
  isAuthenticated: boolean;
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

  if (clubs.length === 0) return null;

  const sorted = [...clubs]
    .map((club) => ({ club, distanceKm: haversineKm(viewer, { lat: club.latitude, lng: club.longitude }) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1 -mx-1">
      {sorted.map(({ club, distanceKm }) => (
        <Link
          key={club.id}
          href={isAuthenticated ? `/c/${club.slug}` : `/auth/login?next=/c/${club.slug}`}
          className="flex-shrink-0 flex flex-col items-center gap-1 w-16"
        >
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt=""
              className="w-12 h-12 rounded-full object-cover ring-2 ring-offset-2 ring-fuchsia-500"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full ring-2 ring-offset-2 ring-fuchsia-500"
              style={{ backgroundColor: club.primary_color }}
            />
          )}
          <span className="text-[11px] font-medium truncate w-full text-center">{club.name}</span>
          <span className="text-[10px] text-muted-foreground">{distanceKm.toFixed(1)} km</span>
        </Link>
      ))}
    </div>
  );
}
