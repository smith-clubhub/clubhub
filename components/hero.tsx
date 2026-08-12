import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="relative flex flex-col gap-4 items-center text-center px-4 py-2 overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 rounded-full bg-fuchsia-500 opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -top-10 -right-10 w-56 h-56 rounded-full bg-orange-400 opacity-30 blur-3xl" />

      <Image src="/brand/mark.png" alt="" width={56} height={56} priority className="relative z-10" />
      <h1 className="relative z-10 text-3xl sm:text-4xl font-extrabold !leading-tight mx-auto max-w-xl">
        Find the{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-400">
          club scene
        </span>{" "}
        near you.
      </h1>
      <p className="relative z-10 text-sm sm:text-base text-muted-foreground max-w-md">
        Trending events, ranked by the crowd, nearest to you first. Log in to vote, save your spot and get tickets.
      </p>
      <div className="relative z-10 flex gap-3 w-full max-w-xs">
        <Button
          asChild
          size="lg"
          className="flex-1 bg-gradient-to-r from-fuchsia-600 to-orange-500 hover:opacity-90 border-0 text-white shadow-lg shadow-fuchsia-500/30"
        >
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="flex-1">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
