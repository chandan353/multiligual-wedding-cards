import { describe, expect, it } from "vitest";
import { slugify, suggestSlug, validateSlug } from "@/lib/slug";
import { buildIcs, zonedToUtc, eventRange } from "@/lib/calendar";
import { flattenTranslatable, makeT, missingTranslations, newCard, sampleContent, sanitizeContent, setByKey, emptyContent } from "@/lib/card";
import { contrast, normalizePalette, readableOn } from "@/lib/design";
import { detectTheme, offlineGenerate } from "@/lib/offline-ai";
import { applyDraft } from "@/lib/apply";
import { LABELS, LANGUAGE_CODES } from "@/lib/languages";
import { layoutQr, PRINT_SIZES, qrSvg } from "@/lib/qr";

describe("slugs", () => {
  it("builds readable slugs from names", () => {
    expect(suggestSlug("Aditi", "Rohan")).toBe("aditi-and-rohan");
    expect(slugify("José & Zoë!")).toBe("jose-and-zoe");
    expect(suggestSlug("", "")).toBe("our-wedding");
  });
  it("rejects reserved and malformed slugs", () => {
    expect(validateSlug("api")).toBeTruthy();
    expect(validateSlug("-bad")).toBeTruthy();
    expect(validateSlug("aditi-and-rohan")).toBeNull();
  });
});

describe("calendar", () => {
  it("converts wall-clock time in a zone to UTC", () => {
    expect(zonedToUtc("2027-01-02", "10:00", "Asia/Kolkata").toISOString()).toBe("2027-01-02T04:30:00.000Z");
    expect(zonedToUtc("2027-07-10", "18:00", "Europe/London").toISOString()).toBe("2027-07-10T17:00:00.000Z");
  });
  it("rolls events that end after midnight into the next day", () => {
    const r = eventRange({ id: "e", title: "", date: "2027-01-02", start: "21:00", end: "01:00", dressCode: "", description: "", venueId: "" }, "UTC")!;
    expect(r.end.getTime() - r.start.getTime()).toBe(4 * 3600_000);
  });
  it("produces a valid, folded ICS file", () => {
    const c = sampleContent();
    const ics = buildIcs({ title: "Aditi & Rohan", events: c.events, venues: c.venues, tz: "Asia/Kolkata", url: "https://x.test/a", uidBase: "c1" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe("translatable content", () => {
  const card = newCard({ flow: "template", templateId: "marigold-mandap", secondary: "hi" });
  it("flattens and writes back keys", () => {
    const flat = flattenTranslatable(card.content);
    const eid = card.content.events[0].id;
    expect(flat[`events.${eid}.title`]).toBe(card.content.events[0].title);
    const next = setByKey(card.content, `events.${eid}.title`, "Haldi");
    expect(next.events[0].title).toBe("Haldi");
    expect(card.content.events[0].title).not.toBe("Haldi");
  });
  it("prefers overrides, then translations; primary reads source", () => {
    card.language.translations.hi = { headline: "AI", greeting: "नमस्ते" };
    card.language.overrides.hi = { headline: "मेरा" };
    const t = makeT(card, "hi");
    expect(t("headline")).toBe("मेरा");
    expect(t("greeting")).toBe("नमस्ते");
    expect(makeT(card, "en")("headline")).toBe(card.content.headline);
    expect(missingTranslations(card, "hi")).not.toContain("greeting");
  });
  it("sanitises untrusted input", () => {
    const c = sanitizeContent({ partner1: "A".repeat(500), events: [{ date: "nope", start: "25:00x" }], venues: [{ mapsUrl: "javascript:alert(1)" }] }, emptyContent());
    expect(c.partner1).toHaveLength(80);
    expect(c.events[0].date).toBe("");
    expect(c.venues[0].mapsUrl).toBe("");
  });
});

describe("design", () => {
  it("forces readable text on any background", () => {
    expect(contrast(readableOn("#0f1626", "#111111"), "#0f1626")).toBeGreaterThanOrEqual(4.5);
    const p = normalizePalette({ background: "#ffffff", text: "#eeeeee" }, normalizePalette({}, { primary: "#000000", accent: "#000000", background: "#ffffff", surface: "#ffffff", text: "#000000", muted: "#555555" }));
    expect(contrast(p.text, p.background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("offline AI engine", () => {
  it("detects themes from open notes", () => {
    expect(detectTheme("Rustic bohemian barn wedding with sunflowers").templateId).toBe("sunflower-barn");
    expect(detectTheme("A South Indian Telugu Brahmin ceremony").templateId).toBe("kanjeevaram");
  });
  it("drafts copy that uses the couple's notes without inventing guidelines", () => {
    const content = { ...sampleContent(), notes: "We met on a rainy morning at a coffee shop in Seattle. Strictly cocktail attire; adults-only reception. Please include blessings from grandparents." };
    const d = offlineGenerate({ content, tone: "formal", variant: 0 });
    expect(d.copy.story).toMatch(/Seattle/);
    expect(d.copy.guidelines.join(" ")).toMatch(/adults-only/);
    expect(d.copy.blessings).toMatch(/grandparents/);
    expect(d.copy.eventDescriptions).toHaveLength(content.events.length);
  });
  it("keeps the couple's styling when they keep their template", () => {
    const card = newCard({ flow: "template", templateId: "white-linen" });
    card.design.fontPairing = "storybook";
    const draft = offlineGenerate({ content: { ...card.content, notes: "royal palace" }, tone: "playful", variant: 1 });
    const kept = applyDraft(card, draft, "playful", 1, { keepDesign: true });
    expect(kept.design.fontPairing).toBe("storybook");
    expect(kept.templateId).toBe("white-linen");
    const changed = applyDraft(card, draft, "playful", 1);
    expect(changed.templateId).toBe("maharaja");
  });
});

describe("languages", () => {
  it("has every interface label in every language", () => {
    const keys = Object.keys(LABELS.en);
    for (const l of LANGUAGE_CODES) for (const k of keys) expect(LABELS[l][k as keyof typeof LABELS.en], `${l}.${k}`).toBeTruthy();
  });
});

describe("QR studio", () => {
  it("lays out print sizes at 300 DPI and keeps the code inside the page", () => {
    for (const size of PRINT_SIZES) {
      const L = layoutQr({ url: "https://x.test/aditi-and-rohan", dark: "#000", light: "#fff", accent: "#b8892d", frame: "ornate", cta: "Scan to RSVP", names: "Aditi & Rohan", date: "2 Jan 2027", headingFont: "Cinzel", bodyFont: "Lato", size });
      expect(L.w).toBe(Math.round(size.widthIn * 300));
      expect(L.qr.x).toBeGreaterThan(0);
      expect(L.qr.y + L.qr.size).toBeLessThan(L.h);
    }
    const svg = qrSvg({ url: "https://x.test/a", dark: "#000", light: "#fff", accent: "#aaa", frame: "classic", cta: "Scan <me>", names: "A & B", date: "", headingFont: "X", bodyFont: "Y", size: PRINT_SIZES[0] });
    expect(svg).toContain('width="2.000in"');
    expect(svg).toContain("Scan &lt;me&gt;");
  });
});
