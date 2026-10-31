import type { Design } from "./types";

export const TEMPLATE_CATEGORIES = [
  "Traditional Indian",
  "Minimalist Western",
  "Floral Romance",
  "Modern Chic",
  "Royal Vintage",
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const COLOR_FAMILIES = ["Gold", "Red", "Pink", "Green", "Blue", "Neutral", "Dark"] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  colors: ColorFamily[];
  description: string;
  design: Design;
}

const base = { warmth: 0, fontScale: 1, spacing: 1 } as const;

export const TEMPLATES: Template[] = [
  {
    id: "marigold-mandap",
    name: "Marigold Mandap",
    category: "Traditional Indian",
    colors: ["Gold", "Red"],
    description: "Saffron and marigold with mandala corners, made for haldi-to-pheras celebrations.",
    design: {
      ...base,
      palette: { primary: "#9e2a2b", accent: "#e09f3e", background: "#fff6e5", surface: "#fffaf0", text: "#3d1f12", muted: "#7a5640" },
      fontPairing: "royal-caps", texture: "paper", border: "mandala", motif: "marigold", layout: "framed",
    },
  },
  {
    id: "kanjeevaram",
    name: "Kanjeevaram Silk",
    category: "Traditional Indian",
    colors: ["Green", "Gold"],
    description: "Temple-silk emerald with zari gold, at home with South Indian ceremonies.",
    design: {
      ...base,
      palette: { primary: "#14532d", accent: "#c9a227", background: "#f7f3e8", surface: "#fffdf6", text: "#1f2a1f", muted: "#5a6b55" },
      fontPairing: "classic-serif", texture: "linen", border: "filigree", motif: "lotus", layout: "framed",
    },
  },
  {
    id: "mehendi-night",
    name: "Mehendi Night",
    category: "Traditional Indian",
    colors: ["Green", "Pink"],
    description: "Henna green and rani pink for a joyful, colourful mehendi and sangeet.",
    design: {
      ...base,
      palette: { primary: "#4d6b2f", accent: "#d63384", background: "#fbf7ee", surface: "#ffffff", text: "#2b2b1f", muted: "#6b6b52" },
      fontPairing: "storybook", texture: "dots", border: "floral", motif: "mandala", layout: "centered",
    },
  },
  {
    id: "white-linen",
    name: "White Linen",
    category: "Minimalist Western",
    colors: ["Neutral"],
    description: "Quiet, airy typography on linen. Lets your words and photo lead.",
    design: {
      ...base,
      palette: { primary: "#1f1f1f", accent: "#a08c6c", background: "#fbfaf7", surface: "#ffffff", text: "#1f1f1f", muted: "#6f6a62" },
      fontPairing: "editorial", texture: "linen", border: "thin", motif: "none", layout: "split",
    },
  },
  {
    id: "coastal-blue",
    name: "Coastal Blue",
    category: "Minimalist Western",
    colors: ["Blue", "Neutral"],
    description: "Slate blue and sand for a seaside or garden ceremony.",
    design: {
      ...base,
      palette: { primary: "#355070", accent: "#c8a97e", background: "#f5f7f9", surface: "#ffffff", text: "#1d2a3a", muted: "#5d6b7a" },
      fontPairing: "modern-sans", texture: "grain", border: "double", motif: "leaves", layout: "centered",
    },
  },
  {
    id: "blush-peony",
    name: "Blush Peony",
    category: "Floral Romance",
    colors: ["Pink"],
    description: "Soft blush watercolour and flowing script for a romantic garden wedding.",
    design: {
      ...base,
      palette: { primary: "#b5485d", accent: "#e8a5a5", background: "#fff5f5", surface: "#ffffff", text: "#3b2228", muted: "#7d5a61" },
      fontPairing: "romantic-script", texture: "watercolor", border: "floral", motif: "florals", layout: "centered",
    },
  },
  {
    id: "sunflower-barn",
    name: "Sunflower Barn",
    category: "Floral Romance",
    colors: ["Gold", "Green"],
    description: "Rustic bohemian warmth: sunflowers, sunset gold and kraft-paper tones.",
    design: {
      ...base,
      palette: { primary: "#7a4a1e", accent: "#e9a23b", background: "#fbf3e4", surface: "#fffaf1", text: "#3a2614", muted: "#7a6048" },
      fontPairing: "storybook", texture: "paper", border: "thin", motif: "sunflower", layout: "split",
    },
  },
  {
    id: "eucalyptus",
    name: "Eucalyptus",
    category: "Floral Romance",
    colors: ["Green", "Neutral"],
    description: "Sage greenery with gentle serif type for an outdoor celebration.",
    design: {
      ...base,
      palette: { primary: "#4a6152", accent: "#9bb59f", background: "#f6f8f4", surface: "#ffffff", text: "#24302a", muted: "#5f6f66" },
      fontPairing: "classic-serif", texture: "watercolor", border: "none", motif: "leaves", layout: "centered",
    },
  },
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    category: "Modern Chic",
    colors: ["Dark", "Gold"],
    description: "Black-tie navy with gold foil accents for an evening reception.",
    design: {
      ...base,
      palette: { primary: "#d4af37", accent: "#d4af37", background: "#0f1626", surface: "#18223a", text: "#f5efe0", muted: "#b8b0a0" },
      fontPairing: "modern-sans", texture: "grain", border: "deco", motif: "deco", layout: "framed",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    category: "Modern Chic",
    colors: ["Red", "Neutral"],
    description: "Burnt clay and cream with bold editorial type.",
    design: {
      ...base,
      palette: { primary: "#b5552f", accent: "#e8c39e", background: "#fbf4ec", surface: "#ffffff", text: "#2e1a12", muted: "#7c5d4f" },
      fontPairing: "editorial", texture: "grain", border: "none", motif: "none", layout: "split",
    },
  },
  {
    id: "maharaja",
    name: "Maharaja",
    category: "Royal Vintage",
    colors: ["Red", "Gold", "Dark"],
    description: "Palace maroon and antique gold filigree, fit for a royal procession.",
    design: {
      ...base,
      palette: { primary: "#e1b866", accent: "#e1b866", background: "#4a0e17", surface: "#5c1520", text: "#fbefd9", muted: "#e6cfa8" },
      fontPairing: "royal-caps", texture: "damask", border: "filigree", motif: "crest", layout: "framed",
    },
  },
  {
    id: "victorian-ivory",
    name: "Victorian Ivory",
    category: "Royal Vintage",
    colors: ["Neutral", "Gold"],
    description: "Ivory, sepia and a monogram crest with old-world elegance.",
    design: {
      ...base,
      palette: { primary: "#5b3a29", accent: "#b08d57", background: "#f8f1e3", surface: "#fffaf0", text: "#2f2118", muted: "#6e5a48" },
      fontPairing: "royal-caps", texture: "damask", border: "double", motif: "crest", layout: "centered",
    },
  },
];

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
