"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, rememberCard, tokenFor } from "@/lib/client";
import { formatDate, makeT, rsvpSummary } from "@/lib/card";
import { FONT_PAIRINGS, luminance } from "@/lib/design";
import { LANGUAGES } from "@/lib/languages";
import { CTA_PRESETS, download, PRINT_SIZES, qrPdf, qrPng, qrSvg, type QrFrame, type QrOptions } from "@/lib/qr";
import type { Card, LangCode, Rsvp } from "@/lib/types";

export default function ShareKit({ id }: { id: string }) {
  const search = useSearchParams();
  const [card, setCard] = useState<Card | null>(null);
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const t = tokenFor(id);
    setToken(t);
    api<{ card: Card }>(`/api/cards/${id}`, { token: t })
      .then(({ card }) => {
        setCard(card);
        rememberCard(card);
      })
      .catch((e) => setErr((e as Error).message));
    api<{ rsvps: Rsvp[] }>(`/api/cards/${id}/rsvps`, { token: t })
      .then((r) => setRsvps(r.rsvps))
      .catch(() => undefined);
  }, [id]);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2200);
  };
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${what} copied`);
    } catch {
      flash("Copy failed. Select the text and copy it manually.");
    }
  };

  if (err)
    return (
      <div className="empty">
        <h2>We couldn&apos;t open this share kit</h2>
        <p>{err}</p>
      </div>
    );
  if (!card)
    return (
      <div className="generating">
        <div className="spinner" />
      </div>
    );
  if (card.status !== "published" || !card.slug)
    return (
      <div className="empty">
        <h2>This card isn&apos;t published yet</h2>
        <Link className="btn btn-primary" href={`/editor/${card.id}`}>
          Back to the editor
        </Link>
      </div>
    );

  const url = `${origin}/${card.slug}`;
  const names = `${card.content.partner1} & ${card.content.partner2}`;

  return (
    <>
      {search.get("new") && (
        <div className="success-banner" role="status">
          <span style={{ fontSize: 34 }} aria-hidden>
            🎉
          </span>
          <div>
            <b>Your wedding card is live!</b>
            <div className="muted small">Share the link, print the QR code, and keep editing any time. The address never changes.</div>
          </div>
        </div>
      )}
      <div className="page-head row">
        <div>
          <h1>Share kit</h1>
          <p className="muted" style={{ margin: 0 }}>
            {names}
          </p>
        </div>
        <span className="spacer" />
        <Link className="btn" href={`/editor/${card.id}`}>
          ✏️ Edit card
        </Link>
        <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer">
          Open live page ↗
        </a>
      </div>
      <div className="share-grid">
        <section className="panel share-card">
          <h2>Your live link</h2>
          <div className="url-box">
            <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Live link" />
            <button className="btn btn-primary" onClick={() => copy(url, "Link")}>
              Copy
            </button>
          </div>
          <div className="og-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/${card.slug}/opengraph-image`} alt="Link preview card shown in WhatsApp, iMessage and Facebook" />
            <div>
              <strong>{names} are getting married</strong>
              <div className="muted tiny">{origin.replace(/^https?:\/\//, "")}</div>
            </div>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            This is how your link looks when shared in WhatsApp, iMessage, Instagram and Facebook.
          </p>
        </section>

        <QrStudio card={card} url={url} />

        <Messages card={card} url={url} copy={copy} />

        <RsvpPanel card={card} rsvps={rsvps} token={token} />

        <section className="panel share-card">
          <h2>Edit from another device</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Your card is linked to this browser. Use this private link to edit on your phone or let a wedding planner help. Keep it secret: anyone with it can edit the card.
          </p>
          <button className="btn" onClick={() => copy(`${origin}/editor/${card.id}#t=${token}`, "Private edit link")}>
            🔒 Copy private edit link
          </button>
        </section>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function QrStudio({ card, url }: { card: Card; url: string }) {
  const pair = FONT_PAIRINGS[card.design.fontPairing];
  const p = card.design.palette;
  const darkDefault = luminance(p.primary) > 0.3 ? "#1a1a1a" : p.primary;
  const [frame, setFrame] = useState<QrFrame>("ornate");
  const [cta, setCta] = useState(CTA_PRESETS[0]);
  const [sizeId, setSizeId] = useState<(typeof PRINT_SIZES)[number]["id"]>("3in");
  const [dark, setDark] = useState(darkDefault);
  const [busy, setBusy] = useState("");
  const first = [...card.content.events].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const size = PRINT_SIZES.find((s) => s.id === sizeId)!;
  const opts: QrOptions = {
    url,
    dark,
    light: "#ffffff",
    accent: p.accent,
    frame,
    cta,
    names: `${card.content.partner1} & ${card.content.partner2}`,
    date: first ? formatDate(first.date, "en") : "",
    headingFont: pair.heading,
    bodyFont: pair.body,
    size,
  };
  const svg = useMemo(() => qrSvg(opts), [JSON.stringify(opts)]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = `${card.slug}-qr-${size.id}`;

  const run = async (kind: "png" | "pdf" | "svg") => {
    setBusy(kind);
    try {
      if (kind === "svg") download(new Blob([svg], { type: "image/svg+xml" }), `${base}.svg`);
      if (kind === "png") download(await qrPng(opts), `${base}.png`);
      if (kind === "pdf") download(await qrPdf(opts), `${base}.pdf`);
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="panel share-card">
      <h2>QR code studio</h2>
      <div className="qr-stage" dangerouslySetInnerHTML={{ __html: svg.replace(/width="[^"]+in" height="[^"]+in"/, 'width="260"') }} />
      <div className="seg" role="group" aria-label="Frame">
        {(["plain", "classic", "ornate"] as QrFrame[]).map((f) => (
          <button key={f} className={frame === f ? "on" : ""} onClick={() => setFrame(f)} style={{ textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>
      {frame !== "plain" && (
        <label className="field">
          <span>Call to action</span>
          <input list="cta-presets" value={cta} onChange={(e) => setCta(e.target.value.slice(0, 60))} />
          <datalist id="cta-presets">
            {CTA_PRESETS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      )}
      <div className="grid-2">
        <label className="field">
          <span>Print size</span>
          <select value={sizeId} onChange={(e) => setSizeId(e.target.value as typeof sizeId)}>
            {PRINT_SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>QR colour</span>
          <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} style={{ padding: 4 }} />
        </label>
      </div>
      <div className="share-buttons">
        <button className="btn" onClick={() => run("png")} disabled={!!busy}>
          {busy === "png" ? "…" : "PNG · 300 DPI"}
        </button>
        <button className="btn" onClick={() => run("pdf")} disabled={!!busy}>
          {busy === "pdf" ? "…" : "PDF · print"}
        </button>
        <button className="btn" onClick={() => run("svg")} disabled={!!busy}>
          SVG · vector
        </button>
      </div>
      <p className="tiny muted" style={{ margin: 0 }}>
        Uses high error correction so it still scans when printed small. Light QR colours scan poorly, so keep it dark on white.
      </p>
    </section>
  );
}

function messageFor(card: Card, url: string, lang: LangCode): { subject: string; body: string } {
  const t = makeT(card, lang);
  const c = card.content;
  const first = [...c.events].filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date))[0];
  const names = `${t("partner1") || c.partner1} & ${t("partner2") || c.partner2}`;
  const greeting = t("greeting") || c.greeting;
  const when = first ? formatDate(first.date, lang) : "";
  const body = [`💌 ${names}`, greeting, when && `🗓️ ${when}`, `${url}`].filter(Boolean).join("\n\n");
  return { subject: `${c.partner1} & ${c.partner2}: wedding invitation`, body };
}

function Messages({ card, url, copy }: { card: Card; url: string; copy: (t: string, w: string) => void }) {
  const langs: LangCode[] = [card.language.primary, ...(card.language.secondary ? [card.language.secondary] : [])];
  const [lang, setLang] = useState<LangCode>(langs[0]);
  const initial = messageFor(card, url, lang);
  const [body, setBody] = useState(initial.body);
  useEffect(() => setBody(messageFor(card, url, lang).body), [lang, card, url]);
  const enc = encodeURIComponent;
  return (
    <section className="panel share-card">
      <h2>Send to guests</h2>
      {langs.length > 1 && (
        <div className="seg" role="group" aria-label="Message language">
          {langs.map((l) => (
            <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>
              {LANGUAGES[l].native}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Message</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} lang={lang} dir={LANGUAGES[lang].dir} />
      </label>
      <div className="share-buttons">
        <a className="btn" href={`https://wa.me/?text=${enc(body)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className="btn" href={`sms:?&body=${enc(body)}`}>
          SMS
        </a>
        <a className="btn" href={`mailto:?subject=${enc(initial.subject)}&body=${enc(body)}`}>
          Email
        </a>
        <button className="btn" onClick={() => copy(body, "Message")}>
          Copy
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button className="btn" onClick={() => navigator.share({ title: initial.subject, text: body }).catch(() => undefined)}>
            More…
          </button>
        )}
      </div>
    </section>
  );
}

function RsvpPanel({ card, rsvps, token }: { card: Card; rsvps: Rsvp[]; token: string }) {
  const s = rsvpSummary(rsvps);
  const events = new Map(card.content.events.map((e) => [e.id, e.title]));
  const csv = async () => {
    const res = await fetch(`/api/cards/${card.id}/rsvps?format=csv`, { headers: { "x-edit-token": token } });
    download(await res.blob(), `rsvps-${card.slug}.csv`);
  };
  return (
    <section className="panel share-card" style={{ gridColumn: "1 / -1" }}>
      <div className="row">
        <h2>RSVPs</h2>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button className="btn btn-sm" onClick={csv} disabled={!rsvps.length}>
          Download CSV
        </button>
      </div>
      <div className="stats">
        <div className="stat">
          <b>{s.responses}</b>
          <span>Responses</span>
        </div>
        <div className="stat">
          <b>{s.attending}</b>
          <span>Attending</span>
        </div>
        <div className="stat">
          <b>{s.declined}</b>
          <span>Declined</span>
        </div>
        <div className="stat">
          <b>{s.headcount}</b>
          <span>Headcount</span>
        </div>
      </div>
      {rsvps.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>
          No replies yet. They&apos;ll appear here as guests respond.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Reply</th>
                <th>Guests</th>
                <th>Meal</th>
                <th>Events</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {[...rsvps].reverse().map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    {r.contact && <div className="tiny muted">{r.contact}</div>}
                  </td>
                  <td>{r.attending === "yes" ? <span className="pill pill-ok">Attending</span> : <span className="pill">Declined</span>}</td>
                  <td>{r.guestCount || "–"}</td>
                  <td>{r.meal || "–"}</td>
                  <td className="small">{r.events.map((e) => events.get(e) ?? e).join(", ") || "–"}</td>
                  <td className="small">{r.message || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
