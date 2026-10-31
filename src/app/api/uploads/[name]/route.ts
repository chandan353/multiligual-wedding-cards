import { readUpload } from "@/lib/store";

type Ctx = { params: Promise<{ name: string }> };
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, { params }: Ctx) {
  const { name } = await params;
  const data = await readUpload(name);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()!.toLowerCase();
  return new Response(new Uint8Array(data), {
    headers: { "content-type": TYPES[ext], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
