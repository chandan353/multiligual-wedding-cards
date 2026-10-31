import type { Card, CardContent, Design, LangCode, PublicCard, Rsvp, Venue, WeddingEvent } from "./types";
import { getTemplate } from "./templates";
import { isLangCode } from "./languages";

export function uid(prefix = ""): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix + rand.replace(/-/g, "").slice(0, 12);
}

export function emptyContent(): CardContent {
  return {
    partner1: "",
    partner2: "",
    headline: "",
    greeting: "",
    story: "",
    blessings: "",
    closing: "",
    hashtag: "",
    families: [
      { id: "f1", label: "Bride's family", parents: "", grandparents: "", hometown: "" },
      { id: "f2", label: "Groom's family", parents: "", grandparents: "", hometown: "" },
    ],
    events: [],
    venues: [],
    rsvp: { enabled: true, deadline: "", mealOptions: ["Vegetarian", "Non-vegetarian", "Vegan"], allowGuestCount: true, maxGuests: 4, message: "" },
    guidelines: [],
    notes: "",
  };
}

/** Friendly starter content so a fresh template never looks empty. */
export function sampleContent(): CardContent {
  const v1: Venue = { id: "v1", name: "The Leela Palace", address: "Old Airport Road, Bengaluru, Karnataka", landmark: "Opposite Manipal Hospital", mapsUrl: "" };
  const events: WeddingEvent[] = [
    { id: "e1", title: "Mehendi & Sangeet", date: nextSaturday(60), start: "18:00", end: "22:30", dressCode: "Festive colours", description: "An evening of henna, music and dancing with family and friends.", venueId: "v1" },
    { id: "e2", title: "Wedding Ceremony", date: nextSaturday(61), start: "10:00", end: "13:00", dressCode: "Traditional attire", description: "Join us as we take our pheras surrounded by the people we love.", venueId: "v1" },
    { id: "e3", title: "Reception", date: nextSaturday(61), start: "19:30", end: "23:30", dressCode: "Cocktail attire", description: "Dinner, toasts and celebration under the stars.", venueId: "v1" },
  ];
  return {
    ...emptyContent(),
    partner1: "Aditi",
    partner2: "Rohan",
    headline: "Aditi & Rohan are getting married",
    greeting: "With joy in our hearts, we invite you to celebrate the beginning of our forever.",
    story: "We met at a friend's rooftop party in Pune, argued about the best chai in the city, and have been settling that debate together ever since.",
    blessings: "With the blessings of our grandparents and the love of our families.",
    closing: "Your presence will make our celebration complete.",
    hashtag: "#AditiWedsRohan",
    families: [
      { id: "f1", label: "Bride's family", parents: "Mrs. Meera & Mr. Sanjay Sharma", grandparents: "Smt. Kamala & Shri Ramesh Sharma", hometown: "Jaipur" },
      { id: "f2", label: "Groom's family", parents: "Mrs. Priya & Mr. Anil Mehta", grandparents: "Smt. Usha & Shri Mohan Mehta", hometown: "Pune" },
    ],
    venues: [v1],
    events,
    rsvp: { enabled: true, deadline: nextSaturday(40), mealOptions: ["Vegetarian", "Non-vegetarian", "Jain"], allowGuestCount: true, maxGuests: 4, message: "Kindly let us know if you can join us." },
    guidelines: ["Valet parking is available at the venue.", "Gifts are optional; your blessings are what matter most."],
  };
}

function nextSaturday(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}

export function newCard(opts: { flow: Card["flow"]; templateId: string; content?: CardContent; design?: Design; timezone?: string; secondary?: LangCode | null }): Card {
  const now = new Date().toISOString();
  const template = getTemplate(opts.templateId);
  return {
    id: uid("c_"),
    editToken: uid("t_") + uid(),
    slug: null,
    status: "draft",
    flow: opts.flow,
    templateId: template.id,
    timezone: opts.timezone || "Asia/Kolkata",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    content: opts.content ?? sampleContent(),
    design: opts.design ?? structuredClone(template.design),
    language: { primary: "en", secondary: opts.secondary ?? null, mode: "bilingual", translations: {}, overrides: {}, translatedAt: {} },
    media: { hero: null, couple: null, gallery: [] },
    ai: null,
  };
}

