import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ThemeSwitcher } from "@/components/theme-switcher";
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
    .select("id, name, slug, status, primary_color")
    .eq("slug", slug)
    .maybeSingle();

  if (!club) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center">
        <SiteHeader homeHref="/protected">
          <span className="text-foreground/40">/</span>
          <Link href={`/c/${club.slug}`} className="font-semibold flex items-center gap-2">
            {club.name}
            {club.status !== "active" && <Badge variant="outline">{club.status}</Badge>}
          </Link>
        </SiteHeader>
        <div className="flex-1 flex flex-col gap-6 w-full max-w-5xl p-5">{children}</div>
        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
          <p>ClubHub</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
