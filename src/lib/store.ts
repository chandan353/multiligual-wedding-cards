import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { BlobNotFoundError, get, list, put } from "@vercel/blob";
import type { Card, Rsvp } from "./types";

/**
 * Storage for cards, RSVPs and uploaded photos. One backend at a time:
 *
 * - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (the only service needed on
 *   Vercel, whose functions have no persistent disk).
 * - JSON and image files under DATA_DIR otherwise (local dev, or any server
 *   with a disk). Zero setup.
 */

interface Backend {
  /** fresh: bypass caches (editor and API writes). Guest pages accept up to a minute of staleness. */
  getCard(id: string, fresh: boolean): Promise<Card | null>;
  putCard(card: Card): Promise<void>;
  slugOwner(slug: string): Promise<string | null>;
  /** Atomically claim a slug. Returns false if another card owns it. */
  claimSlug(slug: string, cardId: string): Promise<boolean>;
  listRsvps(cardId: string): Promise<Rsvp[]>;
  addRsvp(rsvp: Rsvp): Promise<void>;
}

// ---------------------------------------------------------------- Vercel Blob

/**
 * Blob stores serve files at public URLs, so private data (cards hold the edit
 * token, RSVPs hold guests' contact details) lives under a path that includes
 * an HMAC of the id keyed by the store's secret token. Nobody can guess the
 * URL, and only the server can list the store.
 */
function secretPath(kind: string, id: string): string {
  const key = process.env.BLOB_READ_WRITE_TOKEN || "";
  return `data/${kind}/${id}-${createHmac("sha256", key).update(`${kind}:${id}`).digest("hex").slice(0, 32)}`;
}

async function blobJson<T>(pathname: string, fresh: boolean): Promise<T | null> {
  const res = await get(pathname, { access: "public", useCache: !fresh }).catch((e) => {
    if (e instanceof BlobNotFoundError) return null;
    throw e;
  });
  if (!res || !res.stream) return null;
  return (await new Response(res.stream).json()) as T;
}

async function putJson(pathname: string, data: unknown, overwrite: boolean) {
  await put(pathname, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: overwrite,
    cacheControlMaxAge: 60,
  });
}

