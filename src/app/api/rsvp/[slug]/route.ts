import { addRsvp, getCardBySlug } from "@/lib/store";
import { error, json } from "@/lib/http";
import { uid } from "@/lib/card";
import { isLangCode } from "@/lib/languages";

type Ctx = { params: Promise<{ slug: string }> };

// Basic per-IP throttle so a public form can't be flooded.
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card || card.status !== "published") return error("Invitation not found", 404);
  if (!card.content.rsvp.enabled) return error("RSVPs are closed for this invitation.", 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (throttled(ip)) return error("Too many submissions. Please wait a minute.", 429);
  const b = await req.json().catch(() => null);
  if (!b) return error("Invalid request");
  if (b.website) return json({ ok: true }); // honeypot
  const name = String(b.name ?? "").trim().slice(0, 120);
  if (!name) return error("Please enter your name.");
  const attending = b.attending === "no" ? "no" : "yes";
  const max = card.content.rsvp.allowGuestCount ? card.content.rsvp.maxGuests : 1;
  const eventIds = new Set(card.content.events.map((e) => e.id));
  await addRsvp({
    id: uid("r_"),
    cardId: card.id,
    name,
    attending,
    guestCount: attending === "yes" ? Math.max(1, Math.min(max, Number(b.guestCount) || 1)) : 0,
    meal: attending === "yes" ? String(b.meal ?? "").slice(0, 60) : "",
    events: attending === "yes" && Array.isArray(b.events) ? b.events.filter((e: unknown) => typeof e === "string" && eventIds.has(e)) : [],
    message: String(b.message ?? "").slice(0, 1000),
    contact: String(b.contact ?? "").slice(0, 160),
    language: isLangCode(b.language) ? b.language : "en",
    createdAt: new Date().toISOString(),
  });
  return json({ ok: true }, 201);
}
