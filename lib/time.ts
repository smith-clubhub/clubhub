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
  const p = sastParts(iso);
  return `${p.day} ${p.month}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // South Africa is UTC+2 all year (no DST)

/**
 * Date parts in South African time, computed by hand rather than via Intl so
 * server (Node ICU) and browser render identical text and hydration matches.
 */
export function sastParts(iso: string) {
  const d = new Date(new Date(iso).getTime() + SAST_OFFSET_MS);
  return {
    weekday: WEEKDAYS[d.getUTCDay()]!,
    day: d.getUTCDate(),
    month: MONTHS[d.getUTCMonth()]!,
    time: `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`,
    dateKey: d.toISOString().slice(0, 10),
  };
}

/** "Fri 17 Oct · 22:00" in South African time. */
export function eventWhen(iso: string) {
  const p = sastParts(iso);
  return `${p.weekday} ${p.day} ${p.month} · ${p.time}`;
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * End of "tonight": the 06:00 SAST that closes the coming night. Computed from
 * now + 6h so that at 01:00 tonight still means "this evening", not "ends in 5h".
 */
export function tonightCutoff(now: number = Date.now()) {
  const probe = new Date(now + 6 * HOUR_MS + SAST_OFFSET_MS); // shifted into SAST
  const sixAm = Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), probe.getUTCDate(), 6) - SAST_OFFSET_MS;
  return sixAm > now + 6 * HOUR_MS ? sixAm : sixAm + 24 * HOUR_MS;
}

/** An event is on tonight if it hasn't finished and starts before tonight's 06:00 cutoff. */
export function isTonight(startIso: string, endIso: string | null = null, now: number = Date.now()) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : start + 8 * HOUR_MS;
  return end > now && start < tonightCutoff(now);
}
