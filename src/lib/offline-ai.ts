/**
 * Offline generation engine. Used when no ANTHROPIC_API_KEY is configured (or
 * the API is unreachable), so the AI flow still produces a sensible, themed,
 * personalised draft from the form and the open notes.
 */
import type { CardContent, Design, Palette, Tone } from "./types";
import { getTemplate, TEMPLATES } from "./templates";
import { luminance } from "./design";
import type { GeneratedDraft } from "./ai-types";

const THEME_RULES: { re: RegExp; template: string; why: string }[] = [
  { re: /rustic|barn|boho|bohemian|sunflower|farm|countryside/i, template: "sunflower-barn", why: "rustic, bohemian cues" },
  { re: /telugu|tamil|kannada|malayal|kerala|south indian|kanjeevaram|temple|brahmin|muhurtham|kalyanam/i, template: "kanjeevaram", why: "a South Indian ceremony" },
  { re: /mehendi|mehndi|sangeet|henna|garba/i, template: "mehendi-night", why: "mehendi and sangeet festivities" },
  { re: /royal|palace|rajasthan|maharaja|udaipur|jodhpur|fort|regal|baraat/i, template: "maharaja", why: "a royal, palace setting" },
  { re: /black[- ]tie|gala|art deco|gatsby|glam|ballroom|midnight/i, template: "midnight-gold", why: "a glamorous evening mood" },
  { re: /beach|coastal|seaside|ocean|nautical|island|goa/i, template: "coastal-blue", why: "a seaside setting" },
  { re: /peony|peonies|roses|blush|romantic|garden party|floral/i, template: "blush-peony", why: "romantic florals" },
  { re: /greenery|eucalyptus|forest|woodland|outdoor|vineyard|botanical/i, template: "eucalyptus", why: "an outdoor, botanical feel" },
  { re: /vintage|victorian|heritage|old[- ]world|antique|church/i, template: "victorian-ivory", why: "vintage elegance" },
  { re: /terracotta|desert|mediterranean|tuscan|earthy/i, template: "terracotta", why: "earthy, sun-baked tones" },
  { re: /minimal|modern|simple|courthouse|city hall|elopement|intimate/i, template: "white-linen", why: "a minimal, modern style" },
  { re: /hindu|punjabi|gujarati|bengali|marwari|sikh|anand karaj|indian|pheras|mandap|haldi|vivah|shaadi|nikah/i, template: "marigold-mandap", why: "a traditional Indian celebration" },
];

const COLOR_WORDS: { re: RegExp; accent: string }[] = [
  { re: /sunset gold|golden|gold/i, accent: "#d4a017" },
  { re: /emerald/i, accent: "#1f7a4d" },
  { re: /navy/i, accent: "#1d3557" },
  { re: /blush|pastel pink/i, accent: "#e8a5a5" },
  { re: /lavender|lilac/i, accent: "#9d8ec7" },
  { re: /teal|turquoise/i, accent: "#2a9d8f" },
  { re: /burgundy|maroon|wine/i, accent: "#7b1e2b" },
  { re: /sage/i, accent: "#8a9a5b" },
  { re: /coral|peach/i, accent: "#e07a5f" },
  { re: /marigold|saffron|orange/i, accent: "#e09f3e" },
];

/** Alternative palettes for "new colour scheme" regeneration. */
const ALT_PALETTES: Palette[] = [
  { primary: "#6d597a", accent: "#e5989b", background: "#fbf7f9", surface: "#ffffff", text: "#2d2230", muted: "#6f6074" },
  { primary: "#1d3557", accent: "#c9a227", background: "#f6f7fb", surface: "#ffffff", text: "#141d2b", muted: "#55617a" },
  { primary: "#386641", accent: "#d4a373", background: "#f7f8f2", surface: "#ffffff", text: "#1f2b1f", muted: "#5c6b56" },
  { primary: "#9e2a2b", accent: "#e09f3e", background: "#fff7ec", surface: "#fffdf8", text: "#33160f", muted: "#7a5245" },
  { primary: "#2a9d8f", accent: "#e9c46a", background: "#f4faf9", surface: "#ffffff", text: "#163330", muted: "#4f6d69" },
  { primary: "#7b2d26", accent: "#d4af37", background: "#fbf3ea", surface: "#fffaf3", text: "#2f1713", muted: "#73554c" },
];

export function detectTheme(notes: string): { templateId: string; reasons: string[] } {
  const reasons: string[] = [];
  let templateId = "";
  for (const rule of THEME_RULES) {
    if (rule.re.test(notes)) {
      if (!templateId) templateId = rule.template;
      reasons.push(rule.why);
    }
  }
  return { templateId: templateId || "white-linen", reasons };
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim().replace(/^["“]|["”]$/g, ""))
    .filter(Boolean);
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const end = (s: string) => (/[.!?]$/.test(s) ? s : s + ".");

