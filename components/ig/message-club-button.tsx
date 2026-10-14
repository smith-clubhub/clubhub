"use client";

import { useTransition } from "react";
import { messageClubAction } from "@/app/(app)/direct/actions";
import { useAuthGate } from "@/components/ig/use-auth-gate";

export function MessageClubButton({ clubId, isAuthenticated }: { clubId: string; isAuthenticated: boolean }) {
  const gate = useAuthGate();
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!isAuthenticated) return gate();
        startTransition(async () => void (await messageClubAction(clubId)));
      }}
      className="flex-1 md:flex-none rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 disabled:opacity-70"
    >
      Message
    </button>
  );
}
