import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { LANGUAGES } from "@/lib/languages";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="container">
        <section className="hero-landing">
          <h1>
            One invitation.
            <br />
            Every language your family speaks.
          </h1>
          <p className="lead">
            Design a stunning digital wedding card in minutes, show it in English and your family&apos;s mother tongue, and share it with a link or a QR code on your printed cards.
          </p>
          <div className="lang-ribbon" aria-label="Supported languages">
            {Object.values(LANGUAGES).map((l) => (
              <span key={l.code} lang={l.code}>
                {l.native}
              </span>
            ))}
          </div>
          <div className="paths">
            <Link href="/templates" className="panel path-card">
              <div className="path-icon" aria-hidden>
                🎨
              </div>
              <h2>Start from a template</h2>
              <p className="muted">Browse curated designs by tradition and colour, then fill in your details and style every element yourself.</p>
              <ul>
                <li>Traditional Indian, Minimalist, Floral, Modern, Royal</li>
                <li>Desktop and mobile previews</li>
                <li>Fonts, colours, textures and borders</li>
              </ul>
              <span className="btn btn-primary btn-lg">Browse templates</span>
            </Link>
            <Link href="/create/ai" className="panel path-card">
              <div className="path-icon" aria-hidden>
                ✨
              </div>
              <h2>Create with AI</h2>
              <p className="muted">Tell us your story, theme and customs in your own words. We&apos;ll design the page and write the invitation for you.</p>
              <ul>
                <li>Personal, culturally aware wording</li>
                <li>Formal, heartfelt or playful tone</li>
                <li>Quick regenerate for new variations</li>
              </ul>
              <span className="btn btn-primary btn-lg">Start with AI</span>
            </Link>
          </div>
        </section>
        <section className="features">
          {[
            ["Bilingual or toggle", "Show English beside Hindi, Tamil, Arabic and more, or let guests switch with one tap."],
            ["Fonts that match", "Each script gets a typeface that matches your design's weight and style."],
            ["RSVP without accounts", "Guests reply in seconds. No sign-ups, passwords or apps."],
            ["Maps and calendar", "One-tap directions, embedded maps and Add to Calendar for every event."],
            ["Print-ready QR codes", "PNG, SVG and PDF in 2×2″, 3×3″ and A6 sizes for your paper cards."],
            ["Edit any time", "Fix a time after printing. The link and QR code never change."],
          ].map(([t, d]) => (
            <div key={t} className="panel feature">
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
