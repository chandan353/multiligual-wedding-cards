# AI Multilingual Wedding Cards

A web platform where couples design, personalise and publish a standalone digital wedding invitation in English plus a regional or international language, then share it as a link or a print-ready QR code.

It has two parts:

- **Creation platform** for the couple or planner: template flow, AI-assisted flow, a tap-to-edit visual editor, language settings and publishing.
- **Live guest page** at `/{your-names}`: mobile-first, bilingual or one-tap language switching, event itinerary, maps, Add to Calendar and RSVP, with no sign-up for guests.

## Features

| Area | What's included |
| --- | --- |
| Template flow | 12 templates across Traditional Indian, Minimalist Western, Floral Romance, Modern Chic and Royal Vintage, filterable by colour, with side-by-side desktop and mobile previews and **Use This Template** |
| AI-assisted flow | Structured form + **Open Notes** box. Claude picks the template, palette, fonts and motifs, and writes the headline, greeting, story, blessings, event descriptions and guest guidelines. **Quick Regenerate** by tone (Formal, Heartfelt, Playful) or for a new colour scheme |
| Multilingual engine | 13 languages: English, Hindi, Marathi, Tamil, Telugu, Gujarati, Bengali, Punjabi, Spanish, French, Arabic (RTL), Mandarin and Japanese. Side-by-side bilingual view or a floating language toggle. Each script gets a matched Noto/Amiri font with optical size and line-height correction. AI translation is tuned for honorifics, ceremony names and family terms, and every phrase can be overridden by hand |
| Smart form | Couple and families (parents, grandparents, hometowns), multi-day events (date, start/end, dress code, description), venues (address, landmark, Maps link), RSVP settings, guest notes |
| Visual editor | Tap any text on the card to edit it in place (in either language), one-click image swap with focal-point crop, zoom and aspect guides, a royalty-free background gallery, font pairings, accent swatches, warmth / text size / spacing sliders, textures, borders, motifs, layouts, advanced hex codes, undo/redo with keyboard shortcuts, and visible autosave |
| Guest page | Vertical storytelling layout, sticky bottom bar (Directions, RSVP, Add to Calendar), tap-to-load interactive maps, per-event `.ics` and Google Calendar links, RSVP with attendance, guest count, meal and per-event selection, and Open Graph preview images |
| Share kit | Copyable live URL with OG preview, QR studio (plain / classic / ornate frames, call-to-action text, colour) exporting PNG at 300 DPI, PDF and vector SVG in 2×2 in, 3×3 in and A6, pre-written WhatsApp / SMS / email messages in either language, an RSVP dashboard with CSV export, and a private edit link for other devices |

The published link is permanent so printed QR codes keep working, while the card itself stays editable after publishing.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for AI writing and translation
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Claude for design and copy generation and for translation. Without it the app runs a built-in offline style engine (keyword-based theming and tone-based copy), and AI translation is disabled; interface labels are still translated in all 13 languages |
| `NEXT_PUBLIC_BASE_URL` | Public origin used for live links, QR codes and Open Graph cards (for example `https://weddingcards.app`) |
| `DATA_DIR` | Where cards, RSVPs and uploaded photos are stored. Defaults to `./data` |

Other scripts: `npm run build`, `npm start`, `npm test` (Vitest unit tests) and `npm run typecheck`.

## How it works

- **Stack:** Next.js 15 (App Router) with React 19 and TypeScript. No database is needed to start: `src/lib/store.ts` keeps each card as a JSON file with atomic writes and per-card locking. Replace that one module with a database adapter before running more than one server instance.
- **AI:** `src/lib/ai.ts` calls `claude-opus-5-5` through the Anthropic SDK with JSON-schema structured outputs and server-side refusal fallback. If a call fails, generation falls back to `src/lib/offline-ai.ts`, so the flow never dead-ends.
- **Ownership without accounts:** creating a card returns a secret edit token stored in the couple's browser. Every write API checks it, and the share kit offers a private edit link for using another device. Guests never need an account.
- **Translations** are stored per language as flat keys (`events.e1.title`, `venues.v1.address`, …) with a separate overrides map, so manual fixes survive re-translation, and regenerating copy clears only the stale AI translations.
- **Calendar times** are entered as local wall-clock time in the card's time zone and converted to UTC for `.ics` files and Google Calendar links.

## Project layout

```
src/app/                 pages and API routes
  page.tsx               landing: choose Template or AI
  templates/             template gallery and preview
  create/ai/             AI-assisted flow
  editor/[id]/           visual editor
  share/[id]/            share kit, QR studio, RSVP dashboard
  [slug]/                live guest page and Open Graph image
  api/                   cards, generate, translate, publish, rsvp, ics, upload
src/components/          CardView (guest page renderer), forms, ornaments, image tools
src/lib/                 types, templates, design, languages, AI, storage, calendar, QR
tests/                   unit tests
```
