import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "[ dead.works ]",
  description: "a list of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives",

  metadataBase: new URL("https://dead.works"),

  openGraph: {
    type: "website",
    url: "https://dead.works",
    title: "dead.works",
    description: "a list of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives",
    images: [
      {
        url: "/imgs/meta-tags.png",
        width: 1200,
        height: 630,
        alt: "dead.works",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "dead.works",
    description: "a collection of 𝕲𝖍𝖔𝖚𝖑𝖘 projects and derivatives",
    images: ["/imgs/meta-tags.png"],
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
