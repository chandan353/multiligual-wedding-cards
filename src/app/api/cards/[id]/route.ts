import { authorizedCard, error, json, safe } from "@/lib/http";
import { updateCard } from "@/lib/store";
import { sanitizeContent, sanitizeLangMap } from "@/lib/card";
import { sanitizeDesign, sanitizeMedia } from "@/lib/apply";
import { isLangCode } from "@/lib/languages";
import { TEMPLATES } from "@/lib/templates";
import type { Card } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function GETHandler(req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = await authorizedCard(req, id);
  if (card instanceof Response) return card;
  return json({ card });
}

async function PUTHandler(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await authorizedCard(req, id);
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid request");
  const updated = await updateCard(id, (card): Card => {
    const lang = body.language ?? {};
    return {
      ...card,
      templateId: TEMPLATES.some((t) => t.id === body.templateId) ? body.templateId : card.templateId,
      timezone: typeof body.timezone === "string" && body.timezone ? body.timezone.slice(0, 64) : card.timezone,
      content: body.content ? sanitizeContent(body.content, card.content) : card.content,
      design: body.design ? sanitizeDesign(body.design, card.design) : card.design,
      media: body.media ? sanitizeMedia(body.media) : card.media,
      language: {
        ...card.language,
        secondary: lang.secondary === null ? null : isLangCode(lang.secondary) && lang.secondary !== card.language.primary ? lang.secondary : card.language.secondary,
        mode: lang.mode === "toggle" || lang.mode === "bilingual" ? lang.mode : card.language.mode,
        overrides: lang.overrides ? sanitizeLangMap(lang.overrides) : card.language.overrides,
        translations: lang.translations ? sanitizeLangMap(lang.translations) : card.language.translations,
      },
    };
  });
  return json({ card: updated });
}

export const GET = safe(GETHandler);
export const PUT = safe(PUTHandler);
