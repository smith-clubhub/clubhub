/** Instagram-style relative time: "now", "5m", "3h", "2d", "4w", then a date. */
export function timeAgo(iso: string, now: Date = new Date()) {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }).replace(/\s/g, " ");
}

/** "Fri 17 Oct · 22:00" in South African time. */
export function eventWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });
  const time = d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" });
  // Normalise ICU whitespace differences between Node and browsers (hydration-safe).
  return `${day} · ${time}`.replace(/\s/g, " ");
}
