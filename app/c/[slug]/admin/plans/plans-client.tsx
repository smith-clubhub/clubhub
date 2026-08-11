"use client";

import { useState } from "react";
import { togglePlanActiveAction } from "./actions";
import { PlanForm } from "./plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, billingIntervalLabel } from "@/lib/membership";
import type { MembershipPlan } from "@/lib/types";

export function PlansClient({ clubId, slug, plans }: { clubId: string; slug: string; plans: MembershipPlan[] }) {
  const [editing, setEditing] = useState<MembershipPlan | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <PlanForm clubId={clubId} slug={slug} plan={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing("new")} className="w-fit">
          New plan
        </Button>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{plan.name}</span>
                {!plan.is_active && <Badge variant="outline">inactive</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              <p className="font-semibold text-brand-600">
                {plan.price_cents === 0 ? "Free" : `${formatMoney(plan.price_cents, plan.currency)} ${billingIntervalLabel(plan.billing_interval)}`}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>
                  Edit
                </Button>
                <form action={togglePlanActiveAction}>
                  <input type="hidden" name="clubId" value={clubId} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="isActive" value={String(plan.is_active)} />
                  <Button size="sm" variant="ghost" type="submit">
                    {plan.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-sm text-muted-foreground">No plans yet.</p>}
      </div>
    </div>
  );
}
