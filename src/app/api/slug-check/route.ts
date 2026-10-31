import { getCardBySlug } from "@/lib/store";
import { validateSlug } from "@/lib/slug";
import { json, safe } from "@/lib/http";

async function GETHandler(req: Request) {
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") || "").toLowerCase();
  const cardId = u.searchParams.get("cardId") || "";
  const problem = validateSlug(slug);
  if (problem) return json({ available: false, reason: problem });
  const owner = await getCardBySlug(slug);
  if (owner && owner.id !== cardId) return json({ available: false, reason: "That address is already taken." });
  return json({ available: true });
}

export const GET = safe(GETHandler);