export function toPublic(card: Card): PublicCard {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { editToken, content, ...rest } = card;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, ...publicContent } = content;
  return { ...rest, content: publicContent };
}

// ---------- translatable copy ----------

type ContentLike = Omit<CardContent, "notes">;

/**
 * Every guest-visible string the couple wrote, as a flat map of stable keys.
 * Used for AI translation, phrase overrides and bilingual rendering.
 */
export function flattenTranslatable(c: ContentLike): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => {
    if (v && v.trim()) out[k] = v;
  };
  put("partner1", c.partner1);
  put("partner2", c.partner2);
  put("headline", c.headline);
  put("greeting", c.greeting);
  put("story", c.story);
  put("blessings", c.blessings);
  put("closing", c.closing);
  put("rsvp.message", c.rsvp.message);
  c.families.forEach((f) => {
    put(`families.${f.id}.label`, f.label);
    put(`families.${f.id}.parents`, f.parents);
    put(`families.${f.id}.grandparents`, f.grandparents);
    put(`families.${f.id}.hometown`, f.hometown);
  });
  c.events.forEach((e) => {
    put(`events.${e.id}.title`, e.title);
    put(`events.${e.id}.description`, e.description);
    put(`events.${e.id}.dressCode`, e.dressCode);
  });
  c.venues.forEach((v) => {
    put(`venues.${v.id}.name`, v.name);
    put(`venues.${v.id}.address`, v.address);
    put(`venues.${v.id}.landmark`, v.landmark);
  });
  c.guidelines.forEach((g, i) => put(`guidelines.${i}`, g));
  c.rsvp.mealOptions.forEach((m, i) => put(`meal.${i}`, m));
  return out;
}

/** Text for a key in a language: override, then AI translation, then the original. */
export function makeT(card: Pick<Card, "language"> & { content: ContentLike }, lang: LangCode) {
  const source = flattenTranslatable(card.content);
  const tr = card.language.translations[lang] ?? {};
  const ov = card.language.overrides[lang] ?? {};
  return (key: string): string => {
    if (lang === card.language.primary) return ov[key] ?? source[key] ?? "";
    return ov[key] ?? tr[key] ?? "";
  };
}

/** Keys whose source text has no translation yet in a language. */
export function missingTranslations(card: Pick<Card, "language"> & { content: ContentLike }, lang: LangCode): string[] {
  const source = flattenTranslatable(card.content);
  const tr = card.language.translations[lang] ?? {};
  const ov = card.language.overrides[lang] ?? {};
  return Object.keys(source).filter((k) => !tr[k] && !ov[k]);
}

// ---------- validation / sanitising of client input ----------

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");

