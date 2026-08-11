import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  size = 32,
}: {
  className?: string;
  href?: string | null;
  size?: number;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <Image
        src="/brand/mark.png"
        alt="ClubHub"
        width={size}
        height={size}
        className="shrink-0"
        priority
      />
      <span className="text-lg tracking-tight">
        club<span className="text-brand-500">hub</span>
      </span>
    </span>
  );

  if (href === null) return content;
  return <Link href={href}>{content}</Link>;
}
