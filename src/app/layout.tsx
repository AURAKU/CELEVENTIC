import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE, BRAND, BRAND_MOTTO } from "@/lib/constants";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: `${BRAND_MOTTO} — ${APP_TAGLINE}`,
  keywords: ["events", "tickets", "invitations", "QR", "Ghana", "event management"],
  icons: {
    icon: [
      { url: "/brand/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/brand/apple-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.primary,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
