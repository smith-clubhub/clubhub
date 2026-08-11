"use client";

import { useActionState, useState } from "react";
import { createEventAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EventForm({ clubId, slug }: { clubId: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createEventAction, undefined);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New event</Button>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New event</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="slug" value={slug} />
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startAt">Starts</Label>
              <Input id="startAt" name="startAt" type="datetime-local" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endAt">Ends</Label>
              <Input id="endAt" name="endAt" type="datetime-local" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Clubhouse, or a video link" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="isVirtual" name="isVirtual" type="checkbox" className="h-4 w-4" />
              <Label htmlFor="isVirtual">Virtual event</Label>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input id="capacity" name="capacity" type="number" min="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={0} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="registrationDeadline">Registration deadline</Label>
              <Input id="registrationDeadline" name="registrationDeadline" type="datetime-local" />
            </div>
          </div>
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create draft"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
