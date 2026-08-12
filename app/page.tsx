import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { DiscoveryMap } from "@/components/landing/discovery-map";
import { NearbyClubsStrip } from "@/components/landing/nearby-clubs-strip";
import { EventsFeed } from "@/components/landing/events-feed";
import { createClient } from "@/lib/supabase/server";
import type { DiscoveryClub } from "@/components/landing/discovery-map";
import type { EventPublic } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ data: userData }, { data: clubs }, { data: events }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("clubs_public").select("*").limit(200),
    supabase.from("events_public").select("*").gte("start_at", nowIso).order("start_at").limit(300),
  ]);

  const isAuthenticated = Boolean(userData.user);
  const discoveryClubs = (clubs ?? []) as DiscoveryClub[];
  const discoveryEvents = (events ?? []) as EventPublic[];

  let myVotes: Record<string, 1 | -1> = {};
  if (userData.user && discoveryEvents.length > 0) {
    const { data: votes } = await supabase
      .from("event_votes")
      .select("event_id, value")
      .eq("user_id", userData.user.id)
      .in("event_id", discoveryEvents.map((e) => e.id));
    myVotes = Object.fromEntries((votes ?? []).map((v) => [v.event_id, v.value as 1 | -1]));
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-8 items-center">
        <SiteHeader />
        <div className="flex-1 flex flex-col gap-6 w-full max-w-lg p-5">
          <Hero />
          <DiscoveryMap clubs={discoveryClubs} isAuthenticated={isAuthenticated} />
          <NearbyClubsStrip clubs={discoveryClubs} isAuthenticated={isAuthenticated} />
          <div>
            <h2 className="font-extrabold text-lg mb-2">Trending near you</h2>
            <EventsFeed events={discoveryEvents} isAuthenticated={isAuthenticated} myVotes={myVotes} />
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
          <p>ClubHub &mdash; the SA club scene, live.</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
