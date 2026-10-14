"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { LocateFixed, MapPin } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { formatMoney } from "@/lib/membership";
import { eventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ClubAvatar } from "@/components/ig/avatars";
import { FollowButton } from "@/components/ig/follow-button";
import { formatKm, useGeolocation } from "@/components/ig/geolocation-provider";
import type { ClubPublic } from "@/lib/types";

export interface MapEvent {
  id: string;
  club_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  price_cents: number;
  currency: string;
  cover_image_url: string | null;
}

type Filter = "all" | "tonight" | "week";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All clubs" },
  { key: "tonight", label: "On tonight" },
  { key: "week", label: "This week" },
];

const HOUR = 60 * 60 * 1000;

/** An event is "on" if it hasn't finished (end_at, else start + 8h) and starts within the window. */
function isOnWithin(e: MapEvent, windowMs: number, now: number) {
  const start = new Date(e.start_at).getTime();
  const end = e.end_at ? new Date(e.end_at).getTime() : start + 8 * HOUR;
  return end > now && start < now + windowMs;
}

function markerElement(club: ClubPublic, active: boolean) {
  const el = document.createElement("div");
  const size = active ? 52 : 40;
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;padding:${active ? 3 : 2}px;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(0,0,0,.35);`;
  el.style.background = active
    ? "linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)"
    : "#ffffff";
  const inner = document.createElement("div");
  inner.style.cssText =
    "width:100%;height:100%;border-radius:9999px;overflow:hidden;background:#efefef;display:flex;align-items:center;justify-content:center;font:600 14px system-ui;color:#262626;border:2px solid #fff;";
  if (club.logo_url) {
    const img = document.createElement("img");
    img.src = club.logo_url;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    inner.appendChild(img);
  } else {
    inner.textContent = club.name.slice(0, 1).toUpperCase();
  }
  el.appendChild(inner);
  return el;
}

function youElement() {
  const el = document.createElement("div");
  el.style.cssText =
    "width:18px;height:18px;border-radius:9999px;background:#0095f6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(0,149,246,.25),0 1px 4px rgba(0,0,0,.4);";
  return el;
}

export function ClubMap({
  clubs,
  events,
  followedIds,
  isAuthenticated,
}: {
  clubs: ClubPublic[];
  events: MapEvent[];
  followedIds: string[];
  isAuthenticated: boolean;
}) {
  const { position, located } = useGeolocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>());
  const youRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const scrollingFromMarker = useRef(false);
  const activeMarkerId = useRef<string | null>(null);

  // Clubs sorted nearest-first, each with its next event (within the filter window).
  const rows = useMemo(() => {
    const now = Date.now();
    const windowMs = filter === "tonight" ? 18 * HOUR : 7 * 24 * HOUR;
    return clubs
      .map((club) => {
        const clubEvents = events.filter((e) => e.club_id === club.id && isOnWithin(e, windowMs, now));
        return {
          club,
          km: haversineKm(position, { lat: Number(club.latitude), lng: Number(club.longitude) }),
          nextEvent: clubEvents[0] ?? null,
        };
      })
      .filter((r) => filter === "all" || r.nextEvent)
      .sort((a, b) => a.km - b.km);
  }, [clubs, events, filter, position]);

  const activeRow = rows.find((r) => r.club.id === activeId) ?? rows[0] ?? null;

  // Create the map once.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError("Map unavailable: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
      return;
    }
    setOptions({ key: apiKey, v: "weekly" });
    let cancelled = false;
    Promise.all([importLibrary("maps"), importLibrary("marker")])
      .then(([{ Map }]) => {
        if (cancelled || !mapDiv.current) return;
        mapRef.current = new Map(mapDiv.current, {
          center: position,
          zoom: 13,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          colorScheme: "FOLLOW_SYSTEM" as google.maps.ColorScheme,
        });
        setMapReady(true);
      })
      .catch(() => setMapError("Couldn't load the map right now."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "You are here" dot; recentre when the browser first gives us a location.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (!youRef.current) {
      youRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position, content: youElement(), zIndex: 1000 });
    } else {
      youRef.current.position = position;
    }
    if (located) map.panTo(position);
  }, [mapReady, position, located]);

  const activeClubId = activeRow?.club.id ?? null;

  // Club markers, rebuilt only when the filtered set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const markers = markersRef.current;
    for (const m of markers.values()) m.map = null;
    markers.clear();

    for (const { club } of rows) {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: Number(club.latitude), lng: Number(club.longitude) },
        content: markerElement(club, false),
        title: club.name,
      });
      marker.addListener("click", () => {
        setActiveId(club.id);
        scrollingFromMarker.current = true;
        document.getElementById(`club-card-${club.id}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        setTimeout(() => (scrollingFromMarker.current = false), 600);
      });
      markers.set(club.id, marker);
    }
    activeMarkerId.current = null;
  }, [mapReady, rows]);

  // Highlight the active club's marker (restyles just the old + new one).
  useEffect(() => {
    const markers = markersRef.current;
    const prev = activeMarkerId.current;
    if (prev && prev !== activeClubId) {
      const m = markers.get(prev);
      const row = rows.find((r) => r.club.id === prev);
      if (m && row) {
        m.content = markerElement(row.club, false);
        m.zIndex = null;
      }
    }
    if (activeClubId) {
      const m = markers.get(activeClubId);
      const row = rows.find((r) => r.club.id === activeClubId);
      if (m && row) {
        m.content = markerElement(row.club, true);
        m.zIndex = 999;
      }
    }
    activeMarkerId.current = activeClubId;
  }, [activeClubId, rows, mapReady]);

  // When the real location arrives the list re-sorts; scroll-snap would keep the
  // previously visible card in view, so jump back to the (new) nearest club.
  useEffect(() => {
    if (!located) return;
    setActiveId(null);
    cardsRef.current?.scrollTo({ left: 0 });
  }, [located]);

  // Pan to the active club.
  useEffect(() => {
    const row = rows.find((r) => r.club.id === activeClubId);
    if (!mapRef.current || !row) return;
    mapRef.current.panTo({ lat: Number(row.club.latitude), lng: Number(row.club.longitude) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClubId, mapReady]);

  function onCardsScroll() {
    const el = cardsRef.current;
    if (!el || scrollingFromMarker.current) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? el.clientWidth;
    const index = Math.round(el.scrollLeft / (cardWidth + 8));
    const row = rows[Math.min(index, rows.length - 1)];
    if (row && row.club.id !== activeRow?.club.id) setActiveId(row.club.id);
  }

  return (
    <main className="relative h-[calc(100dvh-52px-env(safe-area-inset-bottom))] md:h-dvh w-full overflow-hidden">
      {mapError ? (
        <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">{mapError}</div>
      ) : (
        <div ref={mapDiv} className="h-full w-full bg-muted" />
      )}

      {/* Filters */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 overflow-x-auto no-scrollbar p-3 pt-[max(12px,env(safe-area-inset-top))]">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setActiveId(null);
              cardsRef.current?.scrollTo({ left: 0 });
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold shadow-md",
              filter === f.key ? "bg-foreground text-background" : "bg-background text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => mapRef.current?.panTo(position)}
        aria-label="Centre on me"
        className="absolute right-3 bottom-[200px] rounded-full bg-background p-3 shadow-md"
      >
        <LocateFixed className="size-5" />
      </button>

      {/* Nearest-first club cards */}
      <div className="absolute inset-x-0 bottom-0 pb-3">
        {rows.length === 0 ? (
          <div className="mx-3 rounded-2xl bg-background p-4 text-center text-sm shadow-lg">
            {clubs.length === 0 ? "No clubs on the map yet." : "Nothing on in this window — try another filter."}
          </div>
        ) : (
          <div
            ref={cardsRef}
            onScroll={onCardsScroll}
            className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory px-3 scroll-px-3"
          >
            {rows.map(({ club, km, nextEvent }) => (
              <div
                key={club.id}
                id={`club-card-${club.id}`}
                onClick={() => setActiveId(club.id)}
                className={cn(
                  "snap-start shrink-0 w-[85%] max-w-[360px] rounded-2xl bg-background p-3 shadow-lg border-2 transition-colors",
                  club.id === activeRow?.club.id ? "border-foreground/20" : "border-transparent",
                )}
              >
                <div className="flex items-center gap-3">
                  <Link href={`/c/${club.slug}`}>
                    <ClubAvatar url={club.logo_url} name={club.name} size={48} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/c/${club.slug}`} className="block truncate font-semibold">
                      {club.name}
                    </Link>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {formatKm(km)} · <span className="capitalize">{club.category}</span>
                    </p>
                  </div>
                  <FollowButton
                    clubId={club.id}
                    initialFollowing={followedIds.includes(club.id)}
                    isAuthenticated={isAuthenticated}
                    size="sm"
                  />
                </div>
                {nextEvent ? (
                  <Link
                    href={`/c/${club.slug}/events/${nextEvent.id}`}
                    className="mt-3 flex items-center gap-3 rounded-xl bg-muted p-2 hover:bg-accent"
                  >
                    {nextEvent.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nextEvent.cover_image_url} alt="" className="size-11 rounded-lg object-cover" />
                    ) : (
                      <span className="ig-gradient size-11 shrink-0 rounded-lg" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{nextEvent.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {eventWhen(nextEvent.start_at)} ·{" "}
                        {nextEvent.price_cents ? formatMoney(nextEvent.price_cents, nextEvent.currency) : "Free"}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">No events announced this week</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
