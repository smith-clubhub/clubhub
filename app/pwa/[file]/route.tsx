import { notFound } from "next/navigation";
import { brandIcon, launchImage } from "@/lib/brand-icon";
import { LAUNCH_SCREENS } from "@/lib/launch-screens";

// PNG icons referenced by app/manifest.ts. Maskable variants keep the mark
// inside the 80% safe zone so Android's adaptive-icon crop never clips it.
const ICONS: Record<string, { size: number; markScale?: number }> = {
  "icon-192.png": { size: 192 },
  "icon-512.png": { size: 512 },
  "maskable-192.png": { size: 192, markScale: 0.5 },
  "maskable-512.png": { size: 512, markScale: 0.5 },
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return [...Object.keys(ICONS), ...LAUNCH_SCREENS.map((s) => s.file)].map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const icon = ICONS[file];
  if (icon) return brandIcon(icon.size, icon.markScale);
  const launch = LAUNCH_SCREENS.find((s) => s.file === file);
  if (launch) return launchImage(launch.width, launch.height);
  notFound();
}
