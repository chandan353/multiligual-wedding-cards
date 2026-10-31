import type { Card, CardMedia, Design, ImageAsset, Tone } from "./types";
import type { GeneratedDraft } from "./ai-types";
import { BORDERS, FONT_PAIRINGS, MOTIFS, normalizePalette, TEXTURES } from "./design";
import { getTemplate } from "./templates";

export function applyDraft(card: Card, draft: GeneratedDraft, tone: Tone, variant: number, opts: { keepDesign?: boolean; newColors?: boolean } = {}): Card {
  const c = card.content;
  const design: Design = opts.keepDesign
    ? { ...card.design, ...(opts.newColors ? { palette: draft.design.palette } : {}) }
    : { ...draft.design, warmth: card.design.warmth, fontScale: card.design.fontScale, spacing: card.design.spacing };
  const byId = new Map(draft.copy.eventDescriptions.map((e) => [e.id, e.description]));
  return {
    ...card,
    templateId: opts.keepDesign ? card.templateId : draft.templateId,
    design,
    content: {
      ...c,
      headline: draft.copy.headline || c.headline,
      greeting: draft.copy.greeting || c.greeting,
      story: draft.copy.story || c.story,
      blessings: draft.copy.blessings || c.blessings,
      closing: draft.copy.closing || c.closing,
      hashtag: draft.copy.hashtag || c.hashtag,
      guidelines: draft.copy.guidelines?.length ? draft.copy.guidelines : c.guidelines,
      events: c.events.map((e) => ({ ...e, description: byId.get(e.id) || e.description })),
      rsvp: { ...c.rsvp, message: draft.copy.rsvpMessage || c.rsvp.message },
    },
    ai: { tone, variant, rationale: draft.rationale, generatedAt: new Date().toISOString(), engine: draft.engine },
    // Copy changed, so earlier AI translations are stale; manual overrides are kept.
    language: { ...card.language, translations: {}, translatedAt: {} },
  };
}

const clamp = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

export function sanitizeDesign(input: unknown, fallback: Design): Design {
  const d = (input ?? {}) as Partial<Design>;
  return {
    palette: normalizePalette(d.palette, fallback.palette),
    fontPairing: d.fontPairing && d.fontPairing in FONT_PAIRINGS ? d.fontPairing : fallback.fontPairing,
    texture: d.texture && d.texture in TEXTURES ? d.texture : fallback.texture,
    border: d.border && d.border in BORDERS ? d.border : fallback.border,
    motif: d.motif && d.motif in MOTIFS ? d.motif : fallback.motif,
    layout: d.layout && ["centered", "split", "framed"].includes(d.layout) ? d.layout : fallback.layout,
    warmth: clamp(d.warmth, -50, 50, 0),
    fontScale: clamp(d.fontScale, 0.85, 1.25, 1),
    spacing: clamp(d.spacing, 0.8, 1.4, 1),
  };
}

const okUrl = (u: unknown): u is string =>
  typeof u === "string" &&
  (/^\/api\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(u) ||
    /^\/backgrounds\/[a-z0-9-]+\.svg$/.test(u) ||
    /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(u));

function sanitizeImage(v: unknown): ImageAsset | null {
  const i = (v ?? {}) as Partial<ImageAsset>;
  if (!okUrl(i.url)) return null;
  return {
    url: i.url,
    focalX: clamp(i.focalX, 0, 100, 50),
    focalY: clamp(i.focalY, 0, 100, 50),
    zoom: clamp(i.zoom, 1, 2.5, 1),
    aspect: i.aspect && ["16:9", "4:5", "1:1", "3:4"].includes(i.aspect) ? i.aspect : "16:9",
  };
}

export function sanitizeMedia(input: unknown): CardMedia {
  const m = (input ?? {}) as Partial<CardMedia>;
  return {
    hero: sanitizeImage(m.hero),
    couple: sanitizeImage(m.couple),
    gallery: Array.isArray(m.gallery) ? m.gallery.slice(0, 24).map(sanitizeImage).filter((x): x is ImageAsset => !!x) : [],
  };
}

export function switchTemplate(card: Card, templateId: string): Card {
  const t = getTemplate(templateId);
  return { ...card, templateId: t.id, design: { ...structuredClone(t.design), warmth: card.design.warmth, fontScale: card.design.fontScale, spacing: card.design.spacing } };
}
