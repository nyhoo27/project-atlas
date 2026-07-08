/**
 * Turns "SLK Trading!" into "slk-trading". Used for workspace slugs,
 * combined with a random suffix to guarantee uniqueness.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}