function blobBackend(): Backend {
  return {
    getCard: (id, fresh) => blobJson<Card>(`${secretPath("cards", id)}.json`, fresh),
    putCard: (card) => putJson(`${secretPath("cards", card.id)}.json`, card, true),
    async slugOwner(slug) {
      // A slug never changes owner once claimed, so the cached copy is always right.
      return (await blobJson<{ cardId: string }>(`data/slugs/${slug}.json`, false))?.cardId ?? null;
    },
    async claimSlug(slug, cardId) {
      try {
        await putJson(`data/slugs/${slug}.json`, { cardId }, false); // fails if it already exists
        return true;
      } catch {
        return (await blobJson<{ cardId: string }>(`data/slugs/${slug}.json`, true))?.cardId === cardId;
      }
    },
    async listRsvps(cardId) {
      const prefix = `${secretPath("rsvps", cardId)}/`;
      const paths: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        paths.push(...page.blobs.map((b) => b.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      const out: Rsvp[] = [];
      for (let i = 0; i < paths.length; i += 20) {
        const batch = await Promise.all(paths.slice(i, i + 20).map((p) => blobJson<Rsvp>(p, true)));
        out.push(...batch.filter((r): r is Rsvp => !!r));
      }
      return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    // One blob per RSVP, so simultaneous replies never overwrite each other.
    addRsvp: (rsvp) => putJson(`${secretPath("rsvps", rsvp.cardId)}/${rsvp.id}.json`, rsvp, false),
  };
}

// ---------------------------------------------------------------- Files

const ROOT = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const CARDS = path.join(ROOT, "cards");
const RSVPS = path.join(ROOT, "rsvps");
const UPLOADS = path.join(ROOT, "uploads");
const SLUGS = path.join(ROOT, "slugs.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

function fileBackend(): Backend {
  return {
    getCard: (id) => readJson<Card | null>(path.join(CARDS, `${id}.json`), null),
    putCard: (card) => writeJson(path.join(CARDS, `${card.id}.json`), card),
    async slugOwner(slug) {
      return (await readJson<Record<string, string>>(SLUGS, {}))[slug] ?? null;
    },
    claimSlug: (slug, cardId) =>
      serialize("slugs", async () => {
        const idx = await readJson<Record<string, string>>(SLUGS, {});
        if (idx[slug] && idx[slug] !== cardId) return false;
        idx[slug] = cardId;
        await writeJson(SLUGS, idx);
        return true;
      }),
    listRsvps: (cardId) => readJson<Rsvp[]>(path.join(RSVPS, `${cardId}.json`), []),
    addRsvp: (rsvp) =>
      serialize(`rsvp:${rsvp.cardId}`, async () => {
        const file = path.join(RSVPS, `${rsvp.cardId}.json`);
        const list = await readJson<Rsvp[]>(file, []);
        list.push(rsvp);
        await writeJson(file, list);
      }),
  };
}

// ---------------------------------------------------------------- selection

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const backend: Backend = useBlob ? blobBackend() : fileBackend();

export const storageInfo = { data: useBlob ? "blob" : "files", uploads: useBlob ? "blob" : "files" } as const;

function assertPersistent() {
  if (process.env.VERCEL && storageInfo.data === "files") {
    throw new Error("Storage isn't connected. Add a Blob store in your Vercel project's Storage tab, then redeploy.");
  }
}

/** In-process queue so concurrent requests on one server never interleave a read-modify-write. */
const queues = new Map<string, Promise<unknown>>();
function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(key, next.catch(() => undefined));
  return next;
}

const safeId = (id: string) => /^[a-zA-Z0-9_-]{1,64}$/.test(id);

export async function getCard(id: string, opts: { fresh?: boolean } = {}): Promise<Card | null> {
  if (!safeId(id)) return null;
  return backend.getCard(id, opts.fresh ?? true);
}

export async function saveCard(card: Card): Promise<Card> {
  assertPersistent();
  await serialize(`card:${card.id}`, () => backend.putCard(card));
  return card;
}

/** Read-modify-write a card. Only the couple edits a card, so last write wins across servers. */
export async function updateCard(id: string, fn: (card: Card) => Card | Promise<Card>): Promise<Card | null> {
  assertPersistent();
  return serialize(`card:${id}`, async () => {
    const card = await getCard(id);
    if (!card) return null;
    const next = await fn(card);
    next.updatedAt = new Date().toISOString();
    await backend.putCard(next);
    return next;
  });
}

/** Guest-facing lookup: may serve a copy up to a minute old, which keeps page views cheap. */
export async function getCardBySlug(slug: string, opts: { fresh?: boolean } = {}): Promise<Card | null> {
  if (!/^[a-z0-9-]{1,64}$/i.test(slug)) return null;
  const id = await backend.slugOwner(slug.toLowerCase());
  return id ? getCard(id, { fresh: opts.fresh ?? false }) : null;
}

export async function claimSlug(slug: string, cardId: string): Promise<boolean> {
  assertPersistent();
  return backend.claimSlug(slug.toLowerCase(), cardId);
}

export async function listRsvps(cardId: string): Promise<Rsvp[]> {
  if (!safeId(cardId)) return [];
  return backend.listRsvps(cardId);
}

export async function addRsvp(rsvp: Rsvp): Promise<Rsvp> {
  assertPersistent();
  await backend.addRsvp(rsvp);
  return rsvp;
}

/** Store an uploaded photo and return the URL the page should use. */
export async function saveUpload(name: string, data: Buffer, contentType: string): Promise<string> {
  if (useBlob) {
    const blob = await put(`uploads/${name}`, data, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return blob.url;
  }
  assertPersistent();
  await fs.mkdir(UPLOADS, { recursive: true });
  await fs.writeFile(path.join(UPLOADS, name), data);
  return `/api/uploads/${name}`;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOADS, name));
  } catch {
    return null;
  }
}
