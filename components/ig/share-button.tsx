"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { ShareSheet } from "@/components/ig/share-sheet";

export type ShareKind = "post" | "event" | "club";

function sharePath(kind: ShareKind, id: string, slug?: string) {
  return kind === "post" ? `/p/${id}` : kind === "club" ? `/c/${slug ?? id}` : `/c/${slug}/events/${id}`;
}

/**
 * Logged in: Instagram-style share sheet (send to DMs or copy link).
 * Logged out: the OS share sheet, falling back to copying the link.
 */
export function ShareButton({
  kind,
  id,
  slug,
  isAuthenticated,
  className,
  children,
}: {
  kind: ShareKind;
  id: string;
  slug?: string;
  isAuthenticated: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  async function onClick() {
    if (isAuthenticated) return setOpen(true);
    const url = `${window.location.origin}${sharePath(kind, id, slug)}`;
    if (navigator.share) await navigator.share({ url }).catch(() => {});
    else await navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <>
      <button onClick={onClick} aria-label="Share" className={className}>
        {children ?? <Send className="size-6" />}
      </button>
      {open && (
        <ShareSheet
          onClose={() => setOpen(false)}
          subject={{
            url: `${window.location.origin}${sharePath(kind, id, slug)}`,
            sharedPostId: kind === "post" ? id : undefined,
            sharedEventId: kind === "event" ? id : undefined,
            sharedClubId: kind === "club" ? id : undefined,
          }}
        />
      )}
    </>
  );
}
