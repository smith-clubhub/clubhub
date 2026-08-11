import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/club-context";
import { ClubTabs } from "@/components/club-tabs";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getClubContext(slug);

  if (ctx.staffRoles.length === 0) redirect(`/c/${slug}`);

  return (
    <div className="flex flex-col gap-6">
      <ClubTabs
        tabs={[
          { key: "dashboard", label: "Dashboard", href: `/c/${slug}/admin` },
          { key: "members", label: "Members", href: `/c/${slug}/admin/members` },
          { key: "plans", label: "Plans", href: `/c/${slug}/admin/plans` },
          { key: "events", label: "Events", href: `/c/${slug}/admin/events` },
          { key: "announcements", label: "Announcements", href: `/c/${slug}/admin/announcements` },
          { key: "settings", label: "Settings", href: `/c/${slug}/admin/settings` },
        ]}
      />
      {children}
    </div>
  );
}
