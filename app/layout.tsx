import type { Metadata, Viewport } from "next";
import { EB_Garamond, Pinyon_Script } from "next/font/google";
import { siteName } from "@/content/event";
import { TableLight } from "@/components/TableLight";
import "./globals.css";

// Both faces carry full Czech diacritics (latin-ext). Self-hosted by Next at build time.
const garamond = EB_Garamond({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
});

const script = Pinyon_Script({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: siteName,
  description: "Pozvánka na naši svatbu.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#efe6e1",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${garamond.variable} ${script.variable}`}>
      <body>
        <TableLight />
        {children}
      </body>
    </html>
  );
}
