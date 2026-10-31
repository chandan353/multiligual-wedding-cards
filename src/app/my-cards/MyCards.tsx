"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { forgetCard, savedCards, type SavedCardRef } from "@/lib/client";

export default function MyCards() {
  const [cards, setCards] = useState<SavedCardRef[] | null>(null);
  useEffect(() => setCards(savedCards()), []);
  if (!cards) return null;
  if (!cards.length)
    return (
      <div className="panel empty">
        <p>You haven&apos;t created a card in this browser yet.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/templates">
            Browse templates
          </Link>
          <Link className="btn" href="/create/ai">
            Create with AI
          </Link>
        </div>
      </div>
    );
  return (
    <div className="stack" style={{ paddingBottom: 48 }}>
      {cards.map((c) => (
        <div key={c.id} className="panel row" style={{ padding: 16 }}>
          <div>
            <strong>{c.title}</strong>
            <div className="tiny muted">{c.slug ? `Live at /${c.slug}` : "Draft"} · updated {new Date(c.updatedAt).toLocaleString()}</div>
          </div>
          <span className="spacer" />
          <Link className="btn btn-sm" href={`/editor/${c.id}`}>
            Edit
          </Link>
          {c.slug && (
            <Link className="btn btn-sm btn-primary" href={`/share/${c.id}`}>
              Share kit
            </Link>
          )}
          <button
            className="icon-btn"
            aria-label="Remove from this list"
            title="Remove from this list (the card itself is not deleted)"
            onClick={() => {
              forgetCard(c.id);
              setCards(savedCards());
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
