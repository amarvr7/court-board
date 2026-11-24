import type { Metadata } from "next";
import { DM_Sans, Barlow_Condensed } from "next/font/google";
import { EVENT_INFO } from "@/lib/event-config";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${EVENT_INFO.shortName} Live Court Board | ${EVENT_INFO.name}`,
  description:
    "Live tennis court assignments across Stadium, Hard Courts, East Clay, Legacy, and Indoors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900">
        {children}
      </body>
    </html>
  );
}
