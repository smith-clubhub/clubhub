"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import { messageUserAction } from "@/app/(app)/direct/actions";
import { NewMessageSheet } from "@/components/ig/share-sheet";

export function NewMessageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="New message">
        <SquarePen className="size-6" />
      </button>
      {open && (
        <NewMessageSheet
          onClose={() => setOpen(false)}
          onPick={(t) => {
            setOpen(false);
            if (t.kind === "thread") router.push(`/direct/${t.id}`);
            else startTransition(async () => void (await messageUserAction(t.id)));
          }}
        />
      )}
    </>
  );
}
