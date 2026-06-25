import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE, BRAND, BRAND_MOTTO } from "@/lib/constants";
import { DEFAULT_PRODUCTION_URL } from "@/lib/app-url";
import { getServerI18nState } from "@/lib/i18n/server-locale";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(DEFAULT_PRODUCTION_URL),
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: `${BRAND_MOTTO}. ${APP_TAGLINE}`,
  keywords: ["events", "tickets", "invitations", "QR", "event management", "global event platform"],
  icons: {
    icon: [
      { url: "/brand/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-icon.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/brand/favicon.png",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getServerI18nState();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans`}>
        <Providers initialLocale={locale} initialMessages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
