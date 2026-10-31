import type { Design } from "./types";

export interface GeneratedCopy {
  headline: string;
  greeting: string;
  story: string;
  blessings: string;
  closing: string;
  hashtag: string;
  guidelines: string[];
  eventDescriptions: { id: string; description: string }[];
  rsvpMessage: string;
}

export interface GeneratedDraft {
  templateId: string;
  design: Design;
  copy: GeneratedCopy;
  rationale: string;
  engine: "claude" | "offline";
}
