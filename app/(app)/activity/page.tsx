import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { PageHeader } from "@/components/ig/app-shell";
import { ClubAvatar } from "@/components/ig/avatars";

export const metadata = { title: "Notifications · ClubHub" };

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/activity");
  const userId = userData.user.id;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, sent_at, club_id, clubs(slug, name, logo_url)")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(100);

  // Opening the tab clears the badge (rows already fetched keep their unread styling).
  if ((notifications ?? []).some((n) => !n.read_at)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  }

  return (
    <main className="mx-auto w-full max-w-[600px]">
      <PageHeader title="Notifications" />
      {(notifications ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-20 text-center">
          <span className="rounded-full border-2 border-foreground p-4">
            <Heart className="size-10" strokeWidth={1.25} />
          </span>
          <p className="text-lg font-semibold">Activity on clubs you follow</p>
          <p className="text-sm text-muted-foreground">New posts, events and announcements from your clubs will show up here.</p>
        </div>
      ) : (
        <ul className="py-2">
          {(notifications ?? []).map((n) => {
            const club = n.clubs as unknown as { slug: string; name: string; logo_url: string | null } | null;
            const href = club ? (n.type === "announcement" ? `/c/${club.slug}/announcements` : `/c/${club.slug}`) : "#";
            return (
              <li key={n.id}>
                <Link href={href} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent ${n.read_at ? "" : "bg-primary/5"}`}>
                  <ClubAvatar url={club?.logo_url ?? null} name={club?.name ?? "ClubHub"} size={44} />
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{club?.slug ?? n.title}</span>{" "}
                    {n.type === "new_post" ? n.body : n.title && club ? `${n.title}${n.body ? ` — ${n.body}` : ""}` : n.body}{" "}
                    <span className="text-muted-foreground">{n.sent_at ? timeAgo(n.sent_at) : ""}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
