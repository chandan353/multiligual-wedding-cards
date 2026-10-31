import { authorizedCard, error, json, safe } from "@/lib/http";
import { claimSlug, getCardBySlug, updateCard } from "@/lib/store";
import { validateSlug } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

async function POSTHandler(req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = await authorizedCard(req, id);
  if (card instanceof Response) return card;
  const body = await req.json().catch(() => ({}));
  // The address is permanent once published so printed QR codes keep working.
  const slug = card.slug ?? String(body.slug || "").toLowerCase().trim();
  const problem = validateSlug(slug);
  if (problem) return error(problem);
  if (!card.content.partner1.trim() || !card.content.partner2.trim()) return error("Add both partners' names before publishing.");
  const owner = await getCardBySlug(slug);
  if (owner && owner.id !== id) return error("That address is already taken. Try adding your wedding year or city.", 409);
  if (!(await claimSlug(slug, id))) return error("That address is already taken.", 409);
  const updated = await updateCard(id, (c) => ({
    ...c,
    slug,
    status: "published",
    publishedAt: c.publishedAt ?? new Date().toISOString(),
  }));
  return json({ card: updated });
}

export const POST = safe(POSTHandler);
