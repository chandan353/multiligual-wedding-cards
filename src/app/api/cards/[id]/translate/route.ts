import { authorizedCard, error, json, safe } from "@/lib/http";
import { updateCard } from "@/lib/store";
import { AiUnavailableError, translateEntries } from "@/lib/ai";
import { flattenTranslatable } from "@/lib/card";
import { isLangCode } from "@/lib/languages";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

async function POSTHandler(req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = await authorizedCard(req, id);
  if (card instanceof Response) return card;
  const body = await req.json().catch(() => ({}));
  const lang = body.lang;
  if (!isLangCode(lang) || lang === card.language.primary) return error("Choose a language to translate into.");
  const source = flattenTranslatable(card.content);
  const existing = card.language.translations[lang] ?? {};
  const keys = body.onlyMissing ? Object.keys(source).filter((k) => !existing[k]) : Object.keys(source);
  const entries = Object.fromEntries(keys.map((k) => [k, source[k]]));
  const context = [
    `Couple: ${card.content.partner1} and ${card.content.partner2}.`,
    `Events: ${card.content.events.map((e) => e.title).join(", ")}.`,
    card.content.notes ? `Couple's notes: ${card.content.notes.slice(0, 1200)}` : "",
  ].join(" ");
  try {
    const translated = await translateEntries(entries, lang, context);
    const updated = await updateCard(id, (c) => ({
      ...c,
      language: {
        ...c.language,
        translations: { ...c.language.translations, [lang]: { ...(body.onlyMissing ? c.language.translations[lang] ?? {} : {}), ...translated } },
        translatedAt: { ...c.language.translatedAt, [lang]: new Date().toISOString() },
      },
    }));
    return json({ card: updated, translated: Object.keys(translated).length });
  } catch (e) {
    if (e instanceof AiUnavailableError) return error(e.message, 503);
    console.error("[translate]", e);
    return error("Translation failed. Please try again in a moment.", 502);
  }
}

export const POST = safe(POSTHandler);
