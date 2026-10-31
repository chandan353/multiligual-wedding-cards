import QRCode from "qrcode";

export type QrFrame = "plain" | "classic" | "ornate";

export interface PrintSize {
  id: "2in" | "3in" | "a6";
  label: string;
  widthIn: number;
  heightIn: number;
}

export const PRINT_SIZES: PrintSize[] = [
  { id: "2in", label: "2 × 2 in card insert", widthIn: 2, heightIn: 2 },
  { id: "3in", label: "3 × 3 in card insert", widthIn: 3, heightIn: 3 },
  { id: "a6", label: "A6 (105 × 148 mm)", widthIn: 105 / 25.4, heightIn: 148 / 25.4 },
];

export const CTA_PRESETS = ["Scan for Event Details & RSVP", "Scan to RSVP", "Scan for directions & schedule", "Scan to view our invitation"];

export interface QrOptions {
  url: string;
  dark: string;
  light: string;
  accent: string;
  frame: QrFrame;
  cta: string;
  names: string;
  date: string;
  headingFont: string;
  bodyFont: string;
  size: PrintSize;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  size: number;
  font: string;
  color: string;
  weight: number;
  letterSpacing?: number;
}

interface Layout {
  w: number;
  h: number;
  qr: { x: number; y: number; size: number };
  modules: boolean[][];
  rects: { x: number; y: number; w: number; h: number; r: number; stroke: string; strokeW: number }[];
  dots: { x: number; y: number; r: number; color: string }[];
  texts: TextItem[];
}

/** Layout in "dots" where 1 inch = 300 units, so PNG export is exactly 300 DPI. */
export function layoutQr(o: QrOptions): Layout {
  const DPI = 300;
  const w = Math.round(o.size.widthIn * DPI);
  const h = Math.round(o.size.heightIn * DPI);
  const qr = QRCode.create(o.url, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const modules: boolean[][] = Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => Boolean(qr.modules.get(y, x))));
  const rects: Layout["rects"] = [];
  const dots: Layout["dots"] = [];
  const texts: TextItem[] = [];
  const margin = w * 0.06;

  if (o.frame === "plain") {
    const size = Math.min(w, h) * 0.86;
    return { w, h, qr: { x: (w - size) / 2, y: (h - size) / 2, size }, modules, rects, dots, texts };
  }

  rects.push({ x: margin, y: margin, w: w - margin * 2, h: h - margin * 2, r: w * 0.05, stroke: o.accent, strokeW: Math.max(3, w * 0.008) });
  if (o.frame === "ornate") {
    const m2 = margin + w * 0.025;
    rects.push({ x: m2, y: m2, w: w - m2 * 2, h: h - m2 * 2, r: w * 0.035, stroke: o.accent, strokeW: Math.max(2, w * 0.004) });
    for (const [x, y] of [[margin, margin], [w - margin, margin], [margin, h - margin], [w - margin, h - margin]]) dots.push({ x, y, r: w * 0.018, color: o.accent });
  }

  const portrait = h > w * 1.2;
  const inner = w - margin * 2;
  const ctaSize = Math.max(18, w * (portrait ? 0.05 : 0.058));
  const nameSize = w * (portrait ? 0.09 : 0.075);
  const showNames = o.frame === "ornate" || portrait;
  let top = margin + inner * 0.08;
  if (showNames && o.names) {
    texts.push({ text: o.names, x: w / 2, y: top + nameSize, size: nameSize, font: o.headingFont, color: o.dark, weight: 400 });
    top += nameSize * 1.35;
    if (o.date && portrait) {
      texts.push({ text: o.date, x: w / 2, y: top + ctaSize * 0.9, size: ctaSize * 0.85, font: o.bodyFont, color: o.dark, weight: 400, letterSpacing: 1 });
      top += ctaSize * 1.6;
    }
  }
  const bottomBand = ctaSize * 2.6;
  const avail = h - margin - top - bottomBand;
  const size = Math.min(inner * (portrait ? 0.78 : 0.72), avail);
  const qrY = top + (avail - size) / 2;
  texts.push({ text: o.cta, x: w / 2, y: qrY + size + ctaSize * 1.6, size: ctaSize, font: o.bodyFont, color: o.dark, weight: 600 });
  return { w, h, qr: { x: (w - size) / 2, y: qrY, size }, modules, rects, dots, texts };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Fit long text to the frame by shrinking its size. */
