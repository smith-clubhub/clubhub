import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppShell, PageHeader } from "@/components/ig/app-shell";
import { Badge } from "@/components/ui/badge";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) notFound();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[935px]">
        <PageHeader
          title={
            <Link href={`/c/${club.slug}`} className="flex items-center gap-1">
              <ChevronLeft className="size-5 md:hidden" />
              @{club.slug}
              {club.status !== "active" && (
                <Badge variant="outline" className="ml-2">
                  {club.status}
                </Badge>
              )}
            </Link>
          }
        />
        <div className="flex flex-col gap-6 px-4 py-4">{children}</div>
      </div>
    </AppShell>
  );
}
