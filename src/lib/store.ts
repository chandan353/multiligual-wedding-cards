import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import type { Card, Rsvp } from "./types";

/**
 * Storage for cards, RSVPs and uploaded photos.
 *
 * - Data: Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN (or Vercel's
 *   KV_REST_API_URL/TOKEN) are set, otherwise JSON files under DATA_DIR.
 * - Photos: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise files
 *   under DATA_DIR served by /api/uploads.
 *
 * Serverless hosts such as Vercel have no persistent disk, so both cloud
 * backends are required there.
 */

interface Backend {
  getCard(id: string): Promise<Card | null>;
  putCard(card: Card): Promise<void>;
  slugOwner(slug: string): Promise<string | null>;
  /** Atomically claim a slug. Returns false if another card owns it. */
  claimSlug(slug: string, cardId: string): Promise<boolean>;
  listRsvps(cardId: string): Promise<Rsvp[]>;
  addRsvp(rsvp: Rsvp): Promise<void>;
}

// ---------------------------------------------------------------- Redis

function redisFromEnv(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

function redisBackend(redis: Redis): Backend {
  return {
    async getCard(id) {
      return (await redis.get<Card>(`card:${id}`)) ?? null;
    },
    async putCard(card) {
      await redis.set(`card:${card.id}`, card);
    },
    async slugOwner(slug) {
      return (await redis.get<string>(`slug:${slug}`)) ?? null;
    },
    async claimSlug(slug, cardId) {
      const ok = await redis.set(`slug:${slug}`, cardId, { nx: true });
      if (ok) return true;
      return (await redis.get<string>(`slug:${slug}`)) === cardId;
    },
    async listRsvps(cardId) {
      return (await redis.lrange<Rsvp>(`rsvps:${cardId}`, 0, -1)) ?? [];
    },
    async addRsvp(rsvp) {
      await redis.rpush(`rsvps:${rsvp.cardId}`, rsvp);
    },
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

const redis = redisFromEnv();
const backend: Backend = redis ? redisBackend(redis) : fileBackend();

export const storageInfo = {
  data: redis ? "redis" : "files",
  uploads: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "files",
} as const;

function assertPersistent() {
  if (process.env.VERCEL && storageInfo.data === "files") {
    throw new Error("No database is connected. Add Upstash Redis in your Vercel project's Storage tab, then redeploy.");
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

export async function getCard(id: string): Promise<Card | null> {
  if (!safeId(id)) return null;
  return backend.getCard(id);
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

export async function getCardBySlug(slug: string): Promise<Card | null> {
  const id = await backend.slugOwner(slug.toLowerCase());
  return id ? getCard(id) : null;
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
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, data, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("Photo storage isn't connected. Add Vercel Blob in your project's Storage tab, then redeploy.");
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
