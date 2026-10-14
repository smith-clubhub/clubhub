import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) redirect("/profile?tab=clubs");
  redirect(`/c/${encodeURIComponent(slug)}`);
}
