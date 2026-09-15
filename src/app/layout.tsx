import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

import { db } from "@/lib/db";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";

async function getInitialSettings() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: ["site_name", "support_email", "default_currency"],
        },
      },
    });

    const result: Record<string, string> = {
      site_name: "CouponPilot",
      support_email: "support@couponpilot.com",
      default_currency: "USD",
    };

    settings.forEach((s) => {
      try {
        result[s.key] = JSON.parse(s.valueJson);
      } catch {
        result[s.key] = s.valueJson;
      }
    });

    return result;
  } catch {
    return {
      site_name: "CouponPilot",
      support_email: "support@couponpilot.com",
      default_currency: "USD",
    };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getInitialSettings();
  const siteName = settings.site_name || "CouponPilot";

  return {
    title: `${siteName} — Working coupon codes and cashback`,
    description: `Find verified coupon codes, deals, and cashback offers on ${siteName}. Codes tested by real shoppers.`,
    keywords: ["coupon codes", "promo codes", "cashback", "deals", "discounts"],
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-icon.png",
    },
  };
}

import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/next";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSettings = await getInitialSettings();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col font-body bg-paper text-ink antialiased">
        <SiteSettingsProvider initialSettings={initialSettings}>
          <LanguageProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
            </ToastProvider>
          </LanguageProvider>
        </SiteSettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}

