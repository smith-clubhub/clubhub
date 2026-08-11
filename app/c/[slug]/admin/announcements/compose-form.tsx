"use client";

import { useActionState, useState } from "react";
import { sendAnnouncementAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComposeForm({
  clubId,
  slug,
  plans,
  roles,
}: {
  clubId: string;
  slug: string;
  plans: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(sendAnnouncementAction, undefined);
  const [audience, setAudience] = useState("all");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compose announcement</CardTitle>
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
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" required rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="audience">Audience</Label>
              <Select id="audience" name="audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <SelectItem value="all">All members</SelectItem>
                <SelectItem value="plan_specific">Members on a specific plan</SelectItem>
                <SelectItem value="role_specific">Staff with a specific role</SelectItem>
              </Select>
            </div>
            {audience === "plan_specific" && (
              <div className="grid gap-2">
                <Label htmlFor="audiencePlanId">Plan</Label>
                <Select id="audiencePlanId" name="audiencePlanId" defaultValue={plans[0]?.id}>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
            {audience === "role_specific" && (
              <div className="grid gap-2">
                <Label htmlFor="audienceRoleId">Role</Label>
                <Select id="audienceRoleId" name="audienceRoleId" defaultValue={roles[0]?.id}>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Channels</Label>
            <div className="flex gap-4 text-sm">
              {(["in_app", "email", "sms", "push"] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-1.5">
                  <input type="checkbox" name="channels" value={ch} defaultChecked={ch === "in_app"} />
                  {ch === "in_app" ? "In-app" : ch.toUpperCase()}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Only in-app is wired up end-to-end for now; other channels are recorded as queued until an
              Email/SMS/Push provider is connected.
            </p>
          </div>
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          {state?.ok && <p className="text-sm text-green-600">Sent to {state.recipientCount} recipient(s).</p>}
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Sending..." : "Send now"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
