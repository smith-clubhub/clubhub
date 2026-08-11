"use client";

import { useActionState } from "react";
import { joinClubAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PlanOption {
  id: string;
  name: string;
  description: string | null;
  priceLabel: string;
}

export function JoinForm({
  clubId,
  slug,
  plans,
}: {
  clubId: string;
  slug: string;
  plans: PlanOption[];
}) {
  const [state, formAction, pending] = useActionState(joinClubAction, undefined);
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="planId" value={selectedPlan} />

      {plans.length > 0 && (
        <div className="grid gap-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "cursor-pointer transition-colors",
                selectedPlan === plan.id ? "border-brand-500 ring-1 ring-brand-500" : "",
              )}
            >
              <CardHeader className="py-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{plan.name}</span>
                  <span className="text-brand-600 font-semibold">{plan.priceLabel}</span>
                </CardTitle>
              </CardHeader>
              {plan.description && (
                <CardContent className="py-0 pb-3 text-sm text-muted-foreground">
                  {plan.description}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
      {plans.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This club hasn&apos;t published any membership plans yet — you can still join and an admin will follow up.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Anything the club should know? (optional)</Label>
        <Textarea id="notes" name="notes" placeholder="Emergency contact, dietary needs, referral, etc." />
      </div>

      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Joining..." : "Join club"}
      </Button>
    </form>
  );
}
