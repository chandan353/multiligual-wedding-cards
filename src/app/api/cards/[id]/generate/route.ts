import { authorizedCard, json } from "@/lib/http";
import { updateCard } from "@/lib/store";
import { generateDraft } from "@/lib/ai";
import { applyDraft } from "@/lib/apply";
import type { Tone } from "@/lib/types";

export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = await authorizedCard(req, id);
  if (card instanceof Response) return card;
  const body = await req.json().catch(() => ({}));
  const tone: Tone = ["formal", "heartfelt", "playful"].includes(body.tone) ? body.tone : card.ai?.tone ?? "heartfelt";
  const variant = Math.max(0, Math.min(1000, Number(body.variant) || 0));
  const draft = await generateDraft({
    content: card.content,
    tone,
    variant,
    newColors: Boolean(body.newColors),
    keepTemplateId: body.keepTemplate ? card.templateId : undefined,
  });
  const updated = await updateCard(id, (c) => applyDraft(c, draft, tone, variant, { keepDesign: Boolean(body.keepTemplate), newColors: Boolean(body.newColors) }));
  return json({ card: updated, rationale: draft.rationale, engine: draft.engine });
}
