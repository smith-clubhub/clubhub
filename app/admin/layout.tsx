import { requirePlatformAdmin } from "@/lib/rbac";
import { SiteHeader } from "@/components/site-header";
import { ClubTabs } from "@/components/club-tabs";
import { ThemeSwitcher } from "@/components/theme-switcher";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformAdmin();

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-6 items-center">
        <SiteHeader homeHref="/admin" />
        <div className="flex-1 flex flex-col gap-6 w-full max-w-5xl p-5">
          <div>
            <h1 className="text-lg font-semibold">Platform admin</h1>
            <p className="text-sm text-muted-foreground">
              Manage every club on ClubHub and the package tier they&apos;re on.
            </p>
          </div>
          <ClubTabs
            tabs={[
              { key: "clubs", label: "Clubs", href: "/admin/clubs" },
              { key: "packages", label: "Packages", href: "/admin/packages" },
            ]}
          />
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-8">
          <p>ClubHub platform admin</p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
