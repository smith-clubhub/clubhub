import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon: the wave-globe mark in white on the brand orange.
export default function AppleIcon() {
  const waves = [15, 46, 77]
    .map((y) => `M -14 ${y + 25} L 41 ${y + 2.5} Q 50 ${y - 1.5} 59 ${y + 2.5} L 114 ${y + 25}`)
    .join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m"><rect width="100" height="100" fill="white"/><path d="${waves}" fill="none" stroke="black" stroke-width="15.5" stroke-linecap="round" stroke-linejoin="round"/></mask></defs><circle cx="50" cy="50" r="50" fill="#fff" mask="url(#m)"/></svg>`;

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
        <img width={112} height={112} alt="" src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} />
      </div>
    ),
    size,
  );
}
