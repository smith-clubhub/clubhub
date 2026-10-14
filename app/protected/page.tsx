import { redirect } from "next/navigation";

// The old "My ClubHub" dashboard now lives on the profile's "My clubs" tab.
export default function MyClubHubPage() {
  redirect("/profile?tab=clubs");
}
