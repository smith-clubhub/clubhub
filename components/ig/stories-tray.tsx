import Link from "next/link";
import { ClubAvatar } from "@/components/ig/avatars";
import type { StoryClub } from "@/lib/stories";

export function StoriesTray({ clubs }: { clubs: StoryClub[] }) {
  if (clubs.length === 0) return null;
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar px-4 py-3 border-b md:border-none">
      {clubs.map((c) => (
        <Link key={c.clubId} href={`/stories/${c.slug}`} className="flex w-[66px] shrink-0 flex-col items-center gap-1">
          <ClubAvatar url={c.logoUrl} name={c.name} size={66} ring={c.allSeen ? "seen" : "unseen"} />
          <span className="w-full truncate text-center text-xs">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
