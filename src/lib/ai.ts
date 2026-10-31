import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { CardContent, Design, LangCode, Tone } from "./types";
import type { GeneratedDraft } from "./ai-types";
import { offlineGenerate } from "./offline-ai";
import { getTemplate, TEMPLATES } from "./templates";
import { BORDERS, FONT_PAIRINGS, MOTIFS, normalizePalette, TEXTURES } from "./design";
import { LANGUAGES } from "./languages";

const MODEL = "claude-opus-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** One structured-output request with server-side refusal fallback. Returns parsed JSON. */
async function structured<T>(system: string, user: string, schema: Record<string, unknown>, effort: "low" | "medium"): Promise<T> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: user }],
    output_config: { effort, format: { type: "json_schema", schema } },
  });
  if (response.stop_reason === "refusal") throw new Error("The AI declined this request.");
  if (response.stop_reason === "max_tokens") throw new Error("The AI response was cut off.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(text) as T;
}

const HEX = { type: "string", description: "6-digit hex colour like #a1b2c3" };

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["templateId", "palette", "fontPairing", "texture", "border", "motif", "layout", "copy", "rationale"],
  properties: {
    templateId: { type: "string", enum: TEMPLATES.map((t) => t.id) },
    palette: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "accent", "background", "surface", "text", "muted"],
      properties: { primary: HEX, accent: HEX, background: HEX, surface: HEX, text: HEX, muted: HEX },
    },
    fontPairing: { type: "string", enum: Object.keys(FONT_PAIRINGS) },
    texture: { type: "string", enum: Object.keys(TEXTURES) },
    border: { type: "string", enum: Object.keys(BORDERS) },
    motif: { type: "string", enum: Object.keys(MOTIFS) },
    layout: { type: "string", enum: ["centered", "split", "framed"] },
    copy: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "greeting", "story", "blessings", "closing", "hashtag", "guidelines", "eventDescriptions", "rsvpMessage"],
      properties: {
        headline: { type: "string" },
        greeting: { type: "string" },
        story: { type: "string" },
        blessings: { type: "string" },
        closing: { type: "string" },
        hashtag: { type: "string" },
        guidelines: { type: "array", items: { type: "string" } },
        eventDescriptions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "description"],
            properties: { id: { type: "string" }, description: { type: "string" } },
          },
        },
        rsvpMessage: { type: "string" },
      },
    },
    rationale: { type: "string" },
  },
};

const DRAFT_SYSTEM = `You are the design and copywriting engine of a wedding invitation platform. Couples give you structured details plus free-form "open notes" (their story, theme, cultural customs, guidelines). You choose a visual theme and write the guest-facing copy for their digital invitation page.

Design: pick the template whose mood best matches the notes, then tune the palette to any colours or themes they mention. Keep text readable: "text" must contrast strongly with "background" (WCAG AA), "surface" is a card colour near the background. Pick motifs that respect the culture described (for example lotus or mandala for South Indian Hindu ceremonies, crest for European formal, sunflower for rustic).

Copy: warm, elegant, natural prose in English, written as if by the couple or their families. Honour cultural and religious customs accurately and respectfully, using the correct ceremony names the couple uses. If the notes ask for blessings from grandparents or elders, include them in "blessings". Turn concrete event guidelines (attire, adults-only, gifts, donations, parking) into short, gracious "guidelines" sentences; never invent rules the couple did not give. The story should build on what they told you and must not invent facts (no made-up places, dates or anecdotes). Keep the headline under 60 characters, greeting and closing to one or two sentences, the story under 90 words, and each event description to one sentence. Return one eventDescriptions entry per event id you are given. "rationale" is one sentence to the couple explaining the design choice.`;

