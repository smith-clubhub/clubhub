"use client";

import { useActionState } from "react";
import { updateClubAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { Club } from "@/lib/types";

export function ClubSettingsForm({ club }: { club: Club }) {
  const [state, formAction, pending] = useActionState(updateClubAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="clubId" value={club.id} />
      <input type="hidden" name="slug" value={club.slug} />
      <div className="grid gap-2">
        <Label htmlFor="name">Club name</Label>
        <Input id="name" name="name" defaultValue={club.name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={club.description ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={club.category}>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="alumni">Alumni</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Select id="currency" name="currency" defaultValue={club.currency}>
            <SelectItem value="ZAR">ZAR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={club.contact_email ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contactPhone">Contact phone</Label>
          <Input id="contactPhone" name="contactPhone" defaultValue={club.contact_phone ?? ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={club.address ?? ""} />
      </div>
      <div className="grid gap-2 max-w-40">
        <Label htmlFor="primaryColor">Brand color</Label>
        <Input id="primaryColor" name="primaryColor" type="color" defaultValue={club.primary_color} className="h-9 p-1" />
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Saved.</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}
