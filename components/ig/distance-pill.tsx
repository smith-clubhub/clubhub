"use client";

import { MapPin } from "lucide-react";
import { formatKm, useDistanceKm } from "@/components/ig/geolocation-provider";

/** "📍 2.7 km" from the viewer, in the brand accent. Renders nothing without coordinates. */
export function DistancePill({ lat, lng }: { lat: number | null; lng: number | null }) {
  const km = useDistanceKm(lat, lng);
  if (km == null) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
      <MapPin className="size-3.5" />
      {formatKm(km)} away
    </span>
  );
}
