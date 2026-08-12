"use client";

import { useActionState } from "react";
import { updatePackageTierAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClubPackageTier } from "@/lib/types";

export function PackageTierForm({ tier }: { tier: ClubPackageTier }) {
  const [state, formAction, pending] = useActionState(updatePackageTierAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="tierId" value={tier.id} />
      <div className="grid gap-2">
        <Label htmlFor={`name-${tier.id}`}>Name</Label>
        <Input id={`name-${tier.id}`} name="name" defaultValue={tier.name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`description-${tier.id}`}>Description</Label>
        <Textarea id={`description-${tier.id}`} name="description" defaultValue={tier.description ?? ""} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`price-${tier.id}`}>Price (cents, ZAR)</Label>
          <Input id={`price-${tier.id}`} name="priceCents" type="number" min={0} defaultValue={tier.price_cents} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`photo-${tier.id}`}>Photo quota</Label>
          <Input id={`photo-${tier.id}`} name="photoQuota" type="number" min={0} defaultValue={tier.photo_quota} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`video-${tier.id}`}>Video quota</Label>
          <Input id={`video-${tier.id}`} name="videoQuota" type="number" min={0} defaultValue={tier.video_quota} />
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="streamingEnabled" defaultChecked={tier.streaming_enabled} />
          Streaming access (reserved, unused this phase)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={tier.is_active} />
          Active
        </label>
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Saved.</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
