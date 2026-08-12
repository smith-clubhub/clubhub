"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { voteEventAction } from "@/app/vote-actions";

export function VoteButtons({
  eventId,
  score,
  myVote,
}: {
  eventId: string;
  score: number;
  myVote: 1 | -1 | 0;
}) {
  const router = useRouter();
  const [optimisticScore, setOptimisticScore] = useState(score);
  const [optimisticVote, setOptimisticVote] = useState<1 | -1 | 0>(myVote);
  const [pending, setPending] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (pending) return;
    setPending(true);

    const prevVote = optimisticVote;
    const prevScore = optimisticScore;
    const nextVote = prevVote === value ? 0 : value;
    const delta = nextVote - prevVote;

    setOptimisticVote(nextVote);
    setOptimisticScore(prevScore + delta);

    const result = await voteEventAction(eventId, value);
    if (result?.error === "auth_required") {
      setOptimisticVote(prevVote);
      setOptimisticScore(prevScore);
      router.push("/auth/login?next=/");
    }
    setPending(false);
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-1.5 py-1 shadow-md">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={pending}
        aria-label="Upvote"
        className={cn(
          "rounded-full p-1 transition-colors",
          optimisticVote === 1 ? "bg-emerald-500 text-white" : "text-neutral-500 hover:bg-neutral-100",
        )}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <span className="min-w-[2ch] text-center text-sm font-bold text-neutral-900">{optimisticScore}</span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={pending}
        aria-label="Downvote"
        className={cn(
          "rounded-full p-1 transition-colors",
          optimisticVote === -1 ? "bg-fuchsia-600 text-white" : "text-neutral-500 hover:bg-neutral-100",
        )}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
