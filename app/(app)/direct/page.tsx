import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClubInboxes, getThreads } from "@/lib/direct";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ClubAvatar, UserAvatar } from "@/components/ig/avatars";
import { NewMessageButton } from "@/components/ig/new-message";

export const metadata = { title: "Messages · ClubHub" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ inbox?: string }> }) {
  const { inbox } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/direct");
  const userId = userData.user.id;

  const [{ data: me }, clubInboxes] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).single(),
    getClubInboxes(userId),
  ]);
  const activeClub = clubInboxes.find((c) => c.id === inbox) ?? null;
  const threads = await getThreads(userId, activeClub?.id ?? null);

  return (
    <main className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:static md:border-none md:pt-6">
        <h1 className="text-xl font-bold">{activeClub ? activeClub.slug : me?.username}</h1>
        {!activeClub && <NewMessageButton />}
      </header>

      {clubInboxes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
          <Link
            href="/direct"
            className={cn("shrink-0 rounded-full border px-3 py-1 text-sm", !activeClub && "border-foreground font-semibold")}
          >
            Personal
          </Link>
          {clubInboxes.map((c) => (
            <Link
              key={c.id}
              href={`/direct?inbox=${c.id}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm",
                activeClub?.id === c.id && "border-foreground font-semibold",
              )}
            >
              <ClubAvatar url={c.logo_url} name={c.name} size={20} />
              {c.slug}
            </Link>
          ))}
        </div>
      )}

      <h2 className="px-4 pb-2 pt-2 text-base font-bold">Messages</h2>
      {threads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
          <span className="rounded-full bg-accent p-5 text-primary">
            <MessageCircle className="size-10" strokeWidth={1.5} />
          </span>
          <p className="text-lg font-semibold">Your messages</p>
          <p className="text-sm text-muted-foreground">
            {activeClub
              ? "When people message your club, the conversations show up here."
              : "Message a club from its profile, or share posts and events with friends."}
          </p>
        </div>
      ) : (
        <ul>
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/direct/${t.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-accent">
                {t.isClub ? (
                  <ClubAvatar url={t.avatarUrl} name={t.title} size={56} />
                ) : (
                  <UserAvatar url={t.avatarUrl} name={t.title} size={56} />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", t.unread && "font-semibold")}>{t.title}</span>
                  <span className={cn("block truncate text-sm", t.unread ? "font-semibold" : "text-muted-foreground")}>
                    {t.preview} · {timeAgo(t.lastMessageAt)}
                  </span>
                </span>
                {t.unread && <span className="size-2 rounded-full bg-primary" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
