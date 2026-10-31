"use client";

import type { CardContent, Venue, WeddingEvent } from "@/lib/types";
import { uid } from "@/lib/card";

type Section = "couple" | "events" | "venues" | "rsvp" | "guidelines";

interface Props {
  content: CardContent;
  onChange: (c: CardContent) => void;
  sections?: Section[];
}

const EVENT_PRESETS = ["Haldi", "Mehendi", "Sangeet", "Welcome Dinner", "Wedding Ceremony", "Reception", "Farewell Brunch"];

export default function DetailsForm({ content: c, onChange, sections = ["couple", "events", "venues", "rsvp", "guidelines"] }: Props) {
  const set = <K extends keyof CardContent>(k: K, v: CardContent[K]) => onChange({ ...c, [k]: v });
  const setEvent = (id: string, patch: Partial<WeddingEvent>) => set("events", c.events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const setVenue = (id: string, patch: Partial<Venue>) => set("venues", c.venues.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const addVenue = () => {
    const v: Venue = { id: uid("v"), name: "", address: "", landmark: "", mapsUrl: "" };
    onChange({ ...c, venues: [...c.venues, v] });
    return v.id;
  };
  const addEvent = (title = "") => {
    let venues = c.venues;
    if (!venues.length) venues = [{ id: uid("v"), name: "", address: "", landmark: "", mapsUrl: "" }];
    const last = c.events[c.events.length - 1];
    const e: WeddingEvent = { id: uid("e"), title, date: last?.date ?? "", start: "", end: "", dressCode: "", description: "", venueId: last?.venueId ?? venues[0].id };
    onChange({ ...c, venues, events: [...c.events, e] });
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...c.events];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("events", next);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      {sections.includes("couple") && (
        <div className="stack">
          <h3>Couple &amp; family</h3>
          <div className="grid-2">
            <label className="field">
              <span>Partner one</span>
              <input value={c.partner1} onChange={(e) => set("partner1", e.target.value)} placeholder="e.g. Aditi" required />
            </label>
            <label className="field">
              <span>Partner two</span>
              <input value={c.partner2} onChange={(e) => set("partner2", e.target.value)} placeholder="e.g. Rohan" required />
            </label>
          </div>
          {c.families.map((f, i) => (
            <div key={f.id} className="list-item">
              <div className="list-item-head">
                <input className="input" style={{ fontWeight: 600 }} value={f.label} onChange={(e) => set("families", c.families.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)))} aria-label="Family label" />
                {c.families.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => set("families", c.families.filter((x) => x.id !== f.id))} aria-label="Remove family">
                    ✕
                  </button>
                )}
              </div>
              {(["parents", "grandparents", "hometown"] as const).map((k) => (
                <label key={k} className="field">
                  <span>{k === "parents" ? "Parents' names" : k === "grandparents" ? "Grandparents' names" : "Family hometown"}</span>
                  <input
                    value={f[k]}
                    onChange={(e) => set("families", c.families.map((x) => (x.id === f.id ? { ...x, [k]: e.target.value } : x)))}
                    placeholder={k === "parents" ? (i === 0 ? "Mrs. Meera & Mr. Sanjay Sharma" : "Mrs. Priya & Mr. Anil Mehta") : k === "grandparents" ? "Smt. Kamala & Shri Ramesh Sharma" : "Jaipur"}
                  />
                </label>
              ))}
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => set("families", [...c.families, { id: uid("f"), label: "Family", parents: "", grandparents: "", hometown: "" }])}>
            + Add family
          </button>
        </div>
      )}

      {sections.includes("venues") && (
        <div className="stack">
          <h3>Venues</h3>
          {c.venues.map((v) => (
            <div key={v.id} className="list-item">
              <div className="list-item-head">
                <strong className="small">{v.name || "New venue"}</strong>
                <button type="button" className="icon-btn" aria-label="Remove venue" onClick={() => onChange({ ...c, venues: c.venues.filter((x) => x.id !== v.id), events: c.events.map((e) => (e.venueId === v.id ? { ...e, venueId: "" } : e)) })}>
                  ✕
                </button>
              </div>
              <label className="field">
                <span>Venue name</span>
                <input value={v.name} onChange={(e) => setVenue(v.id, { name: e.target.value })} placeholder="The Leela Palace" />
              </label>
              <label className="field">
                <span>Street address</span>
                <input value={v.address} onChange={(e) => setVenue(v.id, { address: e.target.value })} placeholder="Old Airport Road, Bengaluru" />
              </label>
              <div className="grid-2">
                <label className="field">
                  <span>Landmark</span>
                  <input value={v.landmark} onChange={(e) => setVenue(v.id, { landmark: e.target.value })} placeholder="Near the clock tower" />
                </label>
                <label className="field">
                  <span>Google Maps link</span>
                  <input value={v.mapsUrl} onChange={(e) => setVenue(v.id, { mapsUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" inputMode="url" />
                  <small>Optional. We build directions from the address otherwise.</small>
                </label>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={addVenue}>
            + Add venue
          </button>
        </div>
      )}

      {sections.includes("events") && (
        <div className="stack">
          <h3>Timeline &amp; events</h3>
          {c.events.map((e, i) => (
            <div key={e.id} className="event-row">
              <div className="list-item-head">
                <input className="input" style={{ fontWeight: 600 }} value={e.title} onChange={(ev) => setEvent(e.id, { title: ev.target.value })} placeholder="Event title, e.g. Sangeet" aria-label="Event title" />
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>
                  ↑
                </button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === c.events.length - 1}>
                  ↓
                </button>
                <button type="button" className="icon-btn" onClick={() => set("events", c.events.filter((x) => x.id !== e.id))} aria-label="Remove event">
                  ✕
                </button>
              </div>
              <div className="grid-3">
                <label className="field">
                  <span>Date</span>
                  <input type="date" value={e.date} onChange={(ev) => setEvent(e.id, { date: ev.target.value })} />
                </label>
                <label className="field">
                  <span>Starts</span>
                  <input type="time" value={e.start} onChange={(ev) => setEvent(e.id, { start: ev.target.value })} />
                </label>
                <label className="field">
                  <span>Ends</span>
                  <input type="time" value={e.end} onChange={(ev) => setEvent(e.id, { end: ev.target.value })} />
                </label>
              </div>
              <div className="grid-2">
                <label className="field">
                  <span>Venue</span>
                  <select value={e.venueId} onChange={(ev) => setEvent(e.id, { venueId: ev.target.value })}>
                    <option value="">Choose a venue</option>
                    {c.venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name || "Unnamed venue"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Dress code</span>
                  <input value={e.dressCode} onChange={(ev) => setEvent(e.id, { dressCode: ev.target.value })} placeholder="Festive Indian" />
                </label>
              </div>
              <label className="field">
                <span>Description</span>
                <textarea rows={2} value={e.description} onChange={(ev) => setEvent(e.id, { description: ev.target.value })} placeholder="Leave blank and AI can write one" style={{ minHeight: 60 }} />
              </label>
            </div>
          ))}
          <div className="example-chips">
            {EVENT_PRESETS.filter((p) => !c.events.some((e) => e.title === p)).map((p) => (
              <button type="button" key={p} className="chip" onClick={() => addEvent(p)}>
                + {p}
              </button>
            ))}
            <button type="button" className="chip" onClick={() => addEvent()}>
              + Custom event
            </button>
          </div>
        </div>
      )}

      {sections.includes("rsvp") && (
        <div className="stack">
          <h3>Digital RSVP</h3>
          <label className="row small" style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={c.rsvp.enabled} onChange={(e) => set("rsvp", { ...c.rsvp, enabled: e.target.checked })} style={{ width: 20, height: 20 }} />
            Collect RSVPs on the invitation
          </label>
          {c.rsvp.enabled && (
            <>
              <div className="grid-2">
                <label className="field">
                  <span>RSVP deadline</span>
                  <input type="date" value={c.rsvp.deadline} onChange={(e) => set("rsvp", { ...c.rsvp, deadline: e.target.value })} />
                </label>
                <label className="field">
                  <span>Max guests per reply</span>
                  <input type="number" min={1} max={20} value={c.rsvp.maxGuests} onChange={(e) => set("rsvp", { ...c.rsvp, maxGuests: Number(e.target.value) || 1, allowGuestCount: Number(e.target.value) > 1 })} />
                </label>
              </div>
              <label className="field">
                <span>Meal choices</span>
                <input value={c.rsvp.mealOptions.join(", ")} onChange={(e) => set("rsvp", { ...c.rsvp, mealOptions: e.target.value.split(",").map((s) => s.trimStart()) })} placeholder="Vegetarian, Non-vegetarian, Jain" />
                <small>Separate with commas. Leave empty to skip the meal question.</small>
              </label>
            </>
          )}
        </div>
      )}

      {sections.includes("guidelines") && (
        <div className="stack">
          <h3>Good to know</h3>
          {c.guidelines.map((g, i) => (
            <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
              <input className="input" value={g} onChange={(e) => set("guidelines", c.guidelines.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. Adults-only reception" />
              <button type="button" className="icon-btn" aria-label="Remove" onClick={() => set("guidelines", c.guidelines.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-sm" onClick={() => set("guidelines", [...c.guidelines, ""])}>
            + Add a note for guests
          </button>
        </div>
      )}
    </div>
  );
}
