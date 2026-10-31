import type { Venue, WeddingEvent } from "./types";

/** Offset in minutes of a time zone from UTC at a given instant. */
function tzOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    return Math.round((asUtc - at.getTime()) / 60000);
  } catch {
    return 0;
  }
}

/** Convert a wall-clock date + time in a time zone into a UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = tzOffsetMinutes(timeZone, guess);
  const first = new Date(guess.getTime() - offset * 60000);
  // Re-check across DST boundaries.
  const offset2 = tzOffsetMinutes(timeZone, first);
  return offset2 === offset ? first : new Date(guess.getTime() - offset2 * 60000);
}

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Fold lines at 75 octets as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  const dec = new TextDecoder();
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    let end = Math.min(i + (out.length ? 74 : 75), bytes.length);
    // don't split a multi-byte character
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push((out.length ? " " : "") + dec.decode(bytes.subarray(i, end)));
    i = end;
  }
  return out.join("\r\n");
}

export function eventRange(e: WeddingEvent, tz: string): { start: Date; end: Date } | null {
  if (!e.date) return null;
  const start = zonedToUtc(e.date, e.start || "00:00", tz);
  let end = e.end ? zonedToUtc(e.date, e.end, tz) : new Date(start.getTime() + 3 * 3600_000);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600_000); // runs past midnight
  return { start, end };
}

export function venueText(v?: Venue): string {
  if (!v) return "";
  return [v.name, v.address].filter(Boolean).join(", ");
}

export function buildIcs(opts: { title: string; events: WeddingEvent[]; venues: Venue[]; tz: string; url: string; uidBase: string }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AI Multilingual Wedding Cards//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  const now = icsStamp(new Date());
  for (const e of opts.events) {
    const r = eventRange(e, opts.tz);
    if (!r) continue;
    const venue = opts.venues.find((v) => v.id === e.venueId);
    const desc = [e.description, e.dressCode && `Dress code: ${e.dressCode}`, opts.url].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${opts.uidBase}-${e.id}@weddingcards`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsStamp(r.start)}`,
      `DTEND:${icsStamp(r.end)}`,
      `SUMMARY:${icsEscape(`${e.title} · ${opts.title}`)}`,
      `DESCRIPTION:${icsEscape(desc)}`,
      `LOCATION:${icsEscape(venueText(venue))}`,
      `URL:${opts.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: WeddingEvent, venue: Venue | undefined, tz: string, title: string, url: string): string | null {
  const r = eventRange(e, tz);
  if (!r) return null;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${e.title} · ${title}`,
    dates: `${icsStamp(r.start)}/${icsStamp(r.end)}`,
    details: [e.description, url].filter(Boolean).join("\n\n"),
    location: venueText(venue),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function directionsUrl(v: Venue): string {
  if (v.mapsUrl) return v.mapsUrl;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venueText(v))}`;
}

export function mapEmbedUrl(v: Venue): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(venueText(v))}&output=embed`;
}
