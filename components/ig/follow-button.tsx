"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setFollowAction } from "@/app/(app)/social-actions";
import { useAuthGate } from "@/components/ig/use-auth-gate";

export function FollowButton({
  clubId,
  initialFollowing,
  isAuthenticated,
  size = "md",
  className,
  onChange,
}: {
  clubId: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
  size?: "sm" | "md";
  className?: string;
  onChange?: (following: boolean) => void;
}) {
  const gate = useAuthGate();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (!isAuthenticated) return gate();
    const next = !following;
    setFollowing(next);
    onChange?.(next);
    startTransition(async () => {
      const res = await setFollowAction(clubId, next);
      if ("error" in res) {
        setFollowing(!next);
        onChange?.(!next);
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "rounded-lg font-semibold transition-colors disabled:opacity-70",
        size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-1.5 text-sm",
        following ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