function fit(t: TextItem, maxW: number): number {
  const approx = t.text.length * t.size * 0.52;
  return approx > maxW ? (t.size * maxW) / approx : t.size;
}

export function qrSvg(o: QrOptions): string {
  const L = layoutQr(o);
  const n = L.modules.length;
  const quiet = 2;
  const cell = L.qr.size / (n + quiet * 2);
  let path = "";
  L.modules.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) path += `M${(L.qr.x + (x + quiet) * cell).toFixed(2)} ${(L.qr.y + (y + quiet) * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;
    }),
  );
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${o.size.widthIn.toFixed(3)}in" height="${o.size.heightIn.toFixed(3)}in" viewBox="0 0 ${L.w} ${L.h}">`,
    `<rect width="${L.w}" height="${L.h}" fill="${o.light}"/>`,
    ...L.rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.r}" fill="none" stroke="${r.stroke}" stroke-width="${r.strokeW}"/>`),
    ...L.dots.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="${d.color}"/>`),
    `<path d="${path}" fill="${o.dark}"/>`,
    ...L.texts.map(
      (t) =>
        `<text x="${t.x}" y="${t.y}" text-anchor="middle" font-family="${esc(t.font)}, serif" font-size="${fit(t, L.w * 0.8).toFixed(1)}" font-weight="${t.weight}" fill="${t.color}"${t.letterSpacing ? ` letter-spacing="${t.letterSpacing}"` : ""}>${esc(t.text)}</text>`,
    ),
    `</svg>`,
  ];
  return parts.join("");
}

/** Raster render at exactly 300 DPI using the fonts already loaded on the page. */
export async function qrCanvas(o: QrOptions): Promise<HTMLCanvasElement> {
  const L = layoutQr(o);
  const canvas = document.createElement("canvas");
  canvas.width = L.w;
  canvas.height = L.h;
  const ctx = canvas.getContext("2d")!;
  try {
    await Promise.all([document.fonts.load(`400 40px "${o.headingFont}"`), document.fonts.load(`600 40px "${o.bodyFont}"`)]);
  } catch {}
  ctx.fillStyle = o.light;
  ctx.fillRect(0, 0, L.w, L.h);
  for (const r of L.rects) {
    ctx.strokeStyle = r.stroke;
    ctx.lineWidth = r.strokeW;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, r.r);
    ctx.stroke();
  }
  for (const d of L.dots) {
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const n = L.modules.length;
  const quiet = 2;
  const cell = L.qr.size / (n + quiet * 2);
  ctx.fillStyle = o.dark;
  L.modules.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) ctx.fillRect(Math.floor(L.qr.x + (x + quiet) * cell), Math.floor(L.qr.y + (y + quiet) * cell), Math.ceil(cell), Math.ceil(cell));
    }),
  );
  ctx.textAlign = "center";
  for (const t of L.texts) {
    let size = t.size;
    ctx.font = `${t.weight} ${size}px "${t.font}", serif`;
    const max = L.w * 0.8;
    const m = ctx.measureText(t.text).width;
    if (m > max) size = (size * max) / m;
    ctx.font = `${t.weight} ${size}px "${t.font}", serif`;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  return canvas;
}

export async function qrPng(o: QrOptions): Promise<Blob> {
  const c = await qrCanvas(o);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed"))), "image/png"));
}

export async function qrPdf(o: QrOptions): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const png = await qrPng(o);
  const doc = await PDFDocument.create();
  doc.setTitle(`QR code: ${o.names}`);
  const page = doc.addPage([o.size.widthIn * 72, o.size.heightIn * 72]);
  const img = await doc.embedPng(await png.arrayBuffer());
  page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
