"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { LocateFixed, MapPin } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { formatMoney } from "@/lib/membership";
import { eventWhen, isTonight, tonightCutoff } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ClubAvatar } from "@/components/ig/avatars";
import { BrandMark } from "@/components/ig/brand";
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

const BRAND = "#ff7f32";
const BRAND_GRADIENT = "linear-gradient(135deg,#ffb061,#ff7f32 50%,#f2541b)";

/** Club pin: logo disc on a pointer; orange when active, with a live dot if something's on tonight. */
function markerElement(club: ClubPublic, active: boolean, live: boolean) {
  const size = active ? 54 : 42;
  const el = document.createElement("div");
  el.style.cssText = `position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform-origin:bottom center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));`;

  const ring = document.createElement("div");
  ring.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;padding:3px;background:${active ? BRAND_GRADIENT : "#ffffff"};`;
  const inner = document.createElement("div");
  inner.style.cssText = `width:100%;height:100%;border-radius:9999px;overflow:hidden;background:#fff3ea;display:flex;align-items:center;justify-content:center;font:700 15px var(--font-outfit),system-ui;color:${BRAND};border:2px solid #fff;`;
  if (club.logo_url) {
    const img = document.createElement("img");
    img.src = club.logo_url;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    inner.appendChild(img);
  } else {
    inner.textContent = club.name.slice(0, 1).toUpperCase();
  }
  ring.appendChild(inner);
  el.appendChild(ring);

  const pointer = document.createElement("div");
  pointer.style.cssText = `width:0;height:0;margin-top:-2px;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${active ? "#f2541b" : "#ffffff"};`;
  el.appendChild(pointer);

  if (live) {
    const dot = document.createElement("span");
    dot.style.cssText = `position:absolute;top:0;right:0;width:13px;height:13px;border-radius:9999px;background:${BRAND};border:2px solid #fff;animation:live-pulse 1.8s infinite;`;
    el.appendChild(dot);
  }

  if (active) {
    const label = document.createElement("div");
    label.textContent = club.name;
    label.style.cssText = `margin-top:4px;padding:2px 8px;border-radius:9999px;background:#fff;color:#1a140f;font:600 12px var(--font-outfit),system-ui;white-space:nowrap;`;
    el.appendChild(label);
  }
  return el;
}

