import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navigation from "@/components/Navigation";
import Motion from "@/components/Motion";
import { siteUrl, indexable } from "@/lib/site";
import { profile, research } from "@/data/profile";
import "./globals.css";
import "@/styles/refinements.css";
import "@/styles/playground.css";
import "@/styles/motion.css";
const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Shubhang Srinivas Varda — Full-Stack & AI Engineer",
    template: "%s — Shubhang Srinivas Varda",
  },
  description:
    "Full-stack products, applied AI, and thoughtful digital experiences. Selected engineering work by Shubhang Srinivas Varda, Bengaluru.",
  robots: { index: indexable, follow: indexable },
  openGraph: { type: "website", siteName: profile.name, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: profile.name,
      url: siteUrl,
      jobTitle: profile.role,
      sameAs: [profile.github, profile.linkedin],
    },
    {
      "@type": "ScholarlyArticle",
      name: research.title,
      url: research.url,
      datePublished: "2026-03-09",
      identifier: research.doi,
      author: research.authors.map((name) => ({ "@type": "Person", name })),
      isPartOf: { "@type": "Periodical", name: research.journal },
    },
  ],
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
          }}
        />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation />
        {children}
        <Motion />
      </body>
    </html>
  );
}
