"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import type { ImageAsset, LangCode, PublicCard } from "@/lib/types";
import { formatDate, formatTime, makeT } from "@/lib/card";
import { designVars } from "@/lib/design";
import { label, LANGUAGES, type LabelKey } from "@/lib/languages";
import { directionsUrl, googleCalendarUrl, mapEmbedUrl, venueText } from "@/lib/calendar";
import { Border, Motif, textureBackground } from "./Ornaments";

export type ViewLang = LangCode | "both";
export type ImageSlot = "hero" | "couple" | "gallery";

interface Props {
  card: PublicCard;
  /** Absolute live URL, for calendar entries */
  liveUrl?: string;
  view?: ViewLang;
  onViewChange?: (v: ViewLang) => void;
  editable?: boolean;
  /** Called with a flat content key, the language being edited and the new text */
  onEdit?: (key: string, lang: LangCode, value: string) => void;
  onImageClick?: (slot: ImageSlot, index?: number) => void;
  /** When false (editor preview), RSVP posts are simulated */
  live?: boolean;
  compact?: boolean;
}

export function defaultView(card: PublicCard): ViewLang {
  const { secondary, mode, primary } = card.language;
  if (!secondary) return primary;
  return mode === "bilingual" ? "both" : primary;
}

function imgStyle(img: ImageAsset): CSSProperties {
  return {
    objectPosition: `${img.focalX}% ${img.focalY}%`,
    transform: `scale(${img.zoom})`,
    transformOrigin: `${img.focalX}% ${img.focalY}%`,
  };
}

const ASPECT: Record<ImageAsset["aspect"], string> = { "16:9": "16 / 9", "4:5": "4 / 5", "1:1": "1 / 1", "3:4": "3 / 4" };

