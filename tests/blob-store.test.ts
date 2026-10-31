import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Vercel Blob API, with the same overwrite rules.
const blobs = new Map<string, string>();
class BlobNotFoundError extends Error {}
vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({
  BlobNotFoundError,
  put: vi.fn(async (pathname: string, body: string | Buffer, opts: { allowOverwrite?: boolean }) => {
    if (blobs.has(pathname) && !opts.allowOverwrite) throw new Error("This blob already exists");
    blobs.set(pathname, body.toString());
    return { url: `https://store.public.blob.vercel-storage.com/${pathname}`, pathname };
  }),
  get: vi.fn(async (pathname: string) => {
    if (!blobs.has(pathname)) throw new BlobNotFoundError();
    return { statusCode: 200, stream: new Response(blobs.get(pathname)).body };
  }),
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({
    blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })),
    hasMore: false,
  })),
}));

process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_secret";

describe("Vercel Blob storage", async () => {
  const store = await import("@/lib/store");
  const { newCard } = await import("@/lib/card");
  beforeEach(() => blobs.clear());

  it("uses Blob for everything when the token is set", () => {
    expect(store.storageInfo).toEqual({ data: "blob", uploads: "blob" });
  });

  it("stores cards under unguessable paths and reads them back", async () => {
    const card = newCard({ flow: "template", templateId: "maharaja" });
    await store.saveCard(card);
    const [path] = [...blobs.keys()];
    expect(path).toMatch(new RegExp(`^data/cards/${card.id}-[0-9a-f]{32}\\.json$`));
    expect((await store.getCard(card.id))?.editToken).toBe(card.editToken);
    const updated = await store.updateCard(card.id, (c) => ({ ...c, content: { ...c.content, partner1: "Meera" } }));
    expect(updated?.content.partner1).toBe("Meera");
    expect((await store.getCard(card.id))?.content.partner1).toBe("Meera");
  });

  it("lets only one card claim a slug", async () => {
    expect(await store.claimSlug("aditi-and-rohan", "c_one")).toBe(true);
    expect(await store.claimSlug("aditi-and-rohan", "c_one")).toBe(true);
    expect(await store.claimSlug("aditi-and-rohan", "c_two")).toBe(false);
  });

  it("finds published cards by slug and keeps every RSVP", async () => {
    const card = newCard({ flow: "template", templateId: "maharaja" });
    await store.saveCard(card);
    await store.claimSlug("our-day", card.id);
    expect((await store.getCardBySlug("our-day"))?.id).toBe(card.id);
    await Promise.all(
      ["A", "B", "C"].map((name, i) =>
        store.addRsvp({ id: `r${i}`, cardId: card.id, name, attending: "yes", guestCount: 1, meal: "", events: [], message: "", contact: "", language: "en", createdAt: `2027-01-0${i + 1}` }),
      ),
    );
    expect((await store.listRsvps(card.id)).map((r) => r.name)).toEqual(["A", "B", "C"]);
  });

  it("returns blob URLs for uploaded photos", async () => {
    const url = await store.saveUpload("c_x-abc.jpg", Buffer.from("x"), "image/jpeg");
    expect(url).toBe("https://store.public.blob.vercel-storage.com/uploads/c_x-abc.jpg");
  });
});
