import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex flex-col gap-8 items-center text-center">
      <Image src="/brand/mark.png" alt="" width={72} height={72} priority />
      <h1 className="text-4xl lg:text-5xl font-bold !leading-tight mx-auto max-w-2xl">
        One dashboard to run your club. One app for your members.
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl">
        ClubHub replaces the spreadsheet, the WhatsApp group and the manual EFT
        tracking with member management, events, communication and payments —
        for clubs, gyms, alumni bodies and societies.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/onboarding">Start a club</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
      <div className="w-full p-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent mt-8" />
    </div>
  );
}
