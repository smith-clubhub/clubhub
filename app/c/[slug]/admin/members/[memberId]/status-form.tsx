"use client";

import { useActionState } from "react";
import { updateMemberStatusAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function StatusForm({
  clubId,
  slug,
  memberId,
  currentStatus,
}: {
  clubId: string;
  slug: string;
  memberId: string;
  currentStatus: string;
}) {
  const [state, formAction, pending] = useActionState(updateMemberStatusAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="memberId" value={memberId} />
      <div className="grid gap-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={currentStatus}>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="expired">Expired</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reason">Reason (required, logged to audit trail)</Label>
        <Textarea id="reason" name="reason" required placeholder="Why is this status changing?" />
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">Updated.</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Update status"}
      </Button>
    </form>
  );
}
