"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useRouter } from "next/navigation";
import { haversineKm, JOHANNESBURG_CENTER, type LatLng } from "@/lib/geo";

export interface DiscoveryClub {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  primary_color: string;
  latitude: number;
  longitude: number;
}

export function DiscoveryMap({
  clubs,
  isAuthenticated,
}: {
  clubs: DiscoveryClub[];
  isAuthenticated: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [viewer, setViewer] = useState<LatLng>(JOHANNESBURG_CENTER);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setViewer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // Denied/unavailable -- fall back to the Johannesburg center already set.
      },
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Map preview unavailable: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
      return;
    }
    if (!mapRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });
    let cancelled = false;
    const markers: google.maps.Marker[] = [];

    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map }, { Marker }]) => {
        if (cancelled || !mapRef.current) return;
        const map = new Map(mapRef.current, {
          center: viewer,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
        });

        new Marker({
          position: viewer,
          map,
          title: "You",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        for (const club of clubs) {
          const marker = new Marker({
            position: { lat: club.latitude, lng: club.longitude },
            map,
            title: club.name,
          });
          marker.addListener("click", () => {
            router.push(isAuthenticated ? `/c/${club.slug}` : `/auth/login?next=/c/${club.slug}`);
          });
          markers.push(marker);
        }
      })
      .catch(() => setError("Couldn't load the map right now."));

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, viewer, isAuthenticated]);

  if (error) {
    return (
      <div className="w-full h-64 sm:h-80 rounded-xl border bg-muted flex items-center justify-center text-sm text-muted-foreground p-4 text-center">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-64 sm:h-80 rounded-xl border" />;
}

export function distanceFromViewer(club: DiscoveryClub, viewer: LatLng) {
  return haversineKm(viewer, { lat: club.latitude, lng: club.longitude });
}
