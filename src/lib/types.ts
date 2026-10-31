export type LangCode =
  | "en"
  | "hi"
  | "ta"
  | "te"
  | "gu"
  | "bn"
  | "pa"
  | "mr"
  | "es"
  | "fr"
  | "ar"
  | "zh"
  | "ja";

export type Tone = "formal" | "heartfelt" | "playful";

export interface FamilySide {
  id: string;
  label: string; // e.g. "Bride's family"
  parents: string;
  grandparents: string;
  hometown: string;
}

export interface WeddingEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  dressCode: string;
  description: string;
  venueId: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  landmark: string;
  mapsUrl: string;
}

export interface RsvpSettings {
  enabled: boolean;
  deadline: string; // YYYY-MM-DD
  mealOptions: string[];
  allowGuestCount: boolean;
  maxGuests: number;
  message: string;
}

export interface CardContent {
  partner1: string;
  partner2: string;
  headline: string;
  greeting: string;
  story: string;
  blessings: string;
  closing: string;
  hashtag: string;
  families: FamilySide[];
  events: WeddingEvent[];
  venues: Venue[];
  rsvp: RsvpSettings;
  guidelines: string[];
  notes: string; // open notes / special instructions (private, feeds the AI)
}

export interface Palette {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export type FontPairingId =
  | "classic-serif"
  | "romantic-script"
  | "royal-caps"
  | "modern-sans"
  | "editorial"
  | "storybook";

export type TextureId = "none" | "paper" | "linen" | "dots" | "damask" | "watercolor" | "grain";
export type BorderId = "none" | "thin" | "double" | "floral" | "mandala" | "deco" | "filigree";
export type MotifId = "none" | "mandala" | "marigold" | "florals" | "leaves" | "deco" | "crest" | "sunflower" | "lotus";

export interface Design {
  palette: Palette;
  fontPairing: FontPairingId;
  texture: TextureId;
  border: BorderId;
  motif: MotifId;
  warmth: number; // -50..50
  fontScale: number; // 0.85..1.25
  spacing: number; // 0.8..1.4
  layout: "centered" | "split" | "framed";
}

export interface ImageAsset {
  url: string;
  focalX: number; // 0..100
  focalY: number; // 0..100
  zoom: number; // 1..2.5
  aspect: "16:9" | "4:5" | "1:1" | "3:4";
}

export interface CardMedia {
  hero: ImageAsset | null;
  couple: ImageAsset | null;
  gallery: ImageAsset[];
}

export type LanguageMode = "bilingual" | "toggle";

export interface LanguageSettings {
  primary: LangCode;
  secondary: LangCode | null;
  mode: LanguageMode;
  /** AI translations of the couple's copy: lang -> flat key -> text */
  translations: Partial<Record<LangCode, Record<string, string>>>;
  /** Manual phrase overrides that win over AI translations */
  overrides: Partial<Record<LangCode, Record<string, string>>>;
  translatedAt: Partial<Record<LangCode, string>>;
}

export interface AiMeta {
  tone: Tone;
  variant: number;
  rationale: string;
  generatedAt: string;
  engine: "claude" | "offline";
}

export interface Card {
  id: string;
  editToken: string;
  slug: string | null;
  status: "draft" | "published";
  flow: "template" | "ai";
  templateId: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  content: CardContent;
  design: Design;
  language: LanguageSettings;
  media: CardMedia;
  ai: AiMeta | null;
}

/** The subset of Card a guest sees (no edit token, no private notes). */
export type PublicCard = Omit<Card, "editToken" | "content"> & {
  content: Omit<CardContent, "notes">;
};

export interface Rsvp {
  id: string;
  cardId: string;
  name: string;
  attending: "yes" | "no";
  guestCount: number;
  meal: string;
  events: string[];
  message: string;
  contact: string;
  language: LangCode;
  createdAt: string;
}
