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
| `BLOB_READ_WRITE_TOKEN` | Store cards, RSVPs and photos in Vercel Blob. Vercel sets this when you connect a Blob store. Without it, everything is saved as files under `DATA_DIR` |
| `DATA_DIR` | Folder for the file-based fallback. Defaults to `./data` |

Other scripts: `npm run build`, `npm start`, `npm test` (Vitest unit tests) and `npm run typecheck`.

## Deploying to Vercel

The only extra service is **Vercel Blob**, which is built into Vercel. It's needed because Vercel functions can't keep files on disk.

1. Import the repository at [vercel.com/new](https://vercel.com/new). The defaults (Next.js preset, `npm run build`) work as they are.
2. In the project's **Storage** tab, create a **Blob** store and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN` automatically.
3. Under **Settings → Environment Variables**, optionally add `ANTHROPIC_API_KEY` for AI writing and translation, and set `NEXT_PUBLIC_BASE_URL` to your production URL.
4. Redeploy so the new variables take effect, then open `/api/status`. It should report `"data":"blob"`.

If Blob isn't connected, creating a card shows a message telling you to add it, rather than losing data silently.

On any other Node host with a persistent disk, `npm run build && npm start` works with no services at all.

## How it works

- **Stack:** Next.js 15 (App Router) with React 19 and TypeScript. `src/lib/store.ts` stores everything in Vercel Blob when it's configured, and as JSON files with atomic writes otherwise. On Blob, cards and RSVPs live under HMAC-derived paths that can't be guessed; a slug is claimed with a create-only write, so two cards can never get the same link; and each RSVP is its own blob, so simultaneous replies never overwrite each other. Guest pages may read a copy up to a minute old, which keeps page views fast and cheap. The editor always reads fresh data.
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
