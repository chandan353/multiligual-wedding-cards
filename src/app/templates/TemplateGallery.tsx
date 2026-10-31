"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CardView from "@/components/CardView";
import { COLOR_FAMILIES, TEMPLATE_CATEGORIES, TEMPLATES, type Template } from "@/lib/templates";
import { newCard, toPublic } from "@/lib/card";
import { api, browserTimezone, rememberCard } from "@/lib/client";
import type { Card } from "@/lib/types";

const FAMILY_DOT: Record<string, string> = { Gold: "#c9a227", Red: "#9e2a2b", Pink: "#e8a5a5", Green: "#4a6152", Blue: "#355070", Neutral: "#e9e2d6", Dark: "#0f1626" };

export default function TemplateGallery() {
  const router = useRouter();
  const [cat, setCat] = useState<string>("All");
  const [color, setColor] = useState<string>("All");
  const [preview, setPreview] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const samples = useMemo(
    () => Object.fromEntries(TEMPLATES.map((t) => [t.id, toPublic({ ...newCard({ flow: "template", templateId: t.id }), id: `sample-${t.id}` })])),
    [],
  );
  const shown = TEMPLATES.filter((t) => (cat === "All" || t.category === cat) && (color === "All" || t.colors.includes(color as never)));

  async function use(t: Template) {
    setBusy(true);
    setErr("");
    try {
      const { card } = await api<{ card: Card }>("/api/cards", { body: { flow: "template", templateId: t.id, timezone: browserTimezone() } });
      rememberCard(card);
      router.push(`/editor/${card.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div className="filters" role="group" aria-label="Tradition">
        {["All", ...TEMPLATE_CATEGORIES].map((c) => (
          <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)} aria-pressed={cat === c}>
            {c}
          </button>
        ))}
      </div>
      <div className="filters" role="group" aria-label="Colour">
        {["All", ...COLOR_FAMILIES].map((c) => (
          <button key={c} className={`chip ${color === c ? "on" : ""}`} onClick={() => setColor(c)} aria-pressed={color === c}>
            {c !== "All" && <span className="swatch-dot" style={{ background: FAMILY_DOT[c] }} />}
            {c === "All" ? "All colours" : c}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="empty">No templates match those filters yet.</p>}
      <div className="tgrid">
        {shown.map((t) => (
          <div key={t.id} className="tcard" role="button" tabIndex={0} onClick={() => setPreview(t)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPreview(t))} aria-label={`Preview ${t.name}`}>
            <div className="tthumb" aria-hidden inert>
              <div className="tthumb-inner">
                <CardView card={samples[t.id]} compact />
              </div>
            </div>
            <div className="tmeta">
              <strong>{t.name}</strong>
              <span className="muted small">{t.category}</span>
              <span className="swatches">
                {[t.design.palette.primary, t.design.palette.accent, t.design.palette.background].map((c, i) => (
                  <span key={i} className="swatch-dot" style={{ background: c }} />
                ))}
              </span>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={`${preview.name} preview`} onClick={() => setPreview(null)}>
          <div className="panel modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <strong style={{ fontSize: 18 }}>{preview.name}</strong>
                <div className="muted small">{preview.description}</div>
              </div>
              <span className="spacer" />
              {err && <span className="pill pill-warn">{err}</span>}
              <button className="btn" onClick={() => setPreview(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => use(preview)} disabled={busy}>
                {busy ? "Creating…" : "Use This Template"}
              </button>
            </div>
            <div className="modal-body">
              <div className="dual-view">
                <div>
                  <p className="device-label">Desktop</p>
                  <div className="desktop-frame">
                    <CardView card={samples[preview.id]} compact />
                  </div>
                </div>
                <div>
                  <p className="device-label">Mobile</p>
                  <div className="phone-frame">
                    <CardView card={samples[preview.id]} compact />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
