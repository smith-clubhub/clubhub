"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildStoragePath, bucketForKind } from "@/lib/media-paths";
import { recordMediaAssetAction } from "@/app/c/[slug]/admin/settings/media-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MediaKind } from "@/lib/types";

export function MediaUploadForm({
  clubId,
  slug,
  kind,
  label,
  accept,
  disabled,
  disabledReason,
}: {
  clubId: string;
  slug: string;
  kind: MediaKind;
  label: string;
  accept: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setStatus("uploading");
    setError(null);

    const supabase = createClient();
    const storagePath = buildStoragePath(clubId, kind, file.name);

    const { error: uploadError } = await supabase.storage
      .from(bucketForKind(kind))
      .upload(storagePath, file, { upsert: kind === "logo" || kind === "cover" });

    if (uploadError) {
      setStatus("error");
      setError(uploadError.message);
      return;
    }

    const result = await recordMediaAssetAction({
      clubId,
      slug,
      kind,
      storagePath,
      sizeBytes: file.size,
    });

    if (result?.error) {
      setStatus("error");
      setError(result.error);
      return;
    }

    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (disabled) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={status === "uploading"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        {status === "uploading" && (
          <Button type="button" size="sm" disabled>
            Uploading...
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