export default function CardView({ card, liveUrl = "", view: viewProp, onViewChange, editable, onEdit, onImageClick, live, compact }: Props) {
  const primary = card.language.primary;
  const secondary = card.language.secondary;
  const [innerView, setInnerView] = useState<ViewLang>(defaultView(card));
  const view = viewProp ?? innerView;
  const setView = (v: ViewLang) => (onViewChange ? onViewChange(v) : setInnerView(v));
  useEffect(() => {
    if (view !== "both" && view !== primary && view !== secondary) setView(defaultView(card));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondary, primary]);

  const tPrimary = useMemo(() => makeT(card, primary), [card, primary]);
  const tSecondary = useMemo(() => (secondary ? makeT(card, secondary) : null), [card, secondary]);
  const single: LangCode = view === "both" ? primary : view;
  const tSingle = single === primary ? tPrimary : tSecondary ?? tPrimary;
  const showBoth = view === "both" && !!secondary;

  const vars = designVars(card.design, single) as CSSProperties;
  const secondaryVars = secondary ? (designVars(card.design, secondary) as Record<string, string>) : null;
  const l2Style: CSSProperties | undefined = secondaryVars
    ? ({
        "--f-heading": secondaryVars["--f-heading"],
        "--f-body": secondaryVars["--f-body"],
        "--script-scale": secondaryVars["--script-scale"],
        "--script-lh": secondaryVars["--script-lh"],
        "--heading-case": "none",
      } as CSSProperties)
    : undefined;
  const dir = LANGUAGES[single].dir;

  /** Text for a flat key, rendered in one or both languages. */
  const T = ({ k, as: Tag = "span", className, fallback }: { k: string; as?: ElementType; className?: string; fallback?: string }) => {
    const first = tSingle(k) || (single !== primary ? tPrimary(k) : "") || fallback || "";
    const editLang = single;
    const main = editable ? (
      <Editable tag={Tag} className={className} value={first} placeholder={fallback ?? "Tap to add text"} onCommit={(v) => onEdit?.(k, editLang, v)} lang={editLang} />
    ) : first ? (
      <Tag className={className} lang={editLang}>
        {first}
      </Tag>
    ) : null;
    if (!showBoth || !secondary || !tSecondary) return main;
    const second = tSecondary(k);
    return (
      <>
        {main}
        {editable ? (
          <Editable tag={Tag} className={`${className ?? ""} wc-l2`} style={l2Style} value={second} placeholder={`+ ${LANGUAGES[secondary].native}`} onCommit={(v) => onEdit?.(k, secondary, v)} lang={secondary} dir={LANGUAGES[secondary].dir} />
        ) : second ? (
          <Tag className={`${className ?? ""} wc-l2`} style={l2Style} lang={secondary} dir={LANGUAGES[secondary].dir}>
            {second}
          </Tag>
        ) : null}
      </>
    );
  };

  /** Built-in interface label in one or both languages. */
  const L = ({ k, as: Tag = "span", className }: { k: LabelKey; as?: ElementType; className?: string }) => (
    <Tag className={className}>
      <span lang={single}>{label(single, k)}</span>
      {showBoth && secondary && label(secondary, k) !== label(primary, k) && (
        <span className="wc-l2 wc-l2-inline" style={l2Style} lang={secondary} dir={LANGUAGES[secondary].dir}>
          {label(secondary, k)}
        </span>
      )}
    </Tag>
  );
  const plain = (k: LabelKey) => label(single, k);

  const c = card.content;
  const d = card.design;
  const firstEvent = [...c.events].filter((e) => e.date).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
  const mainVenue = c.venues.find((v) => v.id === firstEvent?.venueId) ?? c.venues[0];
  const hasFamilies = c.families.some((f) => f.parents || f.grandparents);
  const texture = textureBackground(d.texture, d.palette.accent);
  const title = `${c.partner1} & ${c.partner2}`;
  const icsAll = card.slug ? `/api/ics/${card.slug}` : undefined;

  return (
    <div className={`wc-root wc-layout-${d.layout} ${compact ? "wc-compact" : ""} ${editable ? "wc-editing" : ""}`} style={{ ...vars, backgroundImage: texture }} dir={dir} lang={single}>
      {secondary && (
        <div className="wc-langbar" role="group" aria-label={plain("language")}>
          <span className="wc-langbar-icon" aria-hidden>
            文A
          </span>
          {[primary, secondary].map((l) => (
            <button key={l} type="button" className={view === l ? "on" : ""} onClick={() => setView(l)} lang={l} aria-pressed={view === l}>
              {LANGUAGES[l].native}
            </button>
          ))}
          <button type="button" className={view === "both" ? "on" : ""} onClick={() => setView("both")} aria-pressed={view === "both"}>
            {label(primary, "both")}
          </button>
        </div>
      )}

      {/* ---------- Hero ---------- */}
      <header className={`wc-hero ${card.media.hero ? "has-img" : ""}`}>
        {card.media.hero ? (
          <div className="wc-hero-img" onClick={editable ? () => onImageClick?.("hero") : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.media.hero.url} alt="" style={imgStyle(card.media.hero)} fetchPriority="high" />
          </div>
        ) : (
          editable && (
            <button type="button" className="wc-img-placeholder wc-hero-ph" onClick={() => onImageClick?.("hero")}>
              + Add a hero photo or background
            </button>
          )
        )}
        <div className="wc-hero-inner wc-paper">
          <Border id={d.border} />
          <Motif id={d.motif} className="wc-motif" size={compact ? 70 : 96} />
          {L({ k: "together", as: "p", className: "wc-eyebrow" })}
          <h1 className="wc-names">
            {T({ k: "partner1", className: "wc-name", fallback: "Partner one" })}
            <span className="wc-amp" aria-hidden>
              &amp;
            </span>
            {T({ k: "partner2", className: "wc-name", fallback: "Partner two" })}
          </h1>
          {T({ k: "headline", as: "p", className: "wc-headline", fallback: "Add a headline" })}
          {firstEvent?.date && (
            <p className="wc-date">
              <span>{formatDate(firstEvent.date, single)}</span>
              {showBoth && secondary && (
                <span className="wc-l2 wc-l2-inline" style={l2Style} lang={secondary}>
                  {formatDate(firstEvent.date, secondary)}
                </span>
              )}
            </p>
          )}
          {mainVenue && T({ k: `venues.${mainVenue.id}.name`, as: "p", className: "wc-hero-venue" })}
          {T({ k: "greeting", as: "p", className: "wc-greeting", fallback: "Add a warm greeting for your guests" })}
        </div>
      </header>

      {/* ---------- Story ---------- */}
      {(c.story || card.media.couple || editable) && (
        <section className="wc-section wc-story" id="story">
          {card.media.couple ? (
            <div className="wc-couple" style={{ aspectRatio: ASPECT[card.media.couple.aspect] }} onClick={editable ? () => onImageClick?.("couple") : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.media.couple.url} alt={title} style={imgStyle(card.media.couple)} loading="lazy" />
            </div>
          ) : (
            editable && (
              <button type="button" className="wc-img-placeholder wc-couple-ph" onClick={() => onImageClick?.("couple")}>
                + Add a couple portrait
              </button>
            )
          )}
          <div>
            {L({ k: "ourStory", as: "h2", className: "wc-h2" })}
            {T({ k: "story", as: "p", className: "wc-prose", fallback: "Share how you met" })}
          </div>
        </section>
      )}

      {/* ---------- Families ---------- */}
      {(hasFamilies || c.blessings) && (
        <section className="wc-section wc-families">
          {L({ k: "families", as: "h2", className: "wc-h2" })}
          <div className="wc-family-grid">
            {c.families
              .filter((f) => f.parents || f.grandparents || editable)
              .map((f) => (
                <div key={f.id} className="wc-family">
                  {T({ k: `families.${f.id}.label`, as: "p", className: "wc-family-label" })}
                  {T({ k: `families.${f.id}.parents`, as: "p", className: "wc-family-names", fallback: editable ? "Parents' names" : undefined })}
                  {T({ k: `families.${f.id}.grandparents`, as: "p", className: "wc-family-gp", fallback: editable ? "Grandparents' names" : undefined })}
                  {T({ k: `families.${f.id}.hometown`, as: "p", className: "wc-family-home" })}
                </div>
              ))}
          </div>
          {T({ k: "blessings", as: "p", className: "wc-blessing" })}
        </section>
      )}

      {/* ---------- Events ---------- */}
      {c.events.length > 0 && (
        <section className="wc-section" id="events">
          {L({ k: "events", as: "h2", className: "wc-h2" })}
          <ol className="wc-events">
            {c.events.map((e) => {
              const venue = c.venues.find((v) => v.id === e.venueId);
              const gcal = googleCalendarUrl(e, venue, card.timezone, title, liveUrl);
              return (
                <li key={e.id} className="wc-event wc-paper">
                  <div className="wc-event-when">
                    <span className="wc-event-day">{formatDate(e.date, single, "short")}</span>
                    <span className="wc-event-time">
                      {formatTime(e.start, single)}
                      {e.end && ` – ${formatTime(e.end, single)}`}
                    </span>
                  </div>
                  <div className="wc-event-body">
                    {T({ k: `events.${e.id}.title`, as: "h3", className: "wc-h3" })}
                    {venue && (
                      <p className="wc-event-venue">
                        {T({ k: `venues.${venue.id}.name` })}
                      </p>
                    )}
                    {T({ k: `events.${e.id}.description`, as: "p", className: "wc-event-desc" })}
                    {(e.dressCode || editable) && (
                      <p className="wc-dress">
                        <span className="wc-dress-label">{plain("dressCode")}: </span>
                        {T({ k: `events.${e.id}.dressCode`, fallback: editable ? "Add a dress code" : undefined })}
                      </p>
                    )}
                    <div className="wc-event-actions">
                      {card.slug && (
                        <a className="wc-chip" href={`/api/ics/${card.slug}?event=${e.id}`}>
                          📅 {plain("calendar")}
                        </a>
                      )}
                      {gcal && (
                        <a className="wc-chip" href={gcal} target="_blank" rel="noreferrer">
                          Google Calendar
                        </a>
                      )}
                      {venue && (
                        <a className="wc-chip" href={directionsUrl(venue)} target="_blank" rel="noreferrer">
                          📍 {plain("directions")}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ---------- Venues & maps ---------- */}
      {c.venues.length > 0 && (
        <section className="wc-section" id="venue">
          {L({ k: c.venues.length > 1 ? "venues" : "venue", as: "h2", className: "wc-h2" })}
          <div className="wc-venues">
            {c.venues.map((v) => (
              <div key={v.id} className="wc-venue wc-paper">
                <MapCard query={venueText(v)} src={mapEmbedUrl(v)} label={plain("openMap")} href={directionsUrl(v)} />
                <div className="wc-venue-text">
                  {T({ k: `venues.${v.id}.name`, as: "h3", className: "wc-h3" })}
                  {T({ k: `venues.${v.id}.address`, as: "p", className: "wc-venue-addr" })}
                  {v.landmark && (
                    <p className="wc-venue-landmark">
                      {plain("landmark")}: {T({ k: `venues.${v.id}.landmark` })}
                    </p>
                  )}
                  <a className="wc-btn" href={directionsUrl(v)} target="_blank" rel="noreferrer">
                    {plain("directions")}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Guidelines ---------- */}
      {c.guidelines.filter(Boolean).length > 0 && (
        <section className="wc-section">
          {L({ k: "guidelines", as: "h2", className: "wc-h2" })}
          <ul className="wc-guidelines">
            {c.guidelines.map((g, i) => g && <Fragment key={i}>{T({ k: `guidelines.${i}`, as: "li" })}</Fragment>)}
          </ul>
        </section>
      )}

      {/* ---------- Gallery ---------- */}
      {(card.media.gallery.length > 0 || editable) && (
        <section className="wc-section" id="gallery">
          {L({ k: "gallery", as: "h2", className: "wc-h2" })}
          <div className="wc-gallery">
            {card.media.gallery.map((g, i) => (
              <div key={g.url + i} className="wc-gallery-item" onClick={editable ? () => onImageClick?.("gallery", i) : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="" style={imgStyle(g)} loading="lazy" />
              </div>
            ))}
            {editable && (
              <button type="button" className="wc-img-placeholder wc-gallery-item" onClick={() => onImageClick?.("gallery", card.media.gallery.length)}>
                + Add photo
              </button>
            )}
          </div>
        </section>
      )}

      {/* ---------- RSVP ---------- */}
      {c.rsvp.enabled && (
        <section className="wc-section" id="rsvp">
          {L({ k: "rsvp", as: "h2", className: "wc-h2" })}
          {T({ k: "rsvp.message", as: "p", className: "wc-center" })}
          {c.rsvp.deadline && (
            <p className="wc-center wc-muted">
              {plain("rsvpBy")} {formatDate(c.rsvp.deadline, single)}
            </p>
          )}
          <RsvpForm card={card} lang={single} live={!!live} t={tSingle} />
        </section>
      )}

      {/* ---------- Closing ---------- */}
      <footer className="wc-section wc-closing">
        <Motif id={d.motif} className="wc-motif" size={64} />
        {T({ k: "closing", as: "p", className: "wc-closing-text" })}
        <p className="wc-sign">{title}</p>
        {c.hashtag && <p className="wc-hashtag">{c.hashtag}</p>}
      </footer>

      {/* ---------- Sticky guest actions ---------- */}
      <nav className="wc-bottomnav" aria-label="Guest actions">
        {mainVenue && (
          <a href={directionsUrl(mainVenue)} target="_blank" rel="noreferrer">
            <span aria-hidden>📍</span>
            {plain("directions")}
          </a>
        )}
        {c.rsvp.enabled && (
          <a href="#rsvp" className="primary">
            <span aria-hidden>✉️</span>
            {plain("rsvp")}
          </a>
        )}
        {icsAll ? (
          <a href={icsAll}>
            <span aria-hidden>📅</span>
            {plain("calendar")}
          </a>
        ) : (
          <a href="#events">
            <span aria-hidden>📅</span>
            {plain("calendar")}
          </a>
        )}
      </nav>
    </div>
  );
}

/** Lazy map: an address card that becomes an interactive embedded map on tap (keeps first load light). */
function MapCard({ src, label: text, href, query }: { src: string; label: string; href: string; query: string }) {
  const [open, setOpen] = useState(false);
  if (!query) return null;
  return open ? (
    <iframe className="wc-map" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={query} />
  ) : (
    <button type="button" className="wc-map wc-map-ph" onClick={() => setOpen(true)} aria-label={`Show map: ${query}`}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0 70 Q50 40 100 60 T200 40" stroke="currentColor" strokeOpacity=".25" strokeWidth="6" fill="none" />
        <path d="M30 0 L60 100 M140 0 L120 100" stroke="currentColor" strokeOpacity=".15" strokeWidth="4" />
      </svg>
      <span className="wc-map-pin">📍</span>
      <span className="wc-map-label">Tap to load map</span>
      <a href={href} target="_blank" rel="noreferrer" className="wc-map-open" onClick={(e) => e.stopPropagation()}>
        {text}
      </a>
    </button>
  );
}

function Editable({
  tag: Tag,
  value,
  onCommit,
  placeholder,
  className,
  style,
  lang,
  dir,
}: {
  tag: ElementType;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  lang?: string;
  dir?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref}
      className={`${className ?? ""} wc-editable`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      lang={lang}
      dir={dir}
      role="textbox"
      aria-label={placeholder}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !e.shiftKey && Tag !== "p") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          (e.currentTarget as HTMLElement).innerText = value;
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}

function RsvpForm({ card, lang, live, t }: { card: PublicCard; lang: LangCode; live: boolean; t: (k: string) => string }) {
  const r = card.content.rsvp;
  const [state, setState] = useState<"idle" | "sending" | "yes" | "no" | "error">("idle");
  const [err, setErr] = useState("");
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [events, setEvents] = useState<string[]>(card.content.events.map((e) => e.id));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"),
      attending,
      guestCount: f.get("guestCount"),
      meal: f.get("meal"),
      message: f.get("message"),
      contact: f.get("contact"),
      website: f.get("website"),
      events,
      language: lang,
    };
    if (!live || !card.slug) {
      setState(attending);
      return;
    }
    setState("sending");
    try {
      const res = await fetch(`/api/rsvp/${card.slug}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Something went wrong");
      setState(attending);
    } catch (e2) {
      setErr((e2 as Error).message);
      setState("error");
    }
  }

  if (state === "yes" || state === "no")
    return (
      <div className="wc-rsvp-done wc-paper" role="status">
        <p>{label(lang, state === "yes" ? "thanksYes" : "thanksNo")}</p>
        {!live && <p className="wc-muted">(Preview only: RSVPs are recorded once the card is published.)</p>}
        <button type="button" className="wc-link" onClick={() => setState("idle")}>
          ↺
        </button>
      </div>
    );

  return (
    <form className="wc-rsvp wc-paper" onSubmit={submit}>
      <label>
        {label(lang, "yourName")}
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <div className="wc-toggle" role="radiogroup">
        <button type="button" role="radio" aria-checked={attending === "yes"} className={attending === "yes" ? "on" : ""} onClick={() => setAttending("yes")}>
          {label(lang, "attending")}
        </button>
        <button type="button" role="radio" aria-checked={attending === "no"} className={attending === "no" ? "on" : ""} onClick={() => setAttending("no")}>
          {label(lang, "regret")}
        </button>
      </div>
      {attending === "yes" && (
        <>
          {card.content.events.length > 1 && (
            <fieldset>
              <legend>{label(lang, "whichEvents")}</legend>
              {card.content.events.map((e) => (
                <label key={e.id} className="wc-check">
                  <input type="checkbox" checked={events.includes(e.id)} onChange={(ev) => setEvents(ev.target.checked ? [...events, e.id] : events.filter((x) => x !== e.id))} />
                  {t(`events.${e.id}.title`) || e.title}
                </label>
              ))}
            </fieldset>
          )}
          <div className="wc-row">
            {r.allowGuestCount && (
              <label>
                {label(lang, "guests")}
                <select name="guestCount" defaultValue="1">
                  {Array.from({ length: r.maxGuests }, (_, i) => (
                    <option key={i}>{i + 1}</option>
                  ))}
                </select>
              </label>
            )}
            {r.mealOptions.length > 0 && (
              <label>
                {label(lang, "meal")}
                <select name="meal">
                  {r.mealOptions.map((m, i) => (
                    <option key={i} value={m}>
                      {t(`meal.${i}`) || m}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </>
      )}
      <label>
        {label(lang, "message")}
        <textarea name="message" rows={3} maxLength={1000} />
      </label>
      <label>
        {label(lang, "contact")}
        <input name="contact" maxLength={160} autoComplete="email" />
      </label>
      <input name="website" className="wc-hp" tabIndex={-1} autoComplete="off" aria-hidden />
      {state === "error" && <p className="wc-error">{err}</p>}
      <button type="submit" className="wc-btn wc-btn-lg" disabled={state === "sending"}>
        {state === "sending" ? "…" : label(lang, "send")}
      </button>
    </form>
  );
}

export function SectionNote({ children }: { children: ReactNode }) {
  return <p className="wc-muted wc-center">{children}</p>;
}
