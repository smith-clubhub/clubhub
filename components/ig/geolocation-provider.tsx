"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { haversineKm, JOHANNESBURG_CENTER, type LatLng } from "@/lib/geo";

interface GeoState {
  /** Viewer position, or Johannesburg until/unless the browser shares one. */
  position: LatLng;
  /** True once the browser actually gave us a fix (vs. the fallback). */
  located: boolean;
}

const GeoContext = createContext<GeoState>({ position: JOHANNESBURG_CENTER, located: false });

const CACHE_KEY = "clubhub.geo";

/** Asks for the viewer's location once per session and shares it with every screen. */
export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GeoState>({ position: JOHANNESBURG_CENTER, located: false });

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setState({ position: JSON.parse(cached) as LatLng, located: true });
        return;
      }
    } catch {
      // Storage blocked -- just ask the browser.
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState({ position, located: true });
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(position));
        } catch {
          // Non-essential cache.
        }
      },
      () => {
        // Denied/unavailable -- keep the Johannesburg fallback.
      },
      { timeout: 5000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  return <GeoContext.Provider value={state}>{children}</GeoContext.Provider>;
}

export function useGeolocation() {
  return useContext(GeoContext);
}

export function useDistanceKm(lat: number | null | undefined, lng: number | null | undefined) {
  const { position } = useGeolocation();
  if (lat == null || lng == null) return null;
  return haversineKm(position, { lat: Number(lat), lng: Number(lng) });
}

export function formatKm(km: number | null) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
