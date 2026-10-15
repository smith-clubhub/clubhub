import { ImageResponse } from "next/og";

const WAVES = [15, 46, 77]
  .map((y) => `M -14 ${y + 25} L 41 ${y + 2.5} Q 50 ${y - 1.5} 59 ${y + 2.5} L 114 ${y + 25}`)
  .join(" ");

// The wave-globe mark (see components/ig/brand.tsx) as a white SVG data URI.
const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m"><rect width="100" height="100" fill="white"/><path d="${WAVES}" fill="none" stroke="black" stroke-width="15.5" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><circle cx="50" cy="50" r="50" fill="#fff" mask="url(#m)"/></svg>`,
).toString("base64")}`;

/**
 * App icon: white wave-globe on the brand-orange gradient, full bleed (the OS
 * applies its own corner mask). `markScale` is the mark's share of the canvas --
 * maskable icons need it inside the central 80% safe zone.
 */
export function brandIcon(size: number, markScale = 0.62) {
  const mark = Math.round(size * markScale);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ffb061 0%, #ff7f32 50%, #f2541b 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={mark} height={mark} alt="" src={MARK_SRC} />
      </div>
    ),
    { width: size, height: size },
  );
}

/**
 * Launch screen: the full ClubHub logo (PNG/Artboard 1.png = public/brand/mark.png)
 * centred on the app background, matching the in-app loading screen.
 */
export async function launchImage(width: number, height: number) {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const png = await readFile(join(process.cwd(), "public", "brand", "mark.png"));
  const logo = Math.round(Math.min(width, height) * 0.9); // the PNG has generous built-in padding
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#fffcf9" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={logo} height={logo} alt="" src={`data:image/png;base64,${png.toString("base64")}`} />
      </div>
    ),
    { width, height },
  );
}
