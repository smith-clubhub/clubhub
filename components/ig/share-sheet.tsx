"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Link2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  shareTargetsAction,
  shareToConversationsAction,
  shareToUserAction,
  type ShareTarget,
} from "@/app/(app)/direct/actions";
import { ClubAvatar, UserAvatar } from "@/components/ig/avatars";

export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] md:max-w-[480px] md:rounded-2xl"
      >
        <div className="relative flex h-12 shrink-0 items-center justify-center border-b">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 p-1">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TargetPicker({
  selected,
  onToggle,
  single,
}: {
  selected: ShareTarget[];
  onToggle: (t: ShareTarget) => void;
  single?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<ShareTarget[] | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const res = await shareTargetsAction(query);
      if (live) setTargets(res);
    }, query ? 250 : 0);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <>
      <label className="mx-4 my-3 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search usernames"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>
      <ul className="min-h-[200px] flex-1 overflow-y-auto">
        {targets === null ? (
          <li className="py-8 text-center text-sm text-muted-foreground">Loading…</li>
        ) : targets.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {query ? "No users found." : "Search for a username to start a chat."}
          </li>
        ) : (
          targets.map((t) => {
            const on = selected.some((s) => s.kind === t.kind && s.id === t.id);
            return (
              <li key={`${t.kind}:${t.id}`}>
                <button onClick={() => onToggle(t)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent">
                  {t.isClub ? (
                    <ClubAvatar url={t.avatarUrl} name={t.title} size={44} />
                  ) : (
                    <UserAvatar url={t.avatarUrl} name={t.title} size={44} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.title}</span>
                  {!single && (
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border-2",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
}

export interface ShareSubject {
  sharedPostId?: string;
  sharedEventId?: string;
  sharedClubId?: string;
  url: string;
}

export function ShareSheet({ subject, onClose }: { subject: ShareSubject; onClose: () => void }) {
  const [selected, setSelected] = useState<ShareTarget[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "copied" | "error">("idle");
  const [pending, startTransition] = useTransition();

  function toggle(t: ShareTarget) {
    setSelected((prev) =>
      prev.some((s) => s.kind === t.kind && s.id === t.id) ? prev.filter((s) => !(s.kind === t.kind && s.id === t.id)) : [...prev, t],
    );
  }

  function send() {
    const share = { sharedPostId: subject.sharedPostId, sharedEventId: subject.sharedEventId, sharedClubId: subject.sharedClubId };
    startTransition(async () => {
      const threadIds = selected.filter((s) => s.kind === "thread").map((s) => s.id);
      const results = await Promise.all([
        threadIds.length ? shareToConversationsAction(threadIds, share, note) : Promise.resolve({ ok: true as const }),
        ...selected.filter((s) => s.kind === "user").map((s) => shareToUserAction(s.id, share, note)),
      ]);
      if (results.some((r) => "error" in r)) return setStatus("error");
      setStatus("sent");
      setTimeout(onClose, 700);
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(subject.url).catch(() => {});
    setStatus("copied");
  }

  return (
    <BottomSheet title="Share" onClose={onClose}>
      <TargetPicker selected={selected} onToggle={toggle} />
      <div className="shrink-0 border-t p-3">
        {selected.length > 0 ? (
          <div className="flex flex-col gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Write a message…"
              className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={send}
              disabled={pending || status === "sent"}
              className="rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {status === "sent" ? "Sent" : pending ? "Sending…" : selected.length > 1 ? "Send separately" : "Send"}
            </button>
          </div>
        ) : (
          <button onClick={copy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-sm font-semibold">
            <Link2 className="size-4" />
            {status === "copied" ? "Link copied" : "Copy link"}
          </button>
        )}
        {status === "error" && <p className="pt-2 text-center text-xs text-destructive">Couldn&apos;t send. Try again.</p>}
      </div>
    </BottomSheet>
  );
}

/** "New message" picker: choose one user, land in the thread. */
export function NewMessageSheet({ onClose, onPick }: { onClose: () => void; onPick: (t: ShareTarget) => void }) {
  return (
    <BottomSheet title="New message" onClose={onClose}>
      <TargetPicker selected={[]} onToggle={onPick} single />
    </BottomSheet>
  );
}
