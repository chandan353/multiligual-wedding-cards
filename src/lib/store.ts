import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Card, Rsvp } from "./types";

/**
 * File-backed storage. Each card is one JSON file, RSVPs are one JSON file per
 * card and uploads are plain files. Writes go through a temp file + rename and
 * a per-key queue, so concurrent requests in one process never interleave.
 * Swap this module for a database adapter when you run more than one instance.
 */
const ROOT = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const CARDS = path.join(ROOT, "cards");
const RSVPS = path.join(ROOT, "rsvps");
export const UPLOADS = path.join(ROOT, "uploads");
const SLUGS = path.join(ROOT, "slugs.json");

const queues = new Map<string, Promise<unknown>>();
function serialize<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(key, next.catch(() => undefined));
  return next;
}

async function ensureDirs() {
  await Promise.all([CARDS, RSVPS, UPLOADS].map((d) => fs.mkdir(d, { recursive: true })));
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDirs();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

const safeId = (id: string) => /^[a-zA-Z0-9_-]{1,64}$/.test(id);

export async function getCard(id: string): Promise<Card | null> {
  if (!safeId(id)) return null;
  return readJson<Card | null>(path.join(CARDS, `${id}.json`), null);
}

export async function saveCard(card: Card): Promise<Card> {
  return serialize(`card:${card.id}`, async () => {
    await writeJson(path.join(CARDS, `${card.id}.json`), card);
    return card;
  });
}

/** Read-modify-write a card under its lock. */
export async function updateCard(id: string, fn: (card: Card) => Card | Promise<Card>): Promise<Card | null> {
  return serialize(`card:${id}`, async () => {
    const card = await getCard(id);
    if (!card) return null;
    const next = await fn(card);
    next.updatedAt = new Date().toISOString();
    await writeJson(path.join(CARDS, `${id}.json`), next);
    return next;
  });
}

export async function getSlugIndex(): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(SLUGS, {});
}

export async function getCardBySlug(slug: string): Promise<Card | null> {
  const idx = await getSlugIndex();
  const id = idx[slug.toLowerCase()];
  return id ? getCard(id) : null;
}

/** Claim a slug for a card. Returns false if another card already owns it. */
export async function claimSlug(slug: string, cardId: string): Promise<boolean> {
  return serialize("slugs", async () => {
    const idx = await getSlugIndex();
    const key = slug.toLowerCase();
    if (idx[key] && idx[key] !== cardId) return false;
    idx[key] = cardId;
    await writeJson(SLUGS, idx);
    return true;
  });
}

export async function listRsvps(cardId: string): Promise<Rsvp[]> {
  if (!safeId(cardId)) return [];
  return readJson<Rsvp[]>(path.join(RSVPS, `${cardId}.json`), []);
}

export async function addRsvp(rsvp: Rsvp): Promise<Rsvp> {
  return serialize(`rsvp:${rsvp.cardId}`, async () => {
    const file = path.join(RSVPS, `${rsvp.cardId}.json`);
    const list = await readJson<Rsvp[]>(file, []);
    list.push(rsvp);
    await writeJson(file, list);
    return rsvp;
  });
}

export async function saveUpload(name: string, data: Buffer) {
  await ensureDirs();
  await fs.writeFile(path.join(UPLOADS, name), data);
}

export async function readUpload(name: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOADS, name));
  } catch {
    return null;
  }
}
