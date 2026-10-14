import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Building2, Settings, Ticket, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { eventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ClubAvatar, UserAvatar } from "@/components/ig/avatars";
import { PostGrid } from "@/components/ig/post-grid";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { PostFeedItem } from "@/lib/types";

type ClubRef = { id: string; name: string; slug: string; logo_url: string | null; status: string };

const TABS = [
  { key: "saved", label: "Saved", icon: Bookmark },
  { key: "following", label: "Following", icon: Users },
  { key: "tickets", label: "Tickets", icon: Ticket },
  { key: "clubs", label: "My clubs", icon: Building2 },
] as const;

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "saved" } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login?next=/profile");

  const [{ data: profile }, { data: follows }, { count: savedCount }, { data: memberships }, { data: staff }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("follows")
        .select("created_at, clubs(id, name, slug, logo_url, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("post_saves").select("post_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("members").select("id, status, clubs(id, name, slug, logo_url, status)").eq("user_id", user.id),
      supabase
        .from("user_role_assignments")
        .select("roles(name), clubs(id, name, slug, logo_url, status)")
        .eq("user_id", user.id)
        .not("club_id", "is", null),
    ]);

  const followedClubs = (follows ?? []).map((f) => f.clubs as unknown as ClubRef).filter(Boolean);
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  let tabBody: React.ReactNode = null;

  if (tab === "saved") {
    const { data: saves } = await supabase
      .from("post_saves")
      .select("post_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    const ids = (saves ?? []).map((s) => s.post_id as string);
    const { data: posts } = ids.length
      ? await supabase.from("posts_feed").select("*").in("id", ids)
      : { data: [] };
    const ordered = ids.map((id) => (posts ?? []).find((p) => p.id === id)).filter(Boolean) as PostFeedItem[];
    tabBody =
      ordered.length === 0 ? (
        <Empty title="Save posts you like" body="Tap the bookmark on any post to keep it here. Only you can see what you've saved." />
      ) : (
        <PostGrid posts={ordered} />
      );
  } else if (tab === "following") {
    tabBody =
      followedClubs.length === 0 ? (
        <Empty title="Not following any clubs" body="Find clubs near you on the map and follow them to see their posts." cta={{ href: "/map", label: "Open the map" }} />
      ) : (
        <ul className="divide-y">
          {followedClubs.map((c) => (
            <li key={c.id}>
              <Link href={`/c/${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent">
                <ClubAvatar url={c.logo_url} name={c.name} size={44} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{c.slug}</span>
                  <span className="block truncate text-sm text-muted-foreground">{c.name}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      );
  } else if (tab === "tickets") {
    const memberIds = (memberships ?? []).map((m) => m.id as string);
    const { data: regs } = memberIds.length
      ? await supabase
          .from("event_registrations")
          .select("id, status, events(id, title, start_at, cover_image_url, clubs(slug, name))")
          .in("member_id", memberIds)
          .in("status", ["registered", "waitlisted", "attended"])
          .order("registered_at", { ascending: false })
          .limit(50)
      : { data: [] };
    type Reg = {
      id: string;
      status: string;
      events: { id: string; title: string; start_at: string; cover_image_url: string | null; clubs: { slug: string; name: string } };
    };
    const rows = ((regs ?? []) as unknown as Reg[]).filter((r) => r.events);
    tabBody =
      rows.length === 0 ? (
        <Empty title="No tickets yet" body="Events you register for or buy tickets to will show up here." />
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/c/${r.events.clubs.slug}/events/${r.events.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
              >
                {r.events.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.events.cover_image_url} alt="" className="size-12 rounded-lg object-cover" />
                ) : (
                  <span className="brand-tile size-12 shrink-0 rounded-lg" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.events.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {r.events.clubs.name} · {eventWhen(r.events.start_at)}
                  </span>
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold capitalize">{r.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
  } else {
    const byClub = new Map<string, { club: ClubRef; memberStatus?: string; roles: string[] }>();
    for (const m of memberships ?? []) {
      const club = m.clubs as unknown as ClubRef | null;
      if (club) byClub.set(club.id, { club, memberStatus: m.status, roles: [] });
    }
    for (const s of staff ?? []) {
      const club = s.clubs as unknown as ClubRef | null;
      const role = (s.roles as unknown as { name: string } | null)?.name;
      if (!club || !role) continue;
      const entry = byClub.get(club.id) ?? { club, roles: [] };
      entry.roles.push(role);
      byClub.set(club.id, entry);
    }
    const rows = [...byClub.values()];
    tabBody = (
      <div>
        {rows.length === 0 ? (
          <Empty title="No memberships" body="Clubs you join as a member, or help run, show up here." />
        ) : (
          <ul className="divide-y">
            {rows.map(({ club, memberStatus, roles }) => (
              <li key={club.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/c/${club.slug}`}>
                  <ClubAvatar url={club.logo_url} name={club.name} size={44} />
                </Link>
                <Link href={`/c/${club.slug}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{club.name}</span>
                  <span className="block truncate text-xs text-muted-foreground capitalize">
                    {[memberStatus && `member · ${memberStatus}`, ...roles].filter(Boolean).join(" · ")}
                  </span>
                </Link>
                {roles.length > 0 && (
                  <Link href={`/c/${club.slug}/admin`} className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold">
                    Manage
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 p-4">
          <Link href="/onboarding" className="rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground">
            Add your club to ClubHub
          </Link>
          <form action="/c/redirect" className="flex gap-2">
            <input
              name="slug"
              placeholder="Have a club code? e.g. truth-jhb"
              className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button className="rounded-lg bg-secondary px-4 text-sm font-semibold">Go</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[935px]">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:static md:h-auto md:border-none md:pt-6">
        <h1 className="font-semibold text-base md:text-xl">{profile?.username}</h1>
        <details className="relative">
          <summary className="list-none cursor-pointer p-1" aria-label="Settings">
            <Settings className="size-6" />
          </summary>
          <div className="absolute right-0 z-30 mt-2 flex w-56 flex-col gap-3 rounded-xl border bg-popover p-3 shadow-lg">
            <div className="flex items-center justify-between text-sm">
              Theme <ThemeSwitcher />
            </div>
            <LogoutButton />
          </div>
        </details>
      </header>

      <section className="flex items-center gap-6 px-4 pt-4 md:gap-20 md:px-14">
        <UserAvatar url={profile?.avatar_url ?? null} name={profile?.username ?? "?"} size={86} />
        <div className="flex flex-1 justify-around md:justify-start md:gap-10">
          <Count value={followedClubs.length} label="following" />
          <Count value={savedCount ?? 0} label="saved" />
          <Count value={(memberships ?? []).length} label="memberships" />
        </div>
      </section>
      <div className="px-4 pt-3 text-sm md:px-14">
        {displayName && <p className="font-semibold">{displayName}</p>}
        {profile?.bio && <p className="whitespace-pre-line">{profile.bio}</p>}
      </div>
      <div className="px-4 pt-4 md:px-14">
        <Link href="/profile/edit" className="block rounded-lg bg-secondary py-1.5 text-center text-sm font-semibold hover:bg-secondary/80 md:inline-block md:px-6">
          Edit profile
        </Link>
      </div>

      <nav className="mt-6 flex justify-around border-t md:justify-center md:gap-14">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/profile?tab=${t.key}`}
            scroll={false}
            aria-label={t.label}
            className={cn(
              "-mt-px flex items-center gap-1.5 border-t px-2 py-3 text-xs font-semibold uppercase tracking-widest",
              tab === t.key ? "border-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            <t.icon className="size-5 md:size-4" />
            <span className="hidden md:inline">{t.label}</span>
          </Link>
        ))}
      </nav>
      {tabBody}
    </main>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center md:flex-row md:gap-1.5">
      <span className="font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground md:text-base md:text-foreground">{label}</span>
    </div>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <p className="text-xl font-extrabold">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-3 text-sm font-semibold text-primary">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
