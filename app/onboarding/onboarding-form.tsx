"use client";

import { useActionState } from "react";
import { createClubAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createClubAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Start a club</CardTitle>
        <CardDescription>
          You&apos;ll be the Owner and can invite staff, configure membership
          plans and branding once it&apos;s created.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Club name</Label>
            <Input id="name" name="name" required placeholder="Riverside Golf Club" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="What is this club about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" defaultValue="other">
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select id="currency" name="currency" defaultValue="ZAR">
                <SelectItem value="ZAR">ZAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </Select>
            </div>
          </div>
          <input type="hidden" name="timezone" value="Africa/Johannesburg" />
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create club"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
