import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ClubHub",
    short_name: "ClubHub",
    description: "Follow South Africa's clubs, see what's on tonight, and find the clubs nearest to you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffcf9",
    theme_color: "#ff7f32",
    categories: ["social", "entertainment", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Clubs near me", short_name: "Map", url: "/map", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/direct", icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
