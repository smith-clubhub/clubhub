/**
 * Loading screen: the full ClubHub logo (PNG/Artboard 1.png, served as
 * /brand/mark.png) with a gentle pulse. Plain <img> so it shows immediately,
 * before any client JS has loaded.
 */
export function BrandSplash({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading ClubHub"
      className={
        fullScreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-background"
          : "flex min-h-[70dvh] w-full items-center justify-center"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png"
        alt="ClubHub"
        width={360}
        height={360}
        className="size-[min(360px,90vw)] animate-[splash-pulse_1.6s_ease-in-out_infinite] select-none"
        draggable={false}
      />
    </div>
  );
}
