/**
 * URL for files served from `/public`.
 * Set `NEXT_PUBLIC_BASE_PATH` when deploying under a subpath (must match `basePath` in `next.config`).
 */
export function publicAssetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const rel = path.replace(/^\//, "");
  if (!base) return `/${rel}`;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${b}/${rel}`;
}
