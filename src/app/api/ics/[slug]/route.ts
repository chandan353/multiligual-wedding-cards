import { getCardBySlug } from "@/lib/store";
import { buildIcs } from "@/lib/calendar";
import { baseUrl, error } from "@/lib/http";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card || card.status !== "published") return error("Invitation not found", 404);
  const only = new URL(req.url).searchParams.get("event");
  const events = only ? card.content.events.filter((e) => e.id === only) : card.content.events;
  const title = `${card.content.partner1} & ${card.content.partner2}`;
  const ics = buildIcs({ title, events, venues: card.content.venues, tz: card.timezone, url: `${baseUrl(req)}/${slug}`, uidBase: card.id });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}${only ? "-" + only : ""}.ics"`,
    },
  });
}
