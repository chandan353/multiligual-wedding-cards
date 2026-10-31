"use client";

import { useEffect, useState } from "react";
import CardView, { defaultView, type ViewLang } from "@/components/CardView";
import type { PublicCard } from "@/lib/types";

/** Guest page wrapper: remembers each guest's language choice on their device. */
export default function LiveCard({ card, liveUrl }: { card: PublicCard; liveUrl: string }) {
  const key = `wc.lang.${card.slug}`;
  const [view, setView] = useState<ViewLang>(defaultView(card));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key) as ViewLang | null;
      if (saved && (saved === "both" || saved === card.language.primary || saved === card.language.secondary)) setView(saved);
    } catch {}
  }, [key, card.language.primary, card.language.secondary]);
  useEffect(() => {
    document.documentElement.lang = view === "both" ? card.language.primary : view;
  }, [view, card.language.primary]);
  return (
    <CardView
      card={card}
      liveUrl={liveUrl}
      live
      view={view}
      onViewChange={(v) => {
        setView(v);
        try {
          localStorage.setItem(key, v);
        } catch {}
      }}
    />
  );
}
