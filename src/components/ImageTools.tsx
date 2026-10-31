"use client";

import { useRef, useState } from "react";
import type { ImageAsset } from "@/lib/types";

export const BACKGROUNDS = [
  { id: "marigold-strings", name: "Marigold strings" },
  { id: "rose-garden", name: "Rose garden" },
  { id: "mandala-gold", name: "Golden mandala" },
  { id: "eucalyptus", name: "Eucalyptus" },
  { id: "deco-night", name: "Deco night" },
  { id: "lotus-pond", name: "Lotus pond" },
];

/** Downscale in the browser so uploads stay small and pages load fast on mobile data. */
async function downscale(file: File, max = 2000): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000 && file.type === "image/jpeg") return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

export async function uploadImage(file: File, cardId: string, token: string): Promise<string> {
  const blob = await downscale(file);
  const fd = new FormData();
  fd.append("cardId", cardId);
  fd.append("file", blob, "photo.jpg");
  const res = await fetch("/api/upload", { method: "POST", body: fd, headers: { "x-edit-token": token } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

const ASPECTS: ImageAsset["aspect"][] = ["16:9", "4:5", "1:1", "3:4"];
const RATIO: Record<ImageAsset["aspect"], string> = { "16:9": "16 / 9", "4:5": "4 / 5", "1:1": "1 / 1", "3:4": "3 / 4" };

/** Drag to set the focal point, slide to zoom, choose an aspect-ratio guide. */
export function Cropper({ value, onChange, lockAspect }: { value: ImageAsset; onChange: (v: ImageAsset) => void; lockAspect?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const update = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100));
    onChange({ ...value, focalX: Math.round(x), focalY: Math.round(y) });
  };
  return (
    <div className="stack">
      <div
        ref={box}
        className="cropper"
        style={{ aspectRatio: RATIO[value.aspect] }}
        onPointerDown={(e) => {
          setDrag(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => drag && update(e)}
        onPointerUp={() => setDrag(false)}
        role="slider"
        aria-label="Focal point: drag to choose what stays in frame"
        aria-valuenow={value.focalX}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.url} alt="" style={{ objectPosition: `${value.focalX}% ${value.focalY}%`, transform: `scale(${value.zoom})`, transformOrigin: `${value.focalX}% ${value.focalY}%` }} />
        <div className="grid-lines" />
        <div className="focal" style={{ left: `${value.focalX}%`, top: `${value.focalY}%` }} />
      </div>
      <div className="range">
        <div className="range-head">
          <span>Zoom</span>
          <span>{value.zoom.toFixed(1)}×</span>
        </div>
        <input type="range" min={1} max={2.5} step={0.05} value={value.zoom} onChange={(e) => onChange({ ...value, zoom: Number(e.target.value) })} />
      </div>
      {!lockAspect && (
        <div className="seg" role="group" aria-label="Aspect ratio">
          {ASPECTS.map((a) => (
            <button key={a} type="button" className={value.aspect === a ? "on" : ""} onClick={() => onChange({ ...value, aspect: a })}>
              {a}
            </button>
          ))}
        </div>
      )}
      <p className="tiny muted" style={{ margin: 0 }}>
        Drag on the photo to choose the part that should always stay visible.
      </p>
    </div>
  );
}
