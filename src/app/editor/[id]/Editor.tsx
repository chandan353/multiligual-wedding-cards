"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CardView, { defaultView, type ImageSlot, type ViewLang } from "@/components/CardView";
import DetailsForm from "@/components/DetailsForm";
import { BACKGROUNDS, Cropper, uploadImage } from "@/components/ImageTools";
import { flattenTranslatable, missingTranslations, setByKey, toPublic } from "@/lib/card";
import { api, rememberCard, tokenFor } from "@/lib/client";
import { ACCENT_SWATCHES, BORDERS, FONT_PAIRINGS, MOTIFS, TEXTURES } from "@/lib/design";
import { googleFontsHref, LANGUAGES, LANGUAGE_CODES } from "@/lib/languages";
import { suggestSlug, validateSlug } from "@/lib/slug";
import { TEMPLATES } from "@/lib/templates";
import { switchTemplate } from "@/lib/apply";
import type { Card, Design, ImageAsset, LangCode, Palette, Tone } from "@/lib/types";

type Tab = "details" | "design" | "language" | "photos" | "ai";
type SaveState = "saved" | "saving" | "error" | "idle";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "details", label: "Details", icon: "📝" },
  { id: "design", label: "Design", icon: "🎨" },
  { id: "language", label: "Language", icon: "文A" },
  { id: "photos", label: "Photos", icon: "🖼️" },
  { id: "ai", label: "AI", icon: "✨" },
];

const HISTORY_LIMIT = 100;

