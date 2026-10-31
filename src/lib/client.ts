"use client";
import type { Card } from "./types";

const KEY = "wc.cards.v1";

export interface SavedCardRef {
  id: string;
  token: string;
  title: string;
  slug: string | null;
  updatedAt: string;
}

function read(): Record<string, SavedCardRef> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function rememberCard(card: Card) {
  try {
    const all = read();
    all[card.id] = {
      id: card.id,
      token: card.editToken,
      title: `${card.content.partner1 || "Partner"} & ${card.content.partner2 || "Partner"}`,
      slug: card.slug,
      updatedAt: card.updatedAt,
    };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode) */
  }
}

export function forgetCard(id: string) {
  try {
    const all = read();
    delete all[id];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function savedCards(): SavedCardRef[] {
  return Object.values(read()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function tokenFor(id: string): string {
  if (typeof window !== "undefined") {
    // An edit link (#t=...) lets the couple open their card on another device.
    const m = window.location.hash.match(/t=([A-Za-z0-9_]+)/);
    if (m) return m[1];
  }
  return read()[id]?.token ?? "";
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(opts.token ? { "x-edit-token": opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}
