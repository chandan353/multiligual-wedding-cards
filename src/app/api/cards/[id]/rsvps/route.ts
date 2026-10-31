import { authorizedCard, json, safe } from "@/lib/http";
import { listRsvps } from "@/lib/store";
import { rsvpSummary } from "@/lib/card";

type Ctx = { params: Promise<{ id: string }> };

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

async function GETHandler(req: Request, { params }: Ctx) {
  const { id } = await params;
  const card = await authorizedCard(req, id);
  if (card instanceof Response) return card;
  const rsvps = await listRsvps(id);
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const events = new Map(card.content.events.map((e) => [e.id, e.title]));
    const rows = [
      ["Name", "Attending", "Guests", "Meal", "Events", "Message", "Contact", "Language", "Submitted"],
      ...rsvps.map((r) => [r.name, r.attending === "yes" ? "Yes" : "No", r.guestCount, r.meal, r.events.map((e) => events.get(e) ?? e).join("; "), r.message, r.contact, r.language, r.createdAt]),
    ];
    return new Response(rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="rsvps-${card.slug ?? id}.csv"` },
    });
  }
  return json({ rsvps, summary: rsvpSummary(rsvps) });
}

export const GET = safe(GETHandler);
