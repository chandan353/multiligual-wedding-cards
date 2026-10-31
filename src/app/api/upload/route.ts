import { authorizedCard, error, json, safe } from "@/lib/http";
import { saveUpload } from "@/lib/store";
import { uid } from "@/lib/card";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX = 8 * 1024 * 1024;

function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

async function POSTHandler(req: Request) {
  const form = await req.formData().catch(() => null);
  const cardId = String(form?.get("cardId") ?? "");
  const card = await authorizedCard(req, cardId);
  if (card instanceof Response) return card;
  const file = form?.get("file");
  if (!(file instanceof File)) return error("No file received");
  if (file.size > MAX) return error("Images must be under 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) return error("Please upload a JPG, PNG or WebP image.");
  const name = `${card.id}-${uid()}.${TYPES[type]}`;
  try {
    return json({ url: await saveUpload(name, buf, type) }, 201);
  } catch (e) {
    console.error("[upload]", e);
    return error((e as Error).message || "Upload failed", 500);
  }
}

export const POST = safe(POSTHandler);
