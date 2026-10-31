const RESERVED = new Set([
  "api", "editor", "create", "templates", "share", "preview", "admin", "login", "about", "static", "_next", "favicon.ico", "robots.txt", "sitemap.xml",
]);

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function suggestSlug(p1: string, p2: string): string {
  const s = slugify([p1, p2].filter(Boolean).join(" and "));
  return s || "our-wedding";
}

export function validateSlug(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/.test(slug)) return "Use 3 to 48 lowercase letters, numbers or hyphens.";
  if (RESERVED.has(slug)) return "That address is reserved. Please pick another.";
  return null;
}