export default function Editor({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [token, setToken] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [tab, setTab] = useState<Tab>("details");
  const [mode, setMode] = useState<"editor" | "guest">("editor");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [view, setView] = useState<ViewLang>("en");
  const [save, setSave] = useState<SaveState>("idle");
  const [toast, setToast] = useState("");
  const [aiOn, setAiOn] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);
  const [imageSlot, setImageSlot] = useState<{ slot: ImageSlot; index?: number } | null>(null);

  // ---- history (undo / redo) ----
  const past = useRef<Card[]>([]);
  const future = useRef<Card[]>([]);
  const lastGroup = useRef<{ key: string; at: number } | null>(null);
  const [, force] = useState(0);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2600);
  };

  useEffect(() => {
    const t = tokenFor(id);
    setToken(t);
    api<{ ai: boolean }>("/api/status").then((s) => setAiOn(s.ai)).catch(() => undefined);
    api<{ card: Card }>(`/api/cards/${id}`, { token: t })
      .then(({ card }) => {
        setCard(card);
        rememberCard(card);
        setView(defaultView(toPublic(card)));
        if (search.get("generated")) {
          setTab("ai");
          flash("Your invitation is ready. Review it and make any changes.");
        }
      })
      .catch((e) => setLoadErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Apply a change. Typing in the same field within 1.2s is grouped into one undo step. */
  const commit = useCallback((next: Card | ((c: Card) => Card), group?: string) => {
    setCard((cur) => {
      if (!cur) return cur;
      const value = typeof next === "function" ? next(cur) : next;
      const now = Date.now();
      const sameGroup = group && lastGroup.current?.key === group && now - lastGroup.current.at < 1200;
      if (!sameGroup) {
        past.current = [...past.current.slice(-HISTORY_LIMIT + 1), cur];
        future.current = [];
      }
      lastGroup.current = group ? { key: group, at: now } : null;
      return value;
    });
    force((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    setCard((cur) => {
      const prev = past.current.pop();
      if (!cur || !prev) return cur;
      future.current.push(cur);
      return prev;
    });
    lastGroup.current = null;
    force((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    setCard((cur) => {
      const nxt = future.current.pop();
      if (!cur || !nxt) return cur;
      past.current.push(cur);
      return nxt;
    });
    lastGroup.current = null;
    force((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ---- autosave ----
  const savedJson = useRef("");
  const saving = useRef<Promise<void> | null>(null);
  const payload = (c: Card) => JSON.stringify({ templateId: c.templateId, timezone: c.timezone, content: c.content, design: c.design, media: c.media, language: c.language });

  const persist = useCallback(
    async (c: Card) => {
      const body = payload(c);
      if (body === savedJson.current) return;
      setSave("saving");
      const run = (async () => {
        try {
          const res = await api<{ card: Card }>(`/api/cards/${c.id}`, { method: "PUT", token, body: JSON.parse(body) });
          savedJson.current = body;
          rememberCard(res.card);
          setSave("saved");
        } catch {
          setSave("error");
        }
      })();
      saving.current = run;
      await run;
    },
    [token],
  );

  useEffect(() => {
    if (!card) return;
    if (!savedJson.current) {
      savedJson.current = payload(card);
      return;
    }
    const t = window.setTimeout(() => persist(card), 1500);
    return () => window.clearTimeout(t);
  }, [card, persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (card && payload(card) !== savedJson.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [card]);

  /** Save pending edits before a server-side action reads the card. */
  const flush = async () => {
    if (card) await persist(card);
  };
  /** Accept a card returned by the server as the new state (undoable). */
  const acceptServer = (c: Card) => {
    commit(c);
    savedJson.current = payload(c);
    rememberCard(c);
  };

  const publicCard = useMemo(() => (card ? toPublic(card) : null), [card]);
  const fontsHref = useMemo(() => (card ? googleFontsHref([card.language.secondary ? LANGUAGES[card.language.secondary].serif : "", card.language.secondary ? LANGUAGES[card.language.secondary].sans : ""]) : ""), [card]);

  if (loadErr)
    return (
      <main className="container empty">
        <h2>We couldn&apos;t open this card</h2>
        <p>{loadErr}</p>
        <p className="small">Cards are tied to the browser that created them. Open the private edit link from your share page to edit on another device.</p>
        <Link className="btn" href="/my-cards">
          My cards
        </Link>
      </main>
    );
  if (!card || !publicCard)
    return (
      <div className="generating">
        <div className="spinner" />
      </div>
    );

  const setDesign = (patch: Partial<Design>, group?: string) => commit((c) => ({ ...c, design: { ...c.design, ...patch } }), group);
  const setPalette = (patch: Partial<Palette>, group?: string) => commit((c) => ({ ...c, design: { ...c.design, palette: { ...c.design.palette, ...patch } } }), group);

  const onEdit = (key: string, lang: LangCode, value: string) => {
    commit((c) => {
      if (lang === c.language.primary) return { ...c, content: setByKey(c.content, key, value) };
      const ov = { ...(c.language.overrides[lang] ?? {}), [key]: value };
      return { ...c, language: { ...c.language, overrides: { ...c.language.overrides, [lang]: ov } } };
    });
  };

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;
  const liveUrl = card.slug ? `${window.location.origin}/${card.slug}` : "";

  return (
    <div className="editor">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      <aside className="editor-side" aria-label="Editing tools">
        <div className="editor-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="editor-panel" role="tabpanel">
          {tab === "details" && (
            <>
              <p className="tiny muted" style={{ margin: 0 }}>
                Tip: you can also tap any text on the card to edit it in place.
              </p>
              <DetailsForm content={card.content} onChange={(content) => commit((c) => ({ ...c, content }), "details")} />
              <label className="field">
                <span>Time zone for event times</span>
                <input value={card.timezone} onChange={(e) => commit((c) => ({ ...c, timezone: e.target.value }), "tz")} placeholder="Asia/Kolkata" />
                <small>Used for calendar invites. Example: Asia/Kolkata, Europe/London, America/New_York.</small>
              </label>
            </>
          )}
          {tab === "design" && <DesignPanel card={card} setDesign={setDesign} setPalette={setPalette} onTemplate={(tid) => commit((c) => switchTemplate(c, tid))} />}
          {tab === "language" && (
            <LanguagePanel
              card={card}
              aiOn={aiOn}
              commit={commit}
              setView={setView}
              translate={async (lang, onlyMissing) => {
                await flush();
                const res = await api<{ card: Card; translated: number }>(`/api/cards/${card.id}/translate`, { token, body: { lang, onlyMissing } });
                acceptServer(res.card);
                setView("both");
                flash(`Translated ${res.translated} phrases into ${LANGUAGES[lang].name}.`);
              }}
            />
          )}
          {tab === "photos" && <PhotosPanel card={card} token={token} commit={commit} flash={flash} focus={imageSlot} />}
          {tab === "ai" && (
            <AiPanel
              card={card}
              aiOn={aiOn}
              commit={commit}
              regenerate={async (opts) => {
                await flush();
                const res = await api<{ card: Card; rationale: string }>(`/api/cards/${card.id}/generate`, { token, body: opts });
                acceptServer(res.card);
                if (res.card.language.secondary && aiOn) {
                  const sec = res.card.language.secondary;
                  try {
                    const tr = await api<{ card: Card }>(`/api/cards/${card.id}/translate`, { token, body: { lang: sec } });
                    acceptServer(tr.card);
                  } catch {
                    /* translation optional */
                  }
                }
                flash("New variation ready. Use Undo to go back.");
              }}
            />
          )}
        </div>
      </aside>

      <section className="editor-main">
        <div className="editor-toolbar">
          <button className="btn btn-sm" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            ↶
          </button>
          <button className="btn btn-sm" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            ↷
          </button>
          <div className="seg" role="group" aria-label="View">
            <button className={mode === "editor" ? "on" : ""} onClick={() => setMode("editor")}>
              Editor
            </button>
            <button className={mode === "guest" ? "on" : ""} onClick={() => setMode("guest")}>
              Guest view
            </button>
          </div>
          <div className="seg" role="group" aria-label="Device">
            <button className={device === "mobile" ? "on" : ""} onClick={() => setDevice("mobile")} aria-label="Mobile preview">
              📱
            </button>
            <button className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")} aria-label="Desktop preview">
              🖥️
            </button>
          </div>
          <span className="save-state" role="status">
            <span className={`save-dot ${save === "saving" ? "saving" : save === "error" ? "error" : ""}`} />
            {save === "saving" ? "Saving…" : save === "error" ? "Not saved, retrying on next change" : "All changes saved"}
          </span>
          <span className="spacer" />
          {card.status === "published" && (
            <a className="btn btn-sm" href={`/${card.slug}`} target="_blank" rel="noreferrer">
              View live ↗
            </a>
          )}
          {card.status === "published" ? (
            <Link className="btn btn-sm btn-primary" href={`/share/${card.id}`} onClick={() => flush()}>
              Share kit
            </Link>
          ) : (
            <button
              className="btn btn-sm btn-primary"
              onClick={async () => {
                await flush();
                setPublishOpen(true);
              }}
            >
              Publish Wedding Card
            </button>
          )}
        </div>
        <div className="canvas-wrap">
          {card.status === "published" && mode === "editor" && (
            <p className="notice ok small" style={{ maxWidth: 1000, margin: "0 auto 12px" }}>
              This card is live at <a href={`/${card.slug}`}>/{card.slug}</a>. Changes you make here appear on the live page as soon as they save, and the link and QR code stay the same.
            </p>
          )}
          <div className={`canvas ${device}`}>
            <CardView
              key={mode}
              card={publicCard}
              compact
              liveUrl={liveUrl}
              view={view}
              onViewChange={setView}
              editable={mode === "editor"}
              onEdit={onEdit}
              onImageClick={(slot, index) => {
                setImageSlot({ slot, index });
                setTab("photos");
              }}
            />
          </div>
        </div>
      </section>

      {publishOpen && (
        <PublishDialog
          card={card}
          onClose={() => setPublishOpen(false)}
          onPublish={async (slug) => {
            const res = await api<{ card: Card }>(`/api/cards/${card.id}/publish`, { token, body: { slug } });
            acceptServer(res.card);
            router.push(`/share/${card.id}?new=1`);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Design

function DesignPanel({ card, setDesign, setPalette, onTemplate }: { card: Card; setDesign: (p: Partial<Design>, g?: string) => void; setPalette: (p: Partial<Palette>, g?: string) => void; onTemplate: (id: string) => void }) {
  const d = card.design;
  return (
    <>
      <div className="stack">
        <h3>Template</h3>
        <select className="input" value={card.templateId} onChange={(e) => onTemplate(e.target.value)} aria-label="Template">
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.category}
            </option>
          ))}
        </select>
        <p className="tiny muted" style={{ margin: 0 }}>
          Switching template restyles the card and keeps all your words and photos.
        </p>
      </div>
      <div className="stack">
        <h3>Typography</h3>
        <div className="opt-grid">
          {Object.values(FONT_PAIRINGS).map((p) => (
            <button key={p.id} className={`opt ${d.fontPairing === p.id ? "on" : ""}`} onClick={() => setDesign({ fontPairing: p.id })}>
              <span style={{ fontFamily: `"${p.heading}"`, fontSize: 20, textTransform: p.headingCase ?? "none" }}>Aa</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="stack">
        <h3>Accent colour</h3>
        <div className="swatch-row">
          {ACCENT_SWATCHES.map((c) => (
            <button key={c} className={`swatch ${d.palette.accent === c ? "on" : ""}`} style={{ background: c }} onClick={() => setPalette({ accent: c })} aria-label={`Accent ${c}`} />
          ))}
          <label className="swatch" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)", position: "relative", overflow: "hidden" }} title="Custom colour">
            <input type="color" value={d.palette.accent} onChange={(e) => setPalette({ accent: e.target.value }, "accent")} style={{ opacity: 0, position: "absolute", inset: 0, cursor: "pointer" }} aria-label="Custom accent colour" />
          </label>
        </div>
      </div>
      <div className="stack">
        <div className="range">
          <div className="range-head">
            <span>Colour warmth</span>
            <span>{d.warmth > 0 ? "Warmer" : d.warmth < 0 ? "Cooler" : "Neutral"}</span>
          </div>
          <input type="range" min={-50} max={50} value={d.warmth} onChange={(e) => setDesign({ warmth: Number(e.target.value) }, "warmth")} />
        </div>
        <div className="range">
          <div className="range-head">
            <span>Text size</span>
            <span>{Math.round(d.fontScale * 100)}%</span>
          </div>
          <input type="range" min={0.85} max={1.25} step={0.01} value={d.fontScale} onChange={(e) => setDesign({ fontScale: Number(e.target.value) }, "fontScale")} />
        </div>
        <div className="range">
          <div className="range-head">
            <span>Spacing</span>
            <span>{Math.round(d.spacing * 100)}%</span>
          </div>
          <input type="range" min={0.8} max={1.4} step={0.01} value={d.spacing} onChange={(e) => setDesign({ spacing: Number(e.target.value) }, "spacing")} />
        </div>
      </div>
      <OptionGroup title="Background texture" options={TEXTURES} value={d.texture} onPick={(v) => setDesign({ texture: v as Design["texture"] })} />
      <OptionGroup title="Decorative border" options={BORDERS} value={d.border} onPick={(v) => setDesign({ border: v as Design["border"] })} />
      <OptionGroup title="Motif" options={MOTIFS} value={d.motif} onPick={(v) => setDesign({ motif: v as Design["motif"] })} />
      <OptionGroup title="Layout" options={{ centered: { name: "Centered" }, split: { name: "Side by side" }, framed: { name: "Framed" } }} value={d.layout} onPick={(v) => setDesign({ layout: v as Design["layout"] })} />
      <details className="advanced">
        <summary>Advanced: custom colour codes</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          {(Object.keys(d.palette) as (keyof Palette)[]).map((k) => (
            <label key={k} className="row" style={{ flexWrap: "nowrap" }}>
              <input type="color" value={d.palette[k]} onChange={(e) => setPalette({ [k]: e.target.value }, `pal-${k}`)} aria-label={`${k} colour`} style={{ width: 44, height: 36, border: 0, background: "none" }} />
              <span className="small" style={{ width: 90, textTransform: "capitalize" }}>
                {k}
              </span>
              <input
                className="input"
                defaultValue={d.palette[k]}
                key={d.palette[k]}
                onBlur={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setPalette({ [k]: e.target.value })}
                style={{ fontFamily: "ui-monospace, monospace" }}
                aria-label={`${k} hex code`}
              />
            </label>
          ))}
          <p className="tiny muted" style={{ margin: 0 }}>
            Text colour is automatically adjusted if it would be hard to read on the background.
          </p>
        </div>
      </details>
    </>
  );
}

function OptionGroup({ title, options, value, onPick }: { title: string; options: Record<string, { name: string }>; value: string; onPick: (v: string) => void }) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      <div className="opt-grid">
        {Object.entries(options).map(([k, o]) => (
          <button key={k} className={`opt ${value === k ? "on" : ""}`} onClick={() => onPick(k)} aria-pressed={value === k}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Language

function LanguagePanel({ card, aiOn, commit, setView, translate }: { card: Card; aiOn: boolean; commit: (fn: (c: Card) => Card, g?: string) => void; setView: (v: ViewLang) => void; translate: (lang: LangCode, onlyMissing: boolean) => Promise<void> }) {
  const sec = card.language.secondary;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const missing = sec ? missingTranslations(card, sec) : [];
  const source = flattenTranslatable(card.content);

  const run = async (onlyMissing: boolean) => {
    if (!sec) return;
    setBusy(true);
    setErr("");
    try {
      await translate(sec, onlyMissing);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="stack">
        <h3>Languages</h3>
        <label className="field">
          <span>Primary language</span>
          <input value="English" disabled />
        </label>
        <label className="field">
          <span>Second language</span>
          <select
            value={sec ?? ""}
            onChange={(e) => {
              const v = (e.target.value || null) as LangCode | null;
              commit((c) => ({ ...c, language: { ...c.language, secondary: v } }));
              setView(v ? "both" : "en");
            }}
          >
            <option value="">None (English only)</option>
            {LANGUAGE_CODES.filter((l) => l !== "en").map((l) => (
              <option key={l} value={l}>
                {LANGUAGES[l].name} · {LANGUAGES[l].native}
              </option>
            ))}
          </select>
        </label>
      </div>
      {sec && (
        <>
          <div className="stack">
            <h3>How guests see it</h3>
            <div className="opt-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <button className={`opt ${card.language.mode === "bilingual" ? "on" : ""}`} onClick={() => commit((c) => ({ ...c, language: { ...c.language, mode: "bilingual" } }))}>
                <strong>Side by side</strong>
                <span className="tiny">Both languages together</span>
              </button>
              <button className={`opt ${card.language.mode === "toggle" ? "on" : ""}`} onClick={() => commit((c) => ({ ...c, language: { ...c.language, mode: "toggle" } }))}>
                <strong>One at a time</strong>
                <span className="tiny">Guests switch with a tap</span>
              </button>
            </div>
            <p className="tiny muted" style={{ margin: 0 }}>
              Either way, a floating language button lets every guest choose {LANGUAGES[sec].native}, English or both.
            </p>
          </div>
          <div className="stack">
            <h3>Translation</h3>
            <p className="small" style={{ margin: 0 }}>
              {missing.length === 0 ? (
                <span className="pill pill-ok">✓ Everything is translated</span>
              ) : (
                <span className="pill pill-warn">{missing.length} phrases still need translating</span>
              )}
            </p>
            {!aiOn && <p className="notice small">AI translation needs ANTHROPIC_API_KEY on the server. Built-in labels (RSVP, Directions…) are already translated; you can type your own translations below.</p>}
            <div className="row">
              <button className="btn btn-primary" disabled={busy || !aiOn} onClick={() => run(missing.length > 0 && missing.length < Object.keys(source).length)}>
                {busy ? "Translating…" : missing.length ? `Translate into ${LANGUAGES[sec].name}` : "Re-translate everything"}
              </button>
            </div>
            {err && <p className="notice err small">{err}</p>}
            <p className="tiny muted" style={{ margin: 0 }}>
              Translations keep ceremony names, honorifics and family terms culturally correct. Names and addresses are written in {LANGUAGES[sec].script} script.
            </p>
          </div>
          <details className="advanced">
            <summary>Advanced: phrase-by-phrase overrides</summary>
            <div className="stack" style={{ marginTop: 12 }}>
              <p className="tiny muted" style={{ margin: 0 }}>
                Your wording always wins over the AI translation. Clear a box to go back to the AI version.
              </p>
              {Object.entries(source).map(([k, text]) => {
                const ov = card.language.overrides[sec]?.[k];
                const tr = card.language.translations[sec]?.[k] ?? "";
                return (
                  <label key={k} className="field">
                    <span className="tiny muted" style={{ fontWeight: 500 }}>
                      {text.length > 80 ? text.slice(0, 78) + "…" : text}
                    </span>
                    <textarea
                      rows={text.length > 60 ? 3 : 1}
                      style={{ minHeight: 44 }}
                      lang={sec}
                      dir={LANGUAGES[sec].dir}
                      value={ov ?? tr}
                      placeholder={`${LANGUAGES[sec].name} text`}
                      onChange={(e) =>
                        commit((c) => {
                          const cur = { ...(c.language.overrides[sec] ?? {}) };
                          if (e.target.value) cur[k] = e.target.value;
                          else delete cur[k];
                          return { ...c, language: { ...c.language, overrides: { ...c.language.overrides, [sec]: cur } } };
                        }, `ov-${k}`)
                      }
                    />
                  </label>
                );
              })}
            </div>
          </details>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Photos

function PhotosPanel({ card, token, commit, flash, focus }: { card: Card; token: string; commit: (fn: (c: Card) => Card, g?: string) => void; flash: (m: string) => void; focus: { slot: ImageSlot; index?: number } | null }) {
  const [busy, setBusy] = useState<string>("");
  const setSlot = (slot: "hero" | "couple", v: ImageAsset | null, group?: string) => commit((c) => ({ ...c, media: { ...c.media, [slot]: v } }), group);

  const upload = async (file: File | undefined, onUrl: (url: string) => void, key: string) => {
    if (!file) return;
    setBusy(key);
    try {
      onUrl(await uploadImage(file, card.id, token));
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const slotBlock = (slot: "hero" | "couple", title: string, defaultAspect: ImageAsset["aspect"]) => {
    const img = card.media[slot];
    return (
      <div className="stack" style={focus?.slot === slot ? { outline: "2px solid var(--brand)", outlineOffset: 6, borderRadius: 8 } : undefined}>
        <h3>{title}</h3>
        {img && <Cropper value={img} onChange={(v) => setSlot(slot, v, `crop-${slot}`)} lockAspect={slot === "hero"} />}
        <div className="row">
          <label className="btn btn-sm">
            {busy === slot ? "Uploading…" : img ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0], (url) => setSlot(slot, { url, focalX: 50, focalY: 40, zoom: 1, aspect: defaultAspect }), slot)} />
          </label>
          {img && (
            <button className="btn btn-sm btn-ghost" onClick={() => setSlot(slot, null)}>
              Remove
            </button>
          )}
        </div>
        {slot === "hero" && (
          <>
            <p className="tiny muted" style={{ margin: 0 }}>
              Or pick a royalty-free background:
            </p>
            <div className="bg-gallery">
              {BACKGROUNDS.map((b) => (
                <button key={b.id} style={{ backgroundImage: `url(/backgrounds/${b.id}.svg)` }} title={b.name} aria-label={b.name} onClick={() => setSlot("hero", { url: `/backgrounds/${b.id}.svg`, focalX: 50, focalY: 50, zoom: 1, aspect: "16:9" })} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {slotBlock("hero", "Hero image", "16:9")}
      {slotBlock("couple", "Couple portrait", "4:5")}
      <div className="stack">
        <h3>Gallery</h3>
        <div className="bg-gallery">
          {card.media.gallery.map((g, i) => (
            <div key={g.url + i} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10 }} />
              <button className="icon-btn" style={{ position: "absolute", top: 2, right: 2, background: "#fff" }} aria-label="Remove photo" onClick={() => commit((c) => ({ ...c, media: { ...c.media, gallery: c.media.gallery.filter((_, j) => j !== i) } }))}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <label className="btn btn-sm">
          {busy === "gallery" ? "Uploading…" : "+ Add photos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 12);
              for (const f of files) await upload(f, (url) => commit((c) => ({ ...c, media: { ...c.media, gallery: [...c.media.gallery, { url, focalX: 50, focalY: 50, zoom: 1, aspect: "1:1" }] } })), "gallery");
            }}
          />
        </label>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- AI

function AiPanel({ card, aiOn, commit, regenerate }: { card: Card; aiOn: boolean; commit: (fn: (c: Card) => Card, g?: string) => void; regenerate: (o: { tone: Tone; variant: number; newColors?: boolean; keepTemplate?: boolean }) => Promise<void> }) {
  const [tone, setTone] = useState<Tone>(card.ai?.tone ?? "heartfelt");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [keepTemplate, setKeepTemplate] = useState(card.flow === "template");
  const variant = (card.ai?.variant ?? 0) + 1;

  const go = async (key: string, opts: { newColors?: boolean }) => {
    setBusy(key);
    setErr("");
    try {
      await regenerate({ tone, variant, keepTemplate, ...opts });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      {card.ai?.rationale && (
        <div className="ai-rationale">
          <strong>Why this design:</strong> {card.ai.rationale}
        </div>
      )}
      {!aiOn && <p className="notice small">Running on the offline style engine. Add ANTHROPIC_API_KEY on the server for fully personalised AI writing.</p>}
      <div className="stack">
        <h3>Tone</h3>
        <div className="tone-picker">
          {(["formal", "heartfelt", "playful"] as Tone[]).map((t) => (
            <button key={t} className={tone === t ? "on" : ""} onClick={() => setTone(t)} style={{ textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="stack">
        <button className="btn btn-primary btn-lg" disabled={!!busy} onClick={() => go("regen", {})}>
          {busy === "regen" ? "Writing…" : "⚡ Quick Regenerate"}
        </button>
        <button className="btn" disabled={!!busy} onClick={() => go("colors", { newColors: true })}>
          {busy === "colors" ? "Mixing colours…" : "🎨 Try a new colour scheme"}
        </button>
        <label className="row small">
          <input type="checkbox" checked={keepTemplate} onChange={(e) => setKeepTemplate(e.target.checked)} style={{ width: 18, height: 18 }} />
          Keep my current template
        </label>
        <p className="tiny muted" style={{ margin: 0 }}>
          Regenerating rewrites the greeting, story and event descriptions. Your names, dates and venues never change, and Undo brings back the previous version.
        </p>
        {err && <p className="notice err small">{err}</p>}
      </div>
      <label className="field notes-box">
        <span>Open notes for the AI</span>
        <textarea value={card.content.notes} onChange={(e) => commit((c) => ({ ...c, content: { ...c.content, notes: e.target.value } }), "notes")} placeholder="Your story, theme, customs, guidelines…" />
        <small>Private: guests never see these notes.</small>
      </label>
    </>
  );
}

// ---------------------------------------------------------------- Publish

function PublishDialog({ card, onClose, onPublish }: { card: Card; onClose: () => void; onPublish: (slug: string) => Promise<void> }) {
  const [slug, setSlug] = useState(card.slug ?? suggestSlug(card.content.partner1, card.content.partner2));
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const local = validateSlug(slug);
    if (local) return setStatus({ ok: false, msg: local });
    const t = window.setTimeout(async () => {
      const r = await api<{ available: boolean; reason?: string }>(`/api/slug-check?slug=${encodeURIComponent(slug)}&cardId=${card.id}`).catch(() => null);
      if (r) setStatus({ ok: r.available, msg: r.available ? "Available" : r.reason || "Taken" });
    }, 300);
    return () => window.clearTimeout(t);
  }, [slug, card.id]);

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Publish" onClick={onClose}>
      <div className="panel modal small-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong style={{ fontSize: 18 }}>Publish your wedding card</strong>
        </div>
        <div className="modal-body stack">
          <label className="field">
            <span>Choose your permanent link</span>
            <div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
              <span className="muted small" style={{ whiteSpace: "nowrap" }}>
                {typeof window !== "undefined" ? window.location.host : ""}/
              </span>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} maxLength={48} autoFocus />
            </div>
            {status && <small style={{ color: status.ok ? "var(--ok)" : "#b00020" }}>{status.ok ? "✓ " : ""}{status.msg}</small>}
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            The link can&apos;t change after publishing, so printed QR codes always work. You can keep editing the card itself at any time.
          </p>
          <div className="row">
            <span className="spacer" />
            <button className="btn" onClick={onClose}>
              Not yet
            </button>
            <button
              className="btn btn-primary"
              disabled={!status?.ok || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onPublish(slug);
                } catch (e) {
                  setStatus({ ok: false, msg: (e as Error).message });
                  setBusy(false);
                }
              }}
            >
              {busy ? "Publishing…" : "Publish now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
