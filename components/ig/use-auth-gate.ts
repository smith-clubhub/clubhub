"use client";

import { usePathname, useRouter } from "next/navigation";

/** Returns a function that sends logged-out viewers to login and back here afterwards. */
export function useAuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
}