export function offlineGenerate(input: {
  content: CardContent;
  tone: Tone;
  variant: number;
  newColors?: boolean;
  keepTemplateId?: string;
}): GeneratedDraft {
  const { content, tone, variant } = input;
  const notes = content.notes || "";
  const a = content.partner1.trim() || "Partner One";
  const b = content.partner2.trim() || "Partner Two";
  const theme = detectTheme(notes);
  const templateId = input.keepTemplateId || theme.templateId;
  const template = getTemplate(templateId);
  const design: Design = structuredClone(template.design);

  const color = COLOR_WORDS.find((c) => c.re.test(notes));
  if (color) design.palette.accent = color.accent;
  if (input.newColors) {
    const alt = ALT_PALETTES[variant % ALT_PALETTES.length];
    const dark = luminance(template.design.palette.background) < 0.2; // keep dark templates dark
    design.palette = dark ? { ...template.design.palette, accent: alt.accent, primary: alt.accent } : alt;
  }
  const playful = tone === "playful";
  if (playful && design.fontPairing === "royal-caps") design.fontPairing = "storybook";

  const all = sentences(notes);
  const storyLines = all.filter((s) => /\b(met|meet|first|bond|fell|love|together|years?|date|proposed|engaged|friends)\b/i.test(s));
  const guidelineLines = all.filter((s) => /\b(attire|dress|adults|children|kids|gift|donat|parking|shuttle|accommodation|hotel|unplugged|phones|plus[- ]one)\b/i.test(s));
  const blessing = /grand(parent|mother|father|ma|pa)|blessing|elders|nani|dadi|ajji|paati/i.test(notes);

  const story = storyLines.length
    ? storyLines.map((s) => end(cap(s.replace(/^we\b/i, "We")))).join(" ")
    : {
        formal: `${a} and ${b} are delighted to begin their married life together, surrounded by the families and friends who have shaped them.`,
        heartfelt: `Every chapter has led us here. We are so grateful to share this one with the people who have loved us all along.`,
        playful: `Two people, one shared playlist and a lifetime of arguing about whose turn it is to make tea. We're making it official!`,
      }[tone];

  const greetings: Record<Tone, string[]> = {
    formal: [
      `Together with their families, ${a} and ${b} request the honour of your presence as they are united in marriage.`,
      `The families of ${a} and ${b} cordially invite you to celebrate their marriage.`,
    ],
    heartfelt: [
      `With hearts full of love, we would be honoured to have you beside us as we begin our forever.`,
      `You have been part of our story, and we would love for you to be part of this day.`,
    ],
    playful: [
      `We're tying the knot, and the party won't be complete without you!`,
      `Grab your dancing shoes: ${a} and ${b} are getting hitched!`,
    ],
  };
  const headlines: Record<Tone, string[]> = {
    formal: [`The Wedding of ${a} & ${b}`, `${a} & ${b}`],
    heartfelt: [`${a} & ${b} are getting married`, `${a} & ${b}: our forever begins`],
    playful: [`${a} + ${b} = Forever`, `${a} & ${b} are tying the knot!`],
  };
  const closings: Record<Tone, string> = {
    formal: "Your gracious presence will be our greatest blessing.",
    heartfelt: "Having you there will make our day complete. We can't wait to celebrate with you.",
    playful: "Come for the vows, stay for the dance floor. See you there!",
  };

  const eventDescriptions = content.events.map((e) => ({
    id: e.id,
    description: e.description || describeEvent(e.title, tone),
  }));

  const reasons = theme.reasons.length ? theme.reasons.join(", ") : "your names and details";
  return {
    templateId: template.id,
    design,
    copy: {
      headline: pick(headlines[tone], variant),
      greeting: pick(greetings[tone], variant),
      story,
      blessings: blessing
        ? "With the loving blessings of our grandparents and elders, whose wisdom guides us."
        : content.blessings || "With the blessings of our families.",
      closing: closings[tone],
      hashtag: content.hashtag || `#${a.replace(/\s+/g, "")}Weds${b.replace(/\s+/g, "")}`,
      guidelines: guidelineLines.length ? guidelineLines.map((s) => end(cap(s))) : content.guidelines,
      eventDescriptions,
      rsvpMessage: content.rsvp.message || "Kindly let us know if you can join us.",
    },
    rationale: input.keepTemplateId
      ? `Offline style engine: kept your "${template.name}" design and rewrote the copy in a ${tone} tone, drawing on ${reasons}.`
      : `Offline style engine: chose "${template.name}" based on ${reasons}, with a ${tone} tone.`,
    engine: "offline",
  };
}

function pick<T>(arr: T[], i: number): T {
  return arr[Math.abs(i) % arr.length];
}

function describeEvent(title: string, tone: Tone): string {
  const t = title.toLowerCase();
  const map: [RegExp, string][] = [
    [/haldi/, "A sunny morning of turmeric, laughter and blessings."],
    [/mehe?n?di/, "Henna, music and colour as we kick off the celebrations."],
    [/sangeet/, "An evening of song, dance and family performances."],
    [/ceremony|pheras|wedding|vivah|muhurtham|nikah|anand karaj/, "The sacred ceremony where we exchange our vows."],
    [/reception|party|dinner|cocktail/, "Dinner, toasts and dancing to celebrate the newlyweds."],
    [/welcome/, "A relaxed welcome gathering to meet, greet and settle in."],
    [/brunch/, "A laid-back farewell brunch before everyone heads home."],
  ];
  const found = map.find(([re]) => re.test(t));
  const base = found ? found[1] : "We would love to have you with us.";
  return tone === "playful" ? base.replace(/\.$/, "!") : base;
}

export const OFFLINE_TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
