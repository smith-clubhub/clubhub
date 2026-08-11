"use client";

import { useActionState } from "react";
import { assignRoleAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select-native";

export function RoleAssignmentForm({
  clubId,
  slug,
  roles,
}: {
  clubId: string;
  slug: string;
  roles: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(assignRoleAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap gap-2 items-end">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug" value={slug} />
      <Input name="email" type="email" placeholder="staff@email.com" required className="w-56" />
      <Select name="roleId" defaultValue={roles.find((r) => r.name !== "Owner")?.id}>
        {roles.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </Select>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Assign role"}
      </Button>
      {state?.error && <p className="text-sm text-red-500 w-full">{state.error}</p>}
    </form>
  );
}
