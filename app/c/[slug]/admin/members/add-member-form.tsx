"use client";

import { useActionState } from "react";
import { addMemberByEmailAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Card, CardContent } from "@/components/ui/card";

export function AddMemberForm({
  clubId,
  slug,
  plans,
}: {
  clubId: string;
  slug: string;
  plans: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addMemberByEmailAction, undefined);

  return (
    <Card>
      <CardContent className="pt-4">
        <form action={formAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="slug" value={slug} />
          <Input name="email" type="email" placeholder="member@email.com" required className="w-56" />
          <Select name="planId" defaultValue="">
            <SelectItem value="">No plan</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </Select>
          <Select name="status" defaultValue="active">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </Select>
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add existing user as member"}
          </Button>
          {state?.error && <p className="text-sm text-red-500 w-full">{state.error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
