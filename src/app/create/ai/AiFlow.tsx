"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DetailsForm from "@/components/DetailsForm";
import { emptyContent, uid } from "@/lib/card";
import { api, browserTimezone, rememberCard } from "@/lib/client";
import { LANGUAGES, LANGUAGE_CODES } from "@/lib/languages";
import type { Card, CardContent, LangCode, Tone } from "@/lib/types";

const EXAMPLES = [
  "We met on a rainy morning at a coffee shop in Seattle and bonded over classic jazz.",
  "Rustic bohemian barn wedding with sunflowers and sunset gold tones.",
  "A South Indian Telugu Brahmin ceremony followed by an evening cocktail reception; please include blessings from grandparents.",
  "Strictly cocktail attire; adults-only reception; in lieu of gifts, please consider donating to our favourite animal shelter.",
];

const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: "formal", label: "Formal", hint: "Traditional & dignified" },
  { id: "heartfelt", label: "Heartfelt", hint: "Warm & personal" },
  { id: "playful", label: "Playful", hint: "Fun & lighthearted" },
];

const DRAFT_KEY = "wc.aiDraft.v1";

function starter(): CardContent {
  const c = emptyContent();
  const v = uid("v");
  c.venues = [{ id: v, name: "", address: "", landmark: "", mapsUrl: "" }];
  c.events = [{ id: uid("e"), title: "Wedding Ceremony", date: "", start: "", end: "", dressCode: "", description: "", venueId: v }];
  return c;
}

export default function AiFlow() {
  const router = useRouter();
  const [content, setContent] = useState<CardContent>(starter);
  const [tone, setTone] = useState<Tone>("heartfelt");
  const [secondary, setSecondary] = useState<LangCode | "">("");
  const [phase, setPhase] = useState<"form" | "working">("form");
  const [step, setStep] = useState("");
  const [err, setErr] = useState("");
  const [aiOn, setAiOn] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ ai: boolean }>("/api/status").then((s) => setAiOn(s.ai)).catch(() => setAiOn(false));
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved?.content) {
        setContent(saved.content);
        setTone(saved.tone ?? "heartfelt");
        setSecondary(saved.secondary ?? "");
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, tone, secondary }));
    } catch {}
  }, [content, tone, secondary]);

  const addExample = (s: string) => setContent((c) => ({ ...c, notes: c.notes ? `${c.notes.trim()}\n${s}` : s }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!content.partner1.trim() || !content.partner2.trim()) return setErr("Please add both partners' names.");
    setPhase("working");
    try {
      setStep("Saving your details…");
      const { card } = await api<{ card: Card }>("/api/cards", { body: { flow: "ai", templateId: "white-linen", content, timezone: browserTimezone(), secondary: secondary || null } });
      rememberCard(card);
      setStep("Designing your page and writing your invitation…");
      const gen = await api<{ card: Card }>(`/api/cards/${card.id}/generate`, { token: card.editToken, body: { tone, variant: 0 } });
      if (secondary && aiOn) {
        setStep(`Translating into ${LANGUAGES[secondary].name}…`);
        await api(`/api/cards/${card.id}/translate`, { token: card.editToken, body: { lang: secondary } }).catch(() => undefined);
      }
      rememberCard(gen.card);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      router.push(`/editor/${card.id}?generated=1`);
    } catch (e2) {
      setErr((e2 as Error).message);
      setPhase("form");
    }
  }

  if (phase === "working")
    return (
      <div className="panel generating" role="status" aria-live="polite">
        <div className="spinner" />
        <strong style={{ fontSize: 18 }}>{step}</strong>
        <p className="muted small">This usually takes under a minute.</p>
      </div>
    );

  return (
    <form className="ai-layout" onSubmit={submit}>
      {aiOn === false && (
        <div className="notice">
          AI service isn&apos;t configured on this server, so the built-in offline style engine will draft your card from the same details. Add <code>ANTHROPIC_API_KEY</code> to enable full AI writing and translation.
        </div>
      )}
      <section className="panel form-section">
        <h2>1. The basics</h2>
        <DetailsForm content={content} onChange={setContent} sections={["couple", "venues", "events", "rsvp"]} />
      </section>

      <section className="panel form-section notes-box">
        <h2>2. Open notes &amp; special instructions</h2>
        <p className="muted small" style={{ margin: 0 }}>
          This is the heart of your invitation. Share how you met, your theme and colours, cultural or religious customs, and anything guests should know. Write freely, in any language.
        </p>
        <label className="field">
          <span className="sr-only">Open notes</span>
          <textarea value={content.notes} onChange={(e) => setContent({ ...content, notes: e.target.value })} placeholder="We met at a friend's rooftop party in Pune… We'd love marigolds and deep reds… Please include blessings from our grandparents…" maxLength={5000} />
          <small>{content.notes.length} / 5000</small>
        </label>
        <div className="example-chips">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="chip" onClick={() => addExample(ex)} title={ex}>
              + {ex.length > 46 ? ex.slice(0, 44) + "…" : ex}
            </button>
          ))}
        </div>
      </section>

      <section className="panel form-section">
        <h2>3. Tone &amp; language</h2>
        <div className="tone-picker" role="radiogroup" aria-label="Tone">
          {TONES.map((t) => (
            <button type="button" key={t.id} role="radio" aria-checked={tone === t.id} className={tone === t.id ? "on" : ""} onClick={() => setTone(t.id)}>
              {t.label}
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
        <label className="field">
          <span>Second language (optional)</span>
          <select value={secondary} onChange={(e) => setSecondary(e.target.value as LangCode | "")}>
            <option value="">English only</option>
            {LANGUAGE_CODES.filter((l) => l !== "en").map((l) => (
              <option key={l} value={l}>
                {LANGUAGES[l].name} · {LANGUAGES[l].native}
              </option>
            ))}
          </select>
          <small>Guests can read the invitation side by side or switch languages with one tap.</small>
        </label>
      </section>

      {err && <div className="notice err">{err}</div>}
      <button type="submit" className="btn btn-primary btn-lg">
        ✨ Generate my invitation
      </button>
    </form>
  );
}
