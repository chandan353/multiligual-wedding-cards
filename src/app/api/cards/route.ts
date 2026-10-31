import { newCard, sanitizeContent, emptyContent, sampleContent } from "@/lib/card";
import { saveCard } from "@/lib/store";
import { error, json } from "@/lib/http";
import { isLangCode } from "@/lib/languages";
import { TEMPLATES } from "@/lib/templates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid request");
  const flow = body.flow === "ai" ? "ai" : "template";
  const templateId = TEMPLATES.some((t) => t.id === body.templateId) ? body.templateId : TEMPLATES[0].id;
  const content = body.content ? sanitizeContent(body.content, emptyContent()) : sampleContent();
  const card = newCard({
    flow,
    templateId,
    content,
    timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 64) : undefined,
    secondary: isLangCode(body.secondary) && body.secondary !== "en" ? body.secondary : null,
  });
  await saveCard(card);
  return json({ card }, 201);
}
