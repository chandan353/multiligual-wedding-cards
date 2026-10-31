import "server-only";
import { NextResponse } from "next/server";
import type { Card } from "./types";
import { getCard } from "./store";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Load a card and check the edit token sent by the couple's browser. */
export async function authorizedCard(req: Request, id: string): Promise<Card | NextResponse> {
  const card = await getCard(id);
  if (!card) return error("Card not found", 404);
  const token = req.headers.get("x-edit-token") || "";
  if (!token || token !== card.editToken) return error("This card belongs to a different browser session.", 403);
  return card;
}

export function baseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}
