import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

// Clubs are squircles, people are circles -- tells them apart at a glance.
const CLUB_RADIUS = "rounded-[32%]";

function AvatarImage({
  url,
  name,
  size,
  className,
}: {
  url: string | null;
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-foreground font-semibold select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name) || "?"
      )}
    </span>
  );
}

export function UserAvatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  return <AvatarImage url={url} name={name} size={size} />;
}

/**
 * Club avatar (squircle) with a story ring: brand-orange gradient when there
 * is an unseen story, grey when all are seen, none when there are no stories.
 */
export function ClubAvatar({
  url,
  name,
  size = 32,
  ring = "none",
}: {
  url: string | null;
  name: string;
  size?: number;
  ring?: "unseen" | "seen" | "none";
}) {
  if (ring === "none") return <AvatarImage url={url} name={name} size={size} className={CLUB_RADIUS} />;
  const pad = size >= 56 ? 3 : 2;
  return (
    <span
      className={cn("inline-flex shrink-0", CLUB_RADIUS, ring === "unseen" ? "brand-gradient" : "bg-border")}
      style={{ padding: pad }}
    >
      <span className={cn("bg-background", CLUB_RADIUS)} style={{ padding: pad }}>
        <AvatarImage url={url} name={name} size={size - pad * 4} className={CLUB_RADIUS} />
      </span>
    </span>
  );
}
