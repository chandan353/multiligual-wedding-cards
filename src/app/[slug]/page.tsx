import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCardBySlug } from "@/lib/store";
import { toPublic, formatDate } from "@/lib/card";
import { fontsForDesign } from "@/lib/design";
import { googleFontsHref } from "@/lib/languages";
import LiveCard from "./LiveCard";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

async function load(slug: string) {
  const card = await getCardBySlug(slug);
  return card && card.status === "published" ? card : null;
}

async function origin() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const card = await load(slug);
  if (!card) return { title: "Invitation not found" };
  const c = card.content;
  const first = [...c.events].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const title = `${c.partner1} & ${c.partner2} are getting married`;
  const description = [first?.date && formatDate(first.date, "en"), c.venues[0]?.name, c.greeting].filter(Boolean).join(" · ").slice(0, 200);
  const url = `${await origin()}/${slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: false, follow: false },
    openGraph: { title, description, url, type: "website", siteName: "Wedding Cards", images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LivePage({ params }: Props) {
  const { slug } = await params;
  const card = await load(slug);
  if (!card) notFound();
  const pub = toPublic(card);
  const href = googleFontsHref(fontsForDesign(card.design, [card.language.secondary]));
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={href} />
      {card.media.hero && <link rel="preload" as="image" href={card.media.hero.url} />}
      <LiveCard card={pub} liveUrl={`${await origin()}/${slug}`} />
    </>
  );
}