export async function generateDraft(input: {
  content: CardContent;
  tone: Tone;
  variant: number;
  newColors?: boolean;
  keepTemplateId?: string;
}): Promise<GeneratedDraft> {
  if (!aiEnabled()) return offlineGenerate(input);
  const c = input.content;
  const details = {
    partners: [c.partner1, c.partner2],
    families: c.families.map((f) => ({ label: f.label, parents: f.parents, grandparents: f.grandparents, hometown: f.hometown })),
    events: c.events.map((e) => ({ id: e.id, title: e.title, date: e.date, start: e.start, end: e.end, dressCode: e.dressCode, venue: c.venues.find((v) => v.id === e.venueId)?.name ?? "", currentDescription: e.description })),
    venues: c.venues.map((v) => ({ name: v.name, address: v.address })),
    rsvpDeadline: c.rsvp.deadline,
  };
  const templates = TEMPLATES.map((t) => `- ${t.id}: ${t.name} (${t.category}) ${t.description}`).join("\n");
  const user = `Available templates:\n${templates}\n\nTone: ${input.tone}\nVariation number: ${input.variant} (give a noticeably different wording from earlier variations when this is above 0)${
    input.newColors ? "\nThe couple asked for a fresh colour scheme: propose a different palette from the template default while keeping the mood." : ""
  }${input.keepTemplateId ? `\nKeep templateId "${input.keepTemplateId}".` : ""}\n\n<wedding_details>\n${JSON.stringify(details, null, 2)}\n</wedding_details>\n\n<open_notes>\n${c.notes || "(none)"}\n</open_notes>`;

  try {
    type Raw = {
      templateId: string;
      palette: Design["palette"];
      fontPairing: Design["fontPairing"];
      texture: Design["texture"];
      border: Design["border"];
      motif: Design["motif"];
      layout: Design["layout"];
      copy: GeneratedDraft["copy"];
      rationale: string;
    };
    const raw = await structured<Raw>(DRAFT_SYSTEM, user, DRAFT_SCHEMA, "medium");
    const template = getTemplate(input.keepTemplateId || raw.templateId);
    const design: Design = {
      ...template.design,
      palette: normalizePalette(raw.palette, template.design.palette),
      fontPairing: raw.fontPairing in FONT_PAIRINGS ? raw.fontPairing : template.design.fontPairing,
      texture: raw.texture in TEXTURES ? raw.texture : template.design.texture,
      border: raw.border in BORDERS ? raw.border : template.design.border,
      motif: raw.motif in MOTIFS ? raw.motif : template.design.motif,
      layout: ["centered", "split", "framed"].includes(raw.layout) ? raw.layout : template.design.layout,
    };
    return { templateId: template.id, design, copy: raw.copy, rationale: raw.rationale, engine: "claude" };
  } catch (err) {
    console.error("[ai] generation failed, using offline engine:", err);
    const draft = offlineGenerate(input);
    return { ...draft, rationale: `${draft.rationale} (The AI service was unavailable, so the offline engine was used.)` };
  }
}

const TRANSLATE_SYSTEM = `You translate wedding invitation copy for a multilingual invitation page. Translate each entry into the target language so it reads as if written natively for a wedding in that culture, not word for word.

Rules:
- Use the traditional, respectful register families use on printed wedding cards in that language, including honorifics (for example Shri / Smt. become श्री / श्रीमती in Hindi, திரு / திருமதி in Tamil).
- Keep ceremony names that are proper terms (Mehendi, Sangeet, Haldi, Muhurtham, Nikah, Anand Karaj) in their customary native form or script instead of translating their meaning.
- Family relationship words must be accurate for the culture (maternal vs paternal grandparents where the source makes it clear).
- Personal names, venue names and street addresses are transliterated into the target script, never translated. Keep numbers, times and URLs unchanged.
- Keep hashtags unchanged.
- Return exactly one item per input key, with the same key.`;

const TRANSLATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "text"],
        properties: { key: { type: "string" }, text: { type: "string" } },
      },
    },
  },
};

export class AiUnavailableError extends Error {}

export async function translateEntries(entries: Record<string, string>, target: LangCode, context: string): Promise<Record<string, string>> {
  if (!aiEnabled()) throw new AiUnavailableError("AI translation needs ANTHROPIC_API_KEY to be configured on the server.");
  const keys = Object.keys(entries);
  if (!keys.length) return {};
  const info = LANGUAGES[target];
  const out: Record<string, string> = {};
  // Batch so one very long card never produces a single huge response.
  for (let i = 0; i < keys.length; i += 40) {
    const chunk = Object.fromEntries(keys.slice(i, i + 40).map((k) => [k, entries[k]]));
    const user = `Target language: ${info.name} (${info.native}), script: ${info.script}.\nWedding context: ${context}\n\n<entries>\n${JSON.stringify(chunk, null, 2)}\n</entries>`;
    const res = await structured<{ items: { key: string; text: string }[] }>(TRANSLATE_SYSTEM, user, TRANSLATE_SCHEMA, "medium");
    for (const item of res.items) if (item.key in chunk && item.text) out[item.key] = item.text;
  }
  return out;
}
