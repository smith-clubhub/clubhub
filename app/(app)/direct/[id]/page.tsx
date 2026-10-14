import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getThread } from "@/lib/direct";
import { ClubAvatar, UserAvatar } from "@/components/ig/avatars";
import { ThreadView } from "@/components/ig/thread-view";
import { markConversationReadAction } from "../actions";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?next=/direct/${id}`);

  const thread = await getThread(userData.user.id, id);
  if (!thread) notFound();
  if (!thread.actingAsClub) await markConversationReadAction(id);

  const backHref = thread.actingAsClub ? `/direct?inbox=${thread.clubId}` : "/direct";
  const avatar = thread.peer.isClub ? (
    <ClubAvatar url={thread.peer.avatarUrl} name={thread.peer.title} size={36} />
  ) : (
    <UserAvatar url={thread.peer.avatarUrl} name={thread.peer.title} size={36} />
  );

  return (
    <main className="mx-auto flex h-[calc(100dvh-100px-env(safe-area-inset-bottom))] w-full max-w-[680px] flex-col md:h-dvh md:border-x">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3">
        <Link href={backHref} aria-label="Back">
          <ChevronLeft className="size-7" />
        </Link>
        {thread.peer.href ? <Link href={thread.peer.href}>{avatar}</Link> : avatar}
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold">{thread.peer.title}</p>
          {thread.peer.subtitle && <p className="truncate text-xs text-muted-foreground">{thread.peer.subtitle}</p>}
        </div>
      </header>
      <ThreadView thread={thread} viewerId={userData.user.id} />
    </main>
  );
}
