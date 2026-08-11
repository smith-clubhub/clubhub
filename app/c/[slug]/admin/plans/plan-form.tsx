"use client";

import { useActionState } from "react";
import { savePlanAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MembershipPlan } from "@/lib/types";

export function PlanForm({
  clubId,
  slug,
  plan,
  onDone,
}: {
  clubId: string;
  slug: string;
  plan?: MembershipPlan;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(savePlanAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{plan ? "Edit plan" : "New membership plan"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="slug" value={slug} />
          {plan && <input type="hidden" name="planId" value={plan.id} />}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={plan?.name} required placeholder="Annual Adult" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={plan?.description ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={plan ? plan.price_cents / 100 : 0}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingInterval">Billing</Label>
              <Select id="billingInterval" name="billingInterval" defaultValue={plan?.billing_interval ?? "annual"}>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
              <Input id="gracePeriodDays" name="gracePeriodDays" type="number" min="0" defaultValue={plan?.grace_period_days ?? 0} />
            </div>
          </div>
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="maxMembers">Max members (optional)</Label>
            <Input id="maxMembers" name="maxMembers" type="number" min="1" defaultValue={plan?.max_members ?? ""} />
          </div>
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : plan ? "Save changes" : "Create plan"}
            </Button>
            {onDone && (
              <Button type="button" variant="ghost" onClick={onDone}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
