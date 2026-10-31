import type { BorderId, Design, FontPairingId, LangCode, MotifId, Palette, TextureId } from "./types";
import { LANGUAGES } from "./languages";

export interface FontPairing {
  id: FontPairingId;
  name: string;
  heading: string;
  body: string;
  /** whether headings read as serif (drives which non-Latin family is matched) */
  headingVoice: "serif" | "sans";
  bodyVoice: "serif" | "sans";
  headingCase?: "uppercase" | "none";
  headingWeight: number;
}

export const FONT_PAIRINGS: Record<FontPairingId, FontPairing> = {
  "classic-serif": { id: "classic-serif", name: "Classic Serif", heading: "Playfair Display", body: "Lato", headingVoice: "serif", bodyVoice: "sans", headingWeight: 400 },
  "romantic-script": { id: "romantic-script", name: "Romantic Script", heading: "Great Vibes", body: "Cormorant Garamond", headingVoice: "serif", bodyVoice: "serif", headingWeight: 400 },
  "royal-caps": { id: "royal-caps", name: "Royal Capitals", heading: "Cinzel", body: "EB Garamond", headingVoice: "serif", bodyVoice: "serif", headingCase: "uppercase", headingWeight: 400 },
  "modern-sans": { id: "modern-sans", name: "Modern Sans", heading: "Josefin Sans", body: "DM Sans", headingVoice: "sans", bodyVoice: "sans", headingCase: "uppercase", headingWeight: 400 },
  editorial: { id: "editorial", name: "Editorial", heading: "DM Serif Display", body: "Montserrat", headingVoice: "serif", bodyVoice: "sans", headingWeight: 400 },
  storybook: { id: "storybook", name: "Storybook", heading: "Fraunces", body: "Nunito", headingVoice: "serif", bodyVoice: "sans", headingWeight: 400 },
};

export const TEXTURES: Record<TextureId, { name: string }> = {
  none: { name: "Plain" },
  paper: { name: "Cotton paper" },
  linen: { name: "Linen" },
  dots: { name: "Polka dots" },
  damask: { name: "Damask" },
  watercolor: { name: "Watercolour wash" },
  grain: { name: "Fine grain" },
};

export const BORDERS: Record<BorderId, { name: string }> = {
  none: { name: "None" },
  thin: { name: "Hairline" },
  double: { name: "Double rule" },
  floral: { name: "Floral corners" },
  mandala: { name: "Mandala corners" },
  deco: { name: "Art deco" },
  filigree: { name: "Royal filigree" },
};

export const MOTIFS: Record<MotifId, { name: string }> = {
  none: { name: "None" },
  mandala: { name: "Mandala" },
  marigold: { name: "Marigold garland" },
  florals: { name: "Florals" },
  leaves: { name: "Eucalyptus leaves" },
  deco: { name: "Art deco fan" },
  crest: { name: "Monogram crest" },
  sunflower: { name: "Sunflowers" },
  lotus: { name: "Lotus" },
};

export const ACCENT_SWATCHES = [
  "#b8860b", "#c9a227", "#d4a373", "#b5485d", "#9e2a2b", "#7b2d26", "#e07a5f",
  "#6d597a", "#355070", "#2a9d8f", "#386641", "#8a9a5b", "#1d3557", "#111111",
];

// ---------- colour helpers ----------
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

/** Shift a colour warmer (positive) or cooler (negative). amount in -50..50 */
export function warm(hex: string, amount: number): string {
  if (!amount) return hex;
  const [r, g, b] = hexToRgb(hex);
  const k = amount / 50; // -1..1
  return rgbToHex(r + 22 * k, g + 6 * k, b - 22 * k);
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Text colour that stays readable on a background (WCAG AA for body text). */
export function readableOn(bg: string, preferred: string): string {
  if (contrast(bg, preferred) >= 4.5) return preferred;
  return luminance(bg) > 0.4 ? "#1a1a1a" : "#fdfbf7";
}

export function normalizePalette(p: Partial<Palette> | undefined, fallback: Palette): Palette {
  const pick = (k: keyof Palette) => (isHex(p?.[k]) ? (p![k] as string) : fallback[k]);
  const palette: Palette = {
    primary: pick("primary"),
    accent: pick("accent"),
    background: pick("background"),
    surface: pick("surface"),
    text: pick("text"),
    muted: pick("muted"),
  };
  palette.text = readableOn(palette.background, palette.text);
  return palette;
}

function fontStack(family: string, voice: "serif" | "sans", lang: LangCode): string {
  const info = LANGUAGES[lang];
  const scriptFont = voice === "serif" ? info.serif : info.sans;
  const generic = voice === "serif" ? "serif" : "sans-serif";
  // Latin family first so Latin names keep the pairing; the matched script font
  // then renders the regional glyphs at a harmonised weight.
  return [family && `"${family}"`, scriptFont && `"${scriptFont}"`, generic].filter(Boolean).join(", ");
}

/** CSS custom properties for a card in a given language. */
export function designVars(design: Design, lang: LangCode = "en"): Record<string, string> {
  const pair = FONT_PAIRINGS[design.fontPairing] ?? FONT_PAIRINGS["classic-serif"];
  const info = LANGUAGES[lang];
  const p = design.palette;
  const w = design.warmth ?? 0;
  const bg = warm(p.background, w * 0.5);
  const text = readableOn(bg, p.text);
  // Script headings ("Great Vibes") have no glyphs for other scripts and their
  // optical size is unusual, so non-Latin text drops to the matched serif.
  const nonLatin = info.script !== "Latin";
  const headingFamily = nonLatin && pair.id === "romantic-script" ? "" : pair.heading;
  return {
    "--c-primary": warm(p.primary, w),
    "--c-accent": warm(p.accent, w),
    "--c-bg": bg,
    "--c-surface": warm(p.surface, w * 0.5),
    "--c-text": text,
    "--c-muted": readableOn(bg, p.muted) === p.muted ? p.muted : mix(text, bg, 0.3),
    "--c-on-primary": readableOn(warm(p.primary, w), "#ffffff"),
    "--f-heading": fontStack(headingFamily, pair.headingVoice, lang),
    "--f-body": fontStack(pair.body, pair.bodyVoice, lang),
    "--heading-case": nonLatin ? "none" : pair.headingCase ?? "none",
    "--heading-weight": String(pair.headingWeight),
    "--script-scale": String(info.scale),
    "--script-lh": String(info.lineHeight),
    "--font-scale": String(design.fontScale ?? 1),
    "--space": String(design.spacing ?? 1),
  };
}

export function fontsForDesign(design: Design, langs: (LangCode | null | undefined)[]): string[] {
  const pair = FONT_PAIRINGS[design.fontPairing] ?? FONT_PAIRINGS["classic-serif"];
  const families = [pair.heading, pair.body];
  for (const l of langs) {
    if (!l) continue;
    const info = LANGUAGES[l];
    families.push(info.serif, info.sans);
  }
  return families.filter(Boolean);
}

export function allPairingFonts(): string[] {
  return Object.values(FONT_PAIRINGS).flatMap((p) => [p.heading, p.body]);
}
