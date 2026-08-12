import Link from "next/link";
import { VoteButtons } from "./vote-buttons";
import type { EventPublic } from "@/lib/types";

const GRADIENTS = [
  "from-fuchsia-500 to-orange-400",
  "from-violet-500 to-pink-500",
  "from-amber-400 to-rose-500",
  "from-sky-500 to-fuchsia-500",
];

function gradientFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function EventCard({
  event,
  href,
  myVote,
}: {
  event: EventPublic;
  href: string;
  myVote: 1 | -1 | 0;
}) {
  const date = new Date(event.start_at);
  const dateLabel = date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  const timeLabel = date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative flex-shrink-0 w-64 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all bg-white">
      <Link href={href} className="block">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt="" className="w-full h-32 object-cover" />
        ) : (
          <div className={`w-full h-32 bg-gradient-to-br ${gradientFor(event.id)}`} />
        )}
        <div className="p-3 flex flex-col gap-1.5">
          {event.category && (
            <span className="inline-flex self-start rounded-full bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
              {event.category}
            </span>
          )}
          <h3 className="font-bold leading-snug line-clamp-2">{event.title}</h3>
          <p className="text-xs font-medium text-fuchsia-600">
            {dateLabel} &middot; {timeLabel}
          </p>
          <p className="text-xs text-neutral-500 truncate">{event.club_name}</p>
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <VoteButtons eventId={event.id} score={event.score} myVote={myVote} />
      </div>
      <div className="px-3 pb-3">
        <Link
          href={href}
          className="block text-center rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white text-sm font-bold py-1.5 hover:opacity-90 transition-opacity"
        >
          Get tickets
        </Link>
      </div>
    </div>
  );
}
