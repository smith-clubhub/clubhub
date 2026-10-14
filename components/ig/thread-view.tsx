"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markConversationReadAction, sendMessageAction } from "@/app/(app)/direct/actions";
import { ClubAvatar, UserAvatar } from "@/components/ig/avatars";
import { eventWhen } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ThreadData } from "@/lib/direct";
import type { Message } from "@/lib/types";

export function ThreadView({ thread, viewerId }: { thread: ThreadData; viewerId: string }) {
  const [messages, setMessages] = useState<Message[]>(thread.messages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  const isMine = (m: Message) => (thread.actingAsClub ? m.as_club : m.sender_id === viewerId && !m.as_club);

  // Live updates for this thread (RLS limits the stream to threads we can read).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread:${thread.conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${thread.conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (!thread.actingAsClub) void markConversationReadAction(thread.conversationId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [thread.conversationId, thread.actingAsClub]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    setError(null);
    startTransition(async () => {
      const res = await sendMessageAction(thread.conversationId, { body: text, asClub: thread.actingAsClub });
      if ("error" in res) {
        setBody(text);
        setError("Message not sent.");
      } else if (res.message) {
        const m = res.message as Message;
        setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
      }
    });
  }

  function senderAvatar(m: Message) {
    if (m.as_club) {
      return <ClubAvatar url={thread.peer.isClub ? thread.peer.avatarUrl : null} name={thread.peer.title} size={28} />;
    }
    const p = thread.profiles[m.sender_id];
    return <UserAvatar url={p?.avatar_url ?? null} name={p?.username ?? "?"} size={28} />;
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hi 👋</p>
        )}
        <ul className="flex flex-col gap-1">
          {messages.map((m, i) => {
            const mine = isMine(m);
            const nextSameSide = messages[i + 1] && isMine(messages[i + 1]!) === mine;
            return (
              <li key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && <span className="w-7 shrink-0">{!nextSameSide && senderAvatar(m)}</span>}
                <div className={cn("flex max-w-[75%] flex-col gap-1", mine ? "items-end" : "items-start")}>
                  <SharedCard m={m} thread={thread} />
                  {m.body && (
                    <p
                      className={cn(
                        "whitespace-pre-line break-words rounded-3xl px-4 py-2 text-[15px]",
                        mine ? "bg-[#3797f0] text-white" : "bg-secondary",
                      )}
                    >
                      {m.body}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="shrink-0 p-3">
        {error && <p className="pb-2 text-center text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2 rounded-full border px-4 py-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder={thread.actingAsClub ? "Reply as the club…" : "Message…"}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          {body.trim() && (
            <button disabled={pending} className="text-sm font-semibold text-primary disabled:opacity-50">
              Send
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function SharedCard({ m, thread }: { m: Message; thread: ThreadData }) {
  if (m.shared_post_id) {
    const p = thread.sharedPosts[m.shared_post_id];
    const img = p?.media[0];
    return (
      <Link href={`/p/${m.shared_post_id}`} className="block w-56 overflow-hidden rounded-2xl border bg-background">
        {p && (
          <div className="flex items-center gap-2 px-3 py-2">
            <ClubAvatar url={p.club_logo_url} name={p.club_name} size={24} />
            <span className="truncate text-sm font-semibold">{p.club_slug}</span>
          </div>
        )}
        <div className="aspect-square bg-muted">
          {img && img.kind === "post_photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="ig-gradient flex h-full w-full items-center justify-center p-4 text-center font-bold text-white">
              {p?.event_title ?? p?.caption ?? "View post"}
            </div>
          )}
        </div>
        {p?.caption && p.kind !== "event" && <p className="line-clamp-2 px-3 py-2 text-xs">{p.caption}</p>}
      </Link>
    );
  }
  if (m.shared_event_id) {
    const e = thread.sharedEvents[m.shared_event_id];
    if (!e) return <span className="text-xs text-muted-foreground">Event unavailable</span>;
    return (
      <Link href={`/c/${e.club_slug}/events/${e.id}`} className="flex w-60 items-center gap-3 rounded-2xl border bg-background p-2">
        {e.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_image_url} alt="" className="size-14 rounded-xl object-cover" />
        ) : (
          <span className="ig-gradient flex size-14 shrink-0 items-center justify-center rounded-xl text-white">
            <CalendarDays className="size-6" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{e.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {e.club_name} · {eventWhen(e.start_at)}
          </span>
        </span>
      </Link>
    );
  }
  if (m.shared_club_id) {
    const c = thread.sharedClubs[m.shared_club_id];
    if (!c) return <span className="text-xs text-muted-foreground">Club unavailable</span>;
    return (
      <Link href={`/c/${c.slug}`} className="flex w-56 flex-col items-center gap-2 rounded-2xl border bg-background p-4">
        <ClubAvatar url={c.logo_url} name={c.name} size={64} />
        <span className="text-sm font-semibold">{c.name}</span>
        <span className="text-xs font-semibold text-primary">View profile</span>
      </Link>
    );
  }
  return null;
}
