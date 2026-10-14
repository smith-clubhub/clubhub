import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

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
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground font-semibold select-none",
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
 * Club avatar with an Instagram story ring: gradient when there is an unseen
 * story, grey when all stories are seen, none when there are no stories.
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
  if (ring === "none") return <AvatarImage url={url} name={name} size={size} />;
  const pad = size >= 56 ? 3 : 2;
  return (
    <span
      className={cn("inline-flex shrink-0 rounded-full", ring === "unseen" ? "ig-gradient" : "bg-border")}
      style={{ padding: pad }}
    >
      <span className="rounded-full bg-background" style={{ padding: pad }}>
        <AvatarImage url={url} name={name} size={size - pad * 4} />
      </span>
    </span>
  );
}