export function sanitizeContent(input: unknown, fallback: CardContent): CardContent {
  const c = (input ?? {}) as Partial<CardContent>;
  const arr = <T,>(v: unknown, map: (x: Record<string, unknown>, i: number) => T, max = 30): T[] =>
    Array.isArray(v) ? v.slice(0, max).map((x, i) => map((x ?? {}) as Record<string, unknown>, i)) : [];
  const rsvp = (c.rsvp ?? {}) as Partial<CardContent["rsvp"]>;
  return {
    partner1: str(c.partner1, 80),
    partner2: str(c.partner2, 80),
    headline: str(c.headline, 200),
    greeting: str(c.greeting, 1000),
    story: str(c.story, 3000),
    blessings: str(c.blessings, 1000),
    closing: str(c.closing, 1000),
    hashtag: str(c.hashtag, 60),
    families: Array.isArray(c.families)
      ? arr(c.families, (f, i) => ({ id: str(f.id, 20) || `f${i + 1}`, label: str(f.label, 80), parents: str(f.parents, 300), grandparents: str(f.grandparents, 300), hometown: str(f.hometown, 120) }), 6)
      : fallback.families,
    events: arr(c.events, (e, i) => ({
      id: str(e.id, 20) || `e${i + 1}`,
      title: str(e.title, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(e.date)) ? str(e.date) : "",
      start: /^\d{2}:\d{2}$/.test(str(e.start)) ? str(e.start) : "",
      end: /^\d{2}:\d{2}$/.test(str(e.end)) ? str(e.end) : "",
      dressCode: str(e.dressCode, 120),
      description: str(e.description, 1000),
      venueId: str(e.venueId, 20),
    })),
    venues: arr(c.venues, (v, i) => ({
      id: str(v.id, 20) || `v${i + 1}`,
      name: str(v.name, 160),
      address: str(v.address, 400),
      landmark: str(v.landmark, 200),
      mapsUrl: /^https?:\/\//.test(str(v.mapsUrl)) ? str(v.mapsUrl, 600) : "",
    })),
    rsvp: {
      enabled: rsvp.enabled !== false,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(str(rsvp.deadline)) ? str(rsvp.deadline) : "",
      mealOptions: Array.isArray(rsvp.mealOptions) ? rsvp.mealOptions.slice(0, 10).map((m) => str(m, 60)).filter(Boolean) : fallback.rsvp.mealOptions,
      allowGuestCount: rsvp.allowGuestCount !== false,
      maxGuests: Math.max(1, Math.min(20, Number(rsvp.maxGuests) || 4)),
      message: str(rsvp.message, 500),
    },
    guidelines: Array.isArray(c.guidelines) ? c.guidelines.slice(0, 12).map((g) => str(g, 300)) : [],
    notes: str(c.notes, 5000),
  };
}

export function sanitizeLangMap(input: unknown): Partial<Record<LangCode, Record<string, string>>> {
  const out: Partial<Record<LangCode, Record<string, string>>> = {};
  if (!input || typeof input !== "object") return out;
  for (const [lang, map] of Object.entries(input as Record<string, unknown>)) {
    if (!isLangCode(lang) || !map || typeof map !== "object") continue;
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
      if (typeof v === "string" && k.length < 80) m[k] = v.slice(0, 3000);
    }
    out[lang] = m;
  }
  return out;
}

export function rsvpSummary(rsvps: Rsvp[]) {
  const yes = rsvps.filter((r) => r.attending === "yes");
  return {
    responses: rsvps.length,
    attending: yes.length,
    declined: rsvps.length - yes.length,
    headcount: yes.reduce((s, r) => s + (r.guestCount || 1), 0),
  };
}

/** Write a flat translatable key back into content (used by tap-to-edit). */
export function setByKey(c: CardContent, key: string, value: string): CardContent {
  const next = structuredClone(c);
  const parts = key.split(".");
  if (parts.length === 1) {
    (next as unknown as Record<string, unknown>)[key] = value;
    return next;
  }
  const [group, id, field] = parts;
  if (group === "rsvp" && id === "message") next.rsvp.message = value;
  else if (group === "families") {
    const f = next.families.find((x) => x.id === id);
    if (f && field in f) (f as unknown as Record<string, string>)[field] = value;
  } else if (group === "events") {
    const e = next.events.find((x) => x.id === id);
    if (e && field in e) (e as unknown as Record<string, string>)[field] = value;
  } else if (group === "venues") {
    const v = next.venues.find((x) => x.id === id);
    if (v && field in v) (v as unknown as Record<string, string>)[field] = value;
  } else if (group === "guidelines") next.guidelines[Number(id)] = value;
  else if (group === "meal") next.rsvp.mealOptions[Number(id)] = value;
  return next;
}

export const LOCALES: Record<LangCode, string> = {
  en: "en-GB", hi: "hi-IN", mr: "mr-IN", ta: "ta-IN", te: "te-IN", gu: "gu-IN", bn: "bn-IN", pa: "pa-IN",
  es: "es-ES", fr: "fr-FR", ar: "ar", zh: "zh-CN", ja: "ja-JP",
};

export function formatDate(date: string, lang: LangCode, style: "long" | "short" = "long"): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(LOCALES[lang], style === "long" ? { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(dt);
}

export function formatTime(time: string, lang: LangCode): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return new Intl.DateTimeFormat(LOCALES[lang], { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}
