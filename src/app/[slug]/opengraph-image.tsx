import { ImageResponse } from "next/og";
import { getCardBySlug } from "@/lib/store";
import { formatDate } from "@/lib/card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  const p = card?.design.palette;
  const c = card?.content;
  const first = c ? [...c.events].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date))[0] : undefined;
  const bg = p?.background ?? "#faf7f2";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: bg, color: p?.text ?? "#222", fontFamily: "serif", position: "relative" }}>
        <div style={{ position: "absolute", inset: 28, border: `3px solid ${p?.accent ?? "#b8892d"}`, borderRadius: 24, display: "flex" }} />
        <div style={{ fontSize: 30, letterSpacing: 8, textTransform: "uppercase", color: p?.accent ?? "#b8892d", display: "flex" }}>You&apos;re invited</div>
        <div style={{ fontSize: 108, color: p?.primary ?? "#8c2f39", marginTop: 24, display: "flex" }}>{c ? `${c.partner1} & ${c.partner2}` : "Our Wedding"}</div>
        {first && <div style={{ fontSize: 40, marginTop: 24, display: "flex" }}>{formatDate(first.date, "en")}</div>}
        {c?.venues[0]?.name && <div style={{ fontSize: 32, marginTop: 12, opacity: 0.75, display: "flex" }}>{c.venues[0].name}</div>}
      </div>
    ),
    size,
  );
}
