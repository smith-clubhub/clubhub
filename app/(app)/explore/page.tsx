import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { eventWhen } from "@/lib/time";
import { ClubAvatar } from "@/components/ig/avatars";
import { PostGrid } from "@/components/ig/post-grid";
import { SearchBox } from "@/components/ig/search-box";
import type { PostFeedItem } from "@/lib/types";

export const metadata = { title: "Search · ClubHub" };

/** Strip PostgREST filter syntax characters from free-text search. */
function sanitize(q: string) {
  return q.replace(/[%_,()*\\.:"']/g, " ").trim().slice(0, 60);
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = sanitize(q);
  const supabase = await createClient();

  if (!term) {
    const { data: posts } = await supabase
      .from("posts_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(45);
    return (
      <main className="mx-auto w-full max-w-[935px]">
        <SearchBox initial="" />
        <div className="md:px-4 md:pt-2">
          {(posts ?? []).length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Nothing to explore yet.</p>
          ) : (
            <PostGrid posts={(posts ?? []) as PostFeedItem[]} />
          )}
        </div>
      </main>
    );
  }

  const pattern = `%${term}%`;
  const [{ data: clubs }, { data: events }] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, name, slug, logo_url, category")
      .eq("status", "active")
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(20),
    supabase
      .from("events_public")
      .select("id, title, start_at, club_slug, club_name, club_logo_url, cover_image_url")
      .ilike("title", pattern)
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(20),
  ]);

  return (
    <main className="mx-auto w-full max-w-[600px]">
      <SearchBox initial={q} />
      <div className="px-4 pb-8">
        {(clubs ?? []).length === 0 && (events ?? []).length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">No results for &ldquo;{q}&rdquo;.</p>
        )}
        {(clubs ?? []).length > 0 && (
          <section className="py-2">
            <h2 className="py-2 text-sm font-semibold">Clubs</h2>
            <ul>
              {(clubs ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-accent">
                    <ClubAvatar url={c.logo_url} name={c.name} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.slug}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {c.name} · <span className="capitalize">{c.category}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {(events ?? []).length > 0 && (
          <section className="py-2">
            <h2 className="py-2 text-sm font-semibold">Events</h2>
            <ul>
              {(events ?? []).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/c/${e.club_slug}/events/${e.id}`}
                    className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-accent"
                  >
                    {e.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover_image_url} alt="" className="size-11 rounded-lg object-cover" />
                    ) : (
                      <span className="brand-tile flex size-11 shrink-0 items-center justify-center rounded-lg text-white">
                        <CalendarDays className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {e.club_name} · {eventWhen(e.start_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
