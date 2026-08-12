import type { MediaKind } from "@/lib/types";

export function buildStoragePath(clubId: string, kind: MediaKind, filename: string) {
  const ext = filename.split(".").pop() || "bin";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2);

  if (kind === "logo") return `${clubId}/logo.${safeExt}`;
  if (kind === "cover") return `${clubId}/cover.${safeExt}`;
  return `${clubId}/gallery/${id}.${safeExt}`;
}

export function bucketForKind(kind: MediaKind) {
  return kind === "logo" || kind === "cover" ? "club-branding" : "club-gallery";
}
