import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ig/pwa";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  applicationName: "ClubHub",
  appleWebApp: {
    capable: true,
    title: "ClubHub",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  title: "ClubHub",
  description:
    "Follow South Africa's clubs, see what's on tonight, and find the clubs nearest to you.",
};

// Geometric sans that matches the ClubHub wordmark.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the installed app draw under the notch; layouts pad with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffcf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d0b" },
  ],
};

const outfit = Outfit({
  variable: "--font-outfit",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} ${outfit.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ServiceWorkerRegistration />
        </ThemeProvider>
      </body>
    </html>
  );
}