/** "You are here": white disc with an orange core and a pulsing halo. */
function youElement() {
  const el = document.createElement("div");
  el.style.cssText = `width:20px;height:20px;border-radius:9999px;background:${BRAND};border:4px solid #fff;animation:live-pulse 2s infinite;box-shadow:0 1px 4px rgba(0,0,0,.4);`;
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
    const windowMs = filter === "tonight" ? tonightCutoff(now) - now : 7 * 24 * HOUR;
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

  // Clubs with something on tonight get a pulsing dot on their pin, whatever the filter.
  const liveIds = useMemo(() => {
    const now = Date.now();
    return new Set(events.filter((e) => isTonight(e.start_at, e.end_at, now)).map((e) => e.club_id));
  }, [events]);

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
        content: markerElement(club, false, liveIds.has(club.id)),
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
  }, [mapReady, rows, liveIds]);

  // Highlight the active club's marker (restyles just the old + new one).
  useEffect(() => {
    const markers = markersRef.current;
    const prev = activeMarkerId.current;
    if (prev && prev !== activeClubId) {
      const m = markers.get(prev);
      const row = rows.find((r) => r.club.id === prev);
      if (m && row) {
        m.content = markerElement(row.club, false, liveIds.has(row.club.id));
        m.zIndex = null;
      }
    }
    if (activeClubId) {
      const m = markers.get(activeClubId);
      const row = rows.find((r) => r.club.id === activeClubId);
      if (m && row) {
        m.content = markerElement(row.club, true, liveIds.has(row.club.id));
        m.zIndex = 999;
      }
    }
    activeMarkerId.current = activeClubId;
  }, [activeClubId, rows, mapReady, liveIds]);

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
    // The card whose left edge is closest to the scroll position is the active one.
    let index = 0;
    let best = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const d = Math.abs((child as HTMLElement).offsetLeft - el.offsetLeft - 12 - el.scrollLeft);
      if (d < best) {
        best = d;
        index = i;
      }
    });
    const row = rows[index];
    if (row && row.club.id !== activeRow?.club.id) setActiveId(row.club.id);
  }

  const tonightCount = rows.filter((r) => r.nextEvent && liveIds.has(r.club.id)).length;

  return (
    <main className="fixed inset-0 md:left-[76px] xl:left-[248px] overflow-hidden">
      {mapError ? (
        <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">{mapError}</div>
      ) : (
        <div ref={mapDiv} className="h-full w-full bg-muted" />
      )}

      {/* Header + filters */}
      <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 self-start rounded-2xl bg-background/90 px-3 py-2 shadow-lg backdrop-blur-md">
          <span className="flex size-9 items-center justify-center rounded-full brand-gradient text-white">
            <BrandMark size={20} />
          </span>
          <div className="leading-tight">
            <p className="font-semibold">Clubs near you</p>
            <p className="text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "club" : "clubs"}
              {tonightCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-primary">{tonightCount} on tonight</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setActiveId(null);
                cardsRef.current?.scrollTo({ left: 0 });
              }}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold shadow-md transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-background/95 text-foreground backdrop-blur",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom: recentre + nearest-first club cards (sit above the floating tab bar on mobile) */}
      <div className="absolute inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] flex flex-col gap-3 md:bottom-4">
        <button
          onClick={() => mapRef.current?.panTo(position)}
          aria-label="Centre on me"
          className="mr-3 self-end rounded-full bg-background p-3 text-primary shadow-lg"
        >
          <LocateFixed className="size-5" />
        </button>

        {rows.length === 0 ? (
          <div className="mx-3 rounded-3xl bg-background p-4 text-center text-sm shadow-lg">
            {clubs.length === 0 ? "No clubs on the map yet." : "Nothing on in this window — try another filter."}
          </div>
        ) : (
          <div
            ref={cardsRef}
            onScroll={onCardsScroll}
            className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-3 scroll-px-3"
          >
            {rows.map(({ club, km, nextEvent }) => {
              const active = club.id === activeRow?.club.id;
              const tonight = nextEvent && isTonight(nextEvent.start_at, nextEvent.end_at);
              return (
                <div
                  key={club.id}
                  id={`club-card-${club.id}`}
                  onClick={() => setActiveId(club.id)}
                  className={cn(
                    "snap-start shrink-0 w-[86%] max-w-[360px] rounded-3xl bg-background p-3 shadow-xl transition-all",
                    active ? "ring-2 ring-primary" : "ring-1 ring-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/c/${club.slug}`}>
                      <ClubAvatar url={club.logo_url} name={club.name} size={48} ring={tonight ? "unseen" : "none"} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/c/${club.slug}`} className="block truncate font-semibold leading-tight">
                        {club.name}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">
                          <MapPin className="size-3" />
                          {formatKm(km)}
                        </span>
                        <span className="capitalize">{club.category}</span>
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
                      className="mt-3 flex items-center gap-3 rounded-2xl bg-muted p-2 hover:bg-accent"
                    >
                      {nextEvent.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={nextEvent.cover_image_url} alt="" className="size-12 rounded-xl object-cover" />
                      ) : (
                        <span className="brand-tile size-12 shrink-0 rounded-xl" />
                      )}
                      <span className="min-w-0 flex-1">
                        {tonight && (
                          <span className="mb-0.5 inline-block rounded-full bg-primary px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                            Tonight
                          </span>
                        )}
                        <span className="block truncate text-sm font-semibold">{nextEvent.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {eventWhen(nextEvent.start_at)} ·{" "}
                          {nextEvent.price_cents ? formatMoney(nextEvent.price_cents, nextEvent.currency) : "Free"}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <p className="mt-3 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">No events announced this week</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
